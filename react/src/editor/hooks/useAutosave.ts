import { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import type { SaveStatus, DocumentRecord, EditorMode } from '../types/editor.types';
import { markdownSerializer } from '../services/markdownSerializer';
import { documentEditorService } from '../services/documentEditorService';

interface AutosaveOptions {
  documentId?: string;
  mode: EditorMode;
  debounceMs?: number;
  onSaved?: (doc: DocumentRecord) => void;
  onError?: (error: Error) => void;
}

interface AutosaveState {
  status: SaveStatus;
  documentId: string | null;
}

export function useAutosave(
  editor: Editor | null,
  options: AutosaveOptions
) {
  const { documentId, debounceMs = 2500 } = options;

  const [state, setState] = useState<AutosaveState>({
    status: 'idle',
    documentId: documentId || null,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const currentDocIdRef = useRef<string | null>(documentId || null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const save = useCallback(async (content: string) => {
    if (isSavingRef.current) {
      pendingContentRef.current = content;
      return;
    }

    isSavingRef.current = true;
    setState(prev => ({ ...prev, status: 'saving' }));

    try {
      const markdown = markdownSerializer.editorContentToMarkdown(
        editor?.getJSON() || { type: 'doc', content: [] }
      );

      if (currentDocIdRef.current) {
        const doc = await documentEditorService.updateDocument(
          currentDocIdRef.current,
          { content: markdown }
        );
        setState(prev => ({ ...prev, status: 'saved', documentId: doc.id }));
        optionsRef.current.onSaved?.(doc);
      } else {
        const doc = await documentEditorService.createDocument({
          title: 'Documento sin título',
          content: markdown,
          format: optionsRef.current.mode === 'create' ? 'blog' : undefined,
        });
        currentDocIdRef.current = doc.id;
        setState(prev => ({ ...prev, status: 'saved', documentId: doc.id }));
        optionsRef.current.onSaved?.(doc);
      }

      isSavingRef.current = false;

      if (pendingContentRef.current) {
        const nextContent = pendingContentRef.current;
        pendingContentRef.current = null;
        save(nextContent);
      }
    } catch (err) {
      isSavingRef.current = false;
      setState(prev => ({ ...prev, status: 'error' }));
      optionsRef.current.onError?.(err instanceof Error ? err : new Error('Error al guardar'));
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setState(prev => ({ ...prev, status: 'idle' }));

      timeoutRef.current = setTimeout(() => {
        save(editor.getText());
      }, debounceMs);
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [editor, debounceMs, save]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (editor) {
      save(editor.getText());
    }
  }, [editor, save]);

  return {
    ...state,
    forceSave,
  };
}
