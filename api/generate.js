const { withAuth } = require('../lib/middleware/withAuth');
const { withValidation } = require('../lib/middleware/withValidation');
const { generateSchema } = require('../schemas/generate.schema');
const { getDb } = require('../lib/db');
const { setCorsHeaders, handleOptions, setSecurityHeaders } = require('../lib/cors');
const { sendError } = require('../lib/errors');

const FORMAT_LABELS = {
  instagram: "Post para Instagram",
  blog: "Artículo de blog",
  youtube: "Guion de YouTube",
  email: "Email",
  seo: "Contenido SEO",
};

const TONE_DESC = {
  profesional: "profesional y corporativo",
  divertido: "divertido y cercano",
  formal: "formal y serio",
  creativo: "creativo e innovador",
};

const PLAN_LIMITS = {
  free: { perDay: 10 },
  pro: { perDay: 100 },
  business: { perDay: 500 },
};

const API_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`La solicitud a Groq tardó más de ${API_TIMEOUT_MS / 1000}s y fue cancelada.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function checkDailyLimit(db, userId, plan) {
  const limit = PLAN_LIMITS[plan]?.perDay || PLAN_LIMITS.free.perDay;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await db.from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today.toISOString());

  return { used: count || 0, limit, remaining: limit - (count || 0) };
}

async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Usa POST." } });
  }

  try {
    const { prompt, tone, format } = req.validated;
    const db = getDb();

    const { remaining, limit } = await checkDailyLimit(db, req.user.id, req.user.plan);

    if (remaining <= 0) {
      return res.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Alcanzaste tu límite diario del plan ${req.user.plan} (${limit} generaciones)`,
        },
      });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: { code: "GROQ_NOT_CONFIGURED", message: "El servicio de IA no está configurado en el servidor." } });
    }

    const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
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
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Groq error (${response.status}):`, errText);
      return res.status(502).json({ error: { code: "GROQ_ERROR", message: "La IA no pudo generar el contenido en este momento." } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    const tokensUsed = data.usage?.total_tokens || 0;

    if (!content) {
      return res.status(502).json({ error: { code: "EMPTY_RESPONSE", message: "Respuesta vacía del proveedor de IA." } });
    }

    await db.from('generations').insert({
      user_id: req.user.id,
      prompt,
      tone,
      format,
      model: "llama-3.3-70b-versatile",
      tokens_used: tokensUsed,
    });

    return res.status(200).json({ content, tokensUsed, remainingToday: remaining - 1 });
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = withAuth(withValidation(generateSchema)(handler));
