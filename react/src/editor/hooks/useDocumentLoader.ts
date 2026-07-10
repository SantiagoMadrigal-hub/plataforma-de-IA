import { useState, useEffect } from 'react';
import type { DocumentRecord, EditorMode, EditorError } from '../types/editor.types';
import { documentEditorService } from '../services/documentEditorService';

interface DocumentLoaderState {
  document: DocumentRecord | null;
  isLoading: boolean;
  error: EditorError | null;
}

export function useDocumentLoader(documentId: string | undefined, mode: EditorMode) {
  const [state, setState] = useState<DocumentLoaderState>({
    document: null,
    isLoading: mode === 'edit',
    error: null,
  });

  useEffect(() => {
    if (mode !== 'edit' || !documentId) {
      setState({ document: null, isLoading: false, error: null });
      return;
    }

    let cancelled = false;

    async function loadDocument() {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const doc = await documentEditorService.getDocumentById(documentId);
        if (!cancelled) {
          setState({ document: doc, isLoading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            document: null,
            isLoading: false,
            error: {
              code: 'LOAD_FAILED',
              message: err instanceof Error ? err.message : 'Error al cargar el documento',
              cause: err,
            },
          });
        }
      }
    }

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [documentId, mode]);

  return state;
}
