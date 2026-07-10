import type { AiRewriteRequest, AiRewriteResponse } from '../types/editor.types';

function getBaseUrl(): string {
  const port = window.location.port;
  if (port === '3000' || port === '5173') {
    return `http://localhost:${port}`;
  }
  return '';
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'access_token') return value;
    }
  } catch {
    return null;
  }

  return null;
}

export const aiRewriteService = {
  async rewrite(request: AiRewriteRequest): Promise<AiRewriteResponse> {
    const token = getAccessToken();

    const userPrompt = `Eres un editor de texto experto. Tu tarea es reescribir el texto seleccionado por el usuario mejorando su calidad, claridad y coherencia.
    
REGLAS ESTRICTAS:
- Devuelve SOLO el texto reescrito, sin explicaciones ni comentarios adicionales.
- Preserva el idioma del texto original.
- Mantén el tono del documento.
- No añadas emojis ni caracteres decorativos.
- No incluyas formato Markdown a menos que el texto original lo tenga.
- El resultado debe ser un fragmento de texto, no un documento completo.

${request.instruction ? `Instrucción adicional: ${request.instruction}\n\n` : ''}Texto a reescribir:
${request.selectedText}`;

    const response = await fetch(`${getBaseUrl()}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({
        prompt: userPrompt,
        tone: request.documentTone || 'profesional',
        format: request.documentFormat || 'blog',
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        throw new Error('Límite diario de generaciones alcanzado');
      }
      throw new Error(error.message || 'Error al reescribir con IA');
    }

    const data = await response.json();
    return { rewrittenText: data.content };
  },
};
