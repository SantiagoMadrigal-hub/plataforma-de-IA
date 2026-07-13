import { useState, useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import type { EditorError } from '../types/editor.types';
import { aiRewriteService } from '../services/aiRewriteService';

interface AiRewriteState {
  isRewriting: boolean;
  error: EditorError | null;
}

interface UseAiRewriteOptions {
  editor: Editor | null;
  documentTone?: string;
  documentFormat?: string;
}

export function useAiRewrite({ editor, documentTone, documentFormat }: UseAiRewriteOptions) {
  const [state, setState] = useState<AiRewriteState>({
    isRewriting: false,
    error: null,
  });

  const rewriteSelection = useCallback(
    async (instruction?: string): Promise<boolean> => {
      console.log('[useAiRewrite] rewriteSelection called', { instruction, hasEditor: !!editor });
      if (!editor) {
        console.log('[useAiRewrite] no editor');
        return false;
      }

      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, '\n');
      console.log('[useAiRewrite] selection', { from, to, selectedText: selectedText.substring(0, 50) });

      if (!selectedText.trim()) {
        console.log('[useAiRewrite] empty selection');
        setState({
          isRewriting: false,
          error: {
            code: 'AI_REWRITE_FAILED',
            message: 'Selecciona un texto para mejorar',
          },
        });
        return false;
      }

      setState({ isRewriting: true, error: null });

      try {
        console.log('[useAiRewrite] calling aiRewriteService...');
        const result = await aiRewriteService.rewrite({
          selectedText,
          instruction,
          documentFormat,
          documentTone,
        });
        console.log('[useAiRewrite] got result', { rewrittenText: result.rewrittenText?.substring(0, 50) });

        editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertContent(result.rewrittenText)
          .run();
        console.log('[useAiRewrite] editor chain executed');

        setState({ isRewriting: false, error: null });
        return true;
      } catch (err) {
        console.error('[useAiRewrite] error', err);
        setState({
          isRewriting: false,
          error: {
            code: 'AI_REWRITE_FAILED',
            message: err instanceof Error ? err.message : 'Error al reescribir con IA',
            cause: err,
          },
        });
        return false;
      }
    },
    [editor, documentTone, documentFormat]
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