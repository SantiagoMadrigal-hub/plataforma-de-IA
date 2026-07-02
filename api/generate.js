// api/generate.js
// Función serverless (Vercel). La API key de Groq vive SOLO aquí,
// como variable de entorno del servidor — nunca en el código que
// se sirve al navegador.
//
// Configuración en Vercel:
//   Project Settings → Environment Variables → GROQ_API_KEY = gsk_...
//
// Para desarrollo local con `vercel dev`, crea un archivo .env.local
// (NUNCA lo subas a git — agrégalo a .gitignore) con:
//   GROQ_API_KEY=gsk_...

const FORMAT_LABELS = {
  instagram: 'Post para Instagram',
  blog: 'Artículo de blog',
  youtube: 'Guion de YouTube',
  email: 'Email',
  seo: 'Contenido SEO',
};

const TONE_DESC = {
  profesional: 'profesional y corporativo',
  divertido: 'divertido y cercano',
  formal: 'formal y serio',
  creativo: 'creativo e innovador',
};

const API_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`La solicitud a Groq tardó más de ${API_TIMEOUT_MS / 1000}s y fue cancelada.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const { prompt, tone, format } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'El campo "prompt" es requerido.' });
  }
  if (!format || typeof format !== 'string') {
    return res.status(400).json({ error: 'El campo "format" es requerido.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY no está configurada en las variables de entorno del servidor.');
    return res.status(500).json({ error: 'El servicio de IA no está configurado en el servidor.' });
  }

  try {
    const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Eres un redactor experto. Genera contenido en formato ${FORMAT_LABELS[format] || format} con tono ${TONE_DESC[tone] || tone}. Devuelve solo el contenido, sin explicaciones ni metadatos.`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Groq error (${response.status}):`, errText);
      return res.status(502).json({ error: 'La IA no pudo generar el contenido en este momento.' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return res.status(502).json({ error: 'Respuesta vacía del proveedor de IA.' });
    }

    return res.status(200).json({ content });
  } catch (err) {
    console.error('Error llamando a Groq:', err);
    return res.status(502).json({ error: err.message || 'Error al contactar el servicio de IA.' });
  }
};