import type { ServerResponse } from 'http';
import type { VercelRequest } from '../lib/types.js';
import { withAuth } from '../lib/middleware/withAuth.js';
import { generateSchema, refineSchema } from '../schemas/generate.schema.js';
import { getDb } from '../lib/db.js';
import { setCorsHeaders, handleOptions, setSecurityHeaders } from '../lib/cors.js';
import { sendError } from '../lib/errors.js';

const FORMAT_LABELS: Record<string, string> = {
  instagram: "Post para Instagram",
  blog: "Artículo de blog",
  youtube: "Guion de YouTube",
  email: "Email",
  seo: "Contenido SEO",
};

const TONE_DESC: Record<string, string> = {
  profesional: "profesional y corporativo",
  divertido: "divertido y cercano",
  formal: "formal y serio",
  creativo: "creativo e innovador",
};

const PLAN_LIMITS: Record<string, { perDay: number }> = {
  free: { perDay: 10 },
  pro: { perDay: 100 },
  business: { perDay: 500 },
};

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

async function groqChat(messages: { role: string; content: string }[]) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new GroqNotConfiguredError();

  const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, temperature: 0.7, max_tokens: 2000 }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Groq error (${response.status}):`, errText);
    throw new GroqApiError();
  }

  interface GroqResponse { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number } }
  const data = await response.json() as GroqResponse;
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) throw new EmptyResponseError();

  return { content, tokensUsed: data.usage?.total_tokens || 0 };
}

class GroqNotConfiguredError extends Error { code = "GROQ_NOT_CONFIGURED"; message = "El servicio de IA no está configurado en el servidor." }
class GroqApiError extends Error { code = "GROQ_ERROR"; message = "La IA no pudo procesar la solicitud en este momento." }
class EmptyResponseError extends Error { code = "EMPTY_RESPONSE"; message = "Respuesta vacía del proveedor de IA." }

async function checkDailyLimit(db: ReturnType<typeof getDb>, userId: string, plan: string) {
  const limit = PLAN_LIMITS[plan]?.perDay || PLAN_LIMITS.free.perDay;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await db.from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today.toISOString());

  return { used: count || 0, limit, remaining: limit - (count || 0) };
}

async function handler(req: VercelRequest & { user?: { id: string; plan: string } }, res: ServerResponse) {
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

  let body: Record<string, unknown>;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : ((req.body as Record<string, unknown>) || {});
  } catch { body = {}; }

  const isRefine = 'content' in body && 'instruction' in body;

  try {
    if (isRefine) {
      const { content, instruction, tone, format } = refineSchema.parse(body);
      const { content: refined } = await groqChat([
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
        { role: "user", content: `Contenido actual:\n\n${content}\n\n---\n\nInstrucción del usuario:\n${instruction}` },
      ]);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ content: refined }));
      return;
    }

    const { prompt, tone, format } = generateSchema.parse(body);
    const db = getDb();

    const { remaining, limit } = await checkDailyLimit(db, req.user!.id, req.user!.plan);

    if (remaining <= 0) {
      res.statusCode = 429;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: { code: "RATE_LIMIT_EXCEEDED", message: `Alcanzaste tu límite diario del plan ${req.user!.plan} (${limit} generaciones)` },
      }));
      return;
    }

    const { content, tokensUsed } = await groqChat([
      {
        role: "system",
        content: `Eres un redactor experto. Genera contenido en formato ${FORMAT_LABELS[format] || format} con tono ${TONE_DESC[tone] || tone}.

Reglas de formato (Markdown obligatorio, sin excepción):
- Toda lista con viñetas debe usar "- " al inicio de cada línea.
- Toda lista numerada debe usar "1. ", "2. ", "3. ", etc., de forma secuencial (nunca repitas "1." en cada ítem).
- Usa "**texto**" para resaltar términos o frases clave.
- Usa "## " para subtítulos de sección si el formato lo amerita.
- No escribas listas como líneas sueltas sin marcador: cada ítem de una lista SIEMPRE debe empezar con "- " o con su número.

Devuelve solo el contenido, sin explicaciones ni metadatos.`,
      },
      { role: "user", content: prompt },
    ]);

    await db.from('generations').insert({
      user_id: req.user!.id,
      prompt, tone, format,
      model: "llama-3.3-70b-versatile",
      tokens_used: tokensUsed,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ content, tokensUsed, remainingToday: remaining - 1 }));
  } catch (err) {
    if (err instanceof GroqNotConfiguredError || err instanceof GroqApiError || err instanceof EmptyResponseError) {
      res.statusCode = err instanceof GroqNotConfiguredError ? 500 : 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: err.code, message: err.message } }));
      return;
    }
    sendError(res, err);
  }
}

export default withAuth(handler);
