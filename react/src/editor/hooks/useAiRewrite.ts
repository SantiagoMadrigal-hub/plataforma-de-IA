import { useState, useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import type { EditorError } from '../types/editor.types';
import { aiRewriteService } from '../services/aiRewriteService';

interface AiRewriteState {
  isRewriting: boolean;
  error: EditorError | null;
}

export function useAiRewrite(editor: Editor | null) {
  const [state, setState] = useState<AiRewriteState>({
    isRewriting: false,
    error: null,
  });

  const rewriteSelection = useCallback(
    async (instruction?: string) => {
      if (!editor) return;

      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, '\n');

      if (!selectedText.trim()) {
        setState({
          isRewriting: false,
          error: {
            code: 'AI_REWRITE_FAILED',
            message: 'Selecciona un texto para mejorar',
          },
        });
        return;
      }

      setState({ isRewriting: true, error: null });

      try {
        const result = await aiRewriteService.rewrite({
          selectedText,
          instruction,
          documentFormat: undefined,
          documentTone: undefined,
        });

        editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertContent(result.rewrittenText)
          .run();

        setState({ isRewriting: false, error: null });
      } catch (err) {
        setState({
          isRewriting: false,
          error: {
            code: 'AI_REWRITE_FAILED',
            message: err instanceof Error ? err.message : 'Error al reescribir con IA',
            cause: err,
          },
        });
      }
    },
    [editor]
  );

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    rewriteSelection,
    clearError,
  };
}
