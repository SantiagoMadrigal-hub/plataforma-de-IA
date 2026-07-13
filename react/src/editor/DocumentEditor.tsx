import React, { useCallback, useEffect, useState } from 'react';
import { EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import type { DocumentEditorProps } from './types/editor.types';
import { useDocumentEditor } from './hooks/useDocumentEditor';
import { useDocumentLoader } from './hooks/useDocumentLoader';
import { useAutosave } from './hooks/useAutosave';
import { markdownSerializer } from './services/markdownSerializer';
import { imageUploadService } from './services/imageUploadService';
import { Toolbar } from './components/Toolbar/Toolbar';
import { AiBubbleMenu } from './components/AiBubbleMenu/AiBubbleMenu';
import { SaveStatusIndicator } from './components/SaveStatusIndicator/SaveStatusIndicator';
import { EditorErrorBoundary } from './components/EditorErrorBoundary/EditorErrorBoundary';
import styles from './DocumentEditor.module.css';

interface DocumentEditorComponentProps extends DocumentEditorProps {
  mountElement?: Element | null;
}

export function DocumentEditor({
  mode,
  documentId,
  initialContent,
  onSaved,
  onError,
  mountElement,
}: DocumentEditorComponentProps) {
  const { document: loadedDoc, isLoading, error: loadError } = useDocumentLoader(documentId, mode);
  const [initialContentParsed, setInitialContentParsed] = useState<JSONContent | string | undefined>(
    initialContent
  );

  useEffect(() => {
    if (mode === 'edit' && loadedDoc?.content) {
      const parsed = markdownSerializer.markdownToEditorContent(loadedDoc.content);
      setInitialContentParsed(parsed);
    }
  }, [mode, loadedDoc]);

  useEffect(() => {
    if (mode === 'create' && initialContent) {
      setInitialContentParsed(initialContent);
    }
  }, [mode, initialContent]);

  const editor = useDocumentEditor({
    initialContent: initialContentParsed,
    placeholder: 'Escribe tu contenido aquí...',
  });

  const { status: saveStatus } = useAutosave(editor, {
    documentId: mode === 'edit' ? documentId : undefined,
    mode,
    onSaved: (doc) => {
      onSaved?.(doc);
      if (mountElement) {
        const event = new CustomEvent('document-editor:saved', {
          detail: { documentId: doc.id },
          bubbles: true,
          composed: true,
        });
        mountElement.dispatchEvent(event);
      }
    },
    onError: (err) => {
      onError?.({
        code: 'SAVE_FAILED',
        message: err.message,
        cause: err,
      });
      if (mountElement) {
        const event = new CustomEvent('document-editor:error', {
          detail: { error: { code: 'SAVE_FAILED', message: err.message } },
          bubbles: true,
          composed: true,
        });
        mountElement.dispatchEvent(event);
      }
    },
  });

  // Extract tone and format from loaded document for AI rewrite context
  // Fallback to mountElement dataset (set by document.controller.js) for immediate availability
  const documentTone = loadedDoc?.tone || (mountElement as HTMLElement)?.dataset?.tone || undefined;
  const documentFormat = loadedDoc?.type || (mountElement as HTMLElement)?.dataset?.format || undefined;

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      const result = await imageUploadService.upload(file);
      editor?.chain().focus().setImage({ src: result.url }).run();
    } catch (err) {
      onError?.({
        code: 'IMAGE_UPLOAD_FAILED',
        message: err instanceof Error ? err.message : 'Error al subir la imagen',
        cause: err,
      });
    }
  }, [editor, onError]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Cargando documento...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>Error al cargar el documento</h3>
          <p>{loadError.message}</p>
          <button onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <EditorErrorBoundary
      onError={(err) => {
        onError?.({
          code: 'LOAD_FAILED',
          message: err.message,
          cause: err,
        });
      }}
    >
      <div className={styles.container}>
        <Toolbar editor={editor} onImageUpload={handleImageUpload} />
        <div className={styles.editorWrapper} style={{ position: 'relative' }}>
          <EditorContent editor={editor} className={styles.editorContent} />
          <AiBubbleMenu editor={editor} documentTone={documentTone} documentFormat={documentFormat} />
        </div>
        <SaveStatusIndicator status={saveStatus} />
      </div>
    </EditorErrorBoundary>
  );
}
