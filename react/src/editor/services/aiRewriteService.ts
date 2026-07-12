import type { AiRewriteRequest, AiRewriteResponse } from '../types/editor.types';

declare global {
  interface Window {
    ContentFlowApp?: {
      services?: {
        ai?: {
          rewriteText: (
            selectedText: string,
            instruction?: string,
            tone?: string,
            format?: string,
          ) => Promise<string>;
        };
      };
    };
  }
}

export const aiRewriteService = {
  async rewrite(request: AiRewriteRequest): Promise<AiRewriteResponse> {
    const ai = window.ContentFlowApp?.services?.ai;

    if (!ai?.rewriteText) {
      throw new Error('Servicio de IA no disponible');
    }

    const rewrittenText = await ai.rewriteText(
      request.selectedText,
      request.instruction,
      request.documentTone,
      request.documentFormat,
    );

    return { rewrittenText };
  },
};
