import type { ServerResponse } from 'http';
import type { VercelRequest } from '../lib/types.js';
import { withAuth } from '../lib/middleware/withAuth.js';
import { withValidation } from '../lib/middleware/withValidation.js';
import { chatSchema } from '../schemas/chat.schema.js';
import { setCorsHeaders, handleOptions, setSecurityHeaders } from '../lib/cors.js';
import { sendError } from '../lib/errors.js';

const API_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`La solicitud a Groq tardó más de ${API_TIMEOUT_MS / 1000}s y fue cancelada.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function handler(req: VercelRequest & { validated?: { content: string; instruction: string; originalPrompt?: string; tone?: string; format?: string }; user?: { id: string; plan: string } }, res: ServerResponse) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Usa POST." } }));
    return;
  }

  try {
    const { content, instruction, tone, format } = req.validated!;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: "GROQ_NOT_CONFIGURED", message: "El servicio de IA no está configurado en el servidor." } }));
      return;
    }

    const groqResponse = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Eres un asistente experto en redacción que refina contenido existente según las instrucciones del usuario.

Contexto:
- El contenido original fue creado en formato ${format || "blog"} con tono ${tone || "profesional"}.
- Mantén el mismo formato y tono a menos que el usuario pida cambiarlos explícitamente.
- Conserva la estructura general y los puntos clave del contenido original.
- Si el usuario pide acortar/extender, hazlo inteligentemente sin perder información importante.

Reglas de formato (Markdown obligatorio):
- Usa "# " para el título principal, "## " para subtítulos.
- Listas con viñetas: "- " al inicio de cada línea.
- Listas numeradas: "1. ", "2. ", "3. " de forma secuencial.
- Usa "**texto**" para negritas, "*texto*" para cursivas.
- Usa "---" para separadores horizontales.

Devuelve SOLO el contenido refinado, sin explicaciones ni metadatos.`,
          },
          {
            role: "user",
            content: `Contenido actual:\n\n${content}\n\n---\n\nInstrucción del usuario:\n${instruction}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error(`Groq error (${groqResponse.status}):`, errText);
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: "GROQ_ERROR", message: "La IA no pudo refinar el contenido en este momento." } }));
      return;
    }

    interface GroqResponse {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    }

    const data = await groqResponse.json() as GroqResponse;
    const refined = data.choices?.[0]?.message?.content?.trim();

    if (!refined) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: "EMPTY_RESPONSE", message: "Respuesta vacía del proveedor de IA." } }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ content: refined }));
  } catch (err) {
    sendError(res, err);
  }
}

export default withAuth(withValidation(chatSchema)(handler));
