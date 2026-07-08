import type { ServerResponse } from 'http';
import type { VercelRequest } from '../lib/types.js';
import { withAuth } from '../lib/middleware/withAuth.js';
import { withValidation } from '../lib/middleware/withValidation.js';
import { generateSchema } from '../schemas/generate.schema.js';
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
  free: { perDay: 100 },
  pro: { perDay: 500 },
  business: { perDay: 2000 },
};

const API_TIMEOUT_MS = 25_000;

function buildSystemPrompt(format: string, tone: string): string {
  const fmt = FORMAT_LABELS[format] || format;
  const t = TONE_DESC[tone] || tone;
  return `Eres un redactor experto. Genera contenido en formato ${fmt} con tono ${t}.

Reglas estrictas:
- NO uses emojis, emoticonos ni caracteres Unicode decorativos bajo ninguna circunstancia.
- Usa Markdown limpio: "**" para negritas, "##" para subtitulos, "- " para listas con viñetas, "1. " para listas numeradas secuenciales.
- Cada item de una lista debe empezar con "- " o su numero correspondiente.
- El contenido debe ser sustancial, bien estructurado y util para el lector.
- Usa un lenguaje natural y fluido, sin relleno ni cliches.
- Devuelve solo el contenido, sin explicaciones ni metadatos.`;
}

function writeSSE(res: ServerResponse, data: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

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

function shouldFallback(status: number): boolean {
  return status === 429 || status === 402 || status >= 500;
}

async function streamGroq(
  res: ServerResponse,
  prompt: string,
  format: string,
  tone: string,
): Promise<boolean> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const httpRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: buildSystemPrompt(format, tone) },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!httpRes.ok) {
      if (shouldFallback(httpRes.status)) {
        const text = await httpRes.text();
        console.error(`Groq stream error (${httpRes.status}):`, text);
      }
      return false;
    }

    const reader = httpRes.body?.getReader();
    if (!reader) return false;

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          const text = parsed.choices?.[0]?.delta?.content || "";
          if (text) {
            fullContent += text;
            writeSSE(res, { type: "chunk", text });
          }
        } catch {
          // skip malformed JSON
        }
      }
    }

    writeSSE(res, { type: "done", content: fullContent, provider: "groq", model: "llama-3.3-70b-versatile" });
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("Groq stream timeout");
    } else {
      console.error("Groq stream error:", err);
    }
    return false;
  }
}

async function streamGemini(
  res: ServerResponse,
  prompt: string,
  format: string,
  tone: string,
): Promise<boolean> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const httpRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: buildSystemPrompt(format, tone) }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timer);

    if (!httpRes.ok) {
      if (shouldFallback(httpRes.status)) {
        const text = await httpRes.text();
        console.error(`Gemini stream error (${httpRes.status}):`, text);
      }
      return false;
    }

    const reader = httpRes.body?.getReader();
    if (!reader) return false;

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (text) {
            fullContent += text;
            writeSSE(res, { type: "chunk", text });
          }
        } catch {
          // skip malformed JSON
        }
      }
    }

    writeSSE(res, { type: "done", content: fullContent, provider: "gemini", model: "gemini-2.0-flash" });
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("Gemini stream timeout");
    } else {
      console.error("Gemini stream error:", err);
    }
    return false;
  }
}

async function streamOpenAI(
  res: ServerResponse,
  prompt: string,
  format: string,
  tone: string,
): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const httpRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: buildSystemPrompt(format, tone) },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!httpRes.ok) {
      const text = await httpRes.text();
      console.error(`OpenAI stream error (${httpRes.status}):`, text);
      return false;
    }

    const reader = httpRes.body?.getReader();
    if (!reader) return false;

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          const text = parsed.choices?.[0]?.delta?.content || "";
          if (text) {
            fullContent += text;
            writeSSE(res, { type: "chunk", text });
          }
        } catch {
          // skip malformed JSON
        }
      }
    }

    writeSSE(res, { type: "done", content: fullContent, provider: "openai", model: "gpt-4o-mini" });
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("OpenAI stream timeout");
    } else {
      console.error("OpenAI stream error:", err);
    }
    return false;
  }
}

async function handler(
  req: VercelRequest & { validated?: { prompt: string; tone: string; format: string }; user?: { id: string; plan: string } },
  res: ServerResponse,
) {
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
    const { prompt, tone, format } = req.validated!;
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

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    const providers: ((res: ServerResponse, prompt: string, format: string, tone: string) => Promise<boolean>)[] = [
      streamGroq,
      streamGemini,
      streamOpenAI,
    ];

    let success = false;
    for (const streamFn of providers) {
      success = await streamFn(res, prompt, format, tone);
      if (success) break;
    }

    if (!success) {
      writeSSE(res, {
        type: "error",
        message: "Todos los proveedores de IA fallaron. Intenta de nuevo mas tarde.",
      });
    }

    res.end();

    if (success) {
      await db.from('generations').insert({
        user_id: req.user!.id,
        prompt,
        tone,
        format,
        model: "stream",
        tokens_used: 0,
      });
    }
  } catch (err) {
    sendError(res, err);
  }
}

export default withAuth(withValidation(generateSchema)(handler));
