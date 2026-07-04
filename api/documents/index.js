const { withAuth } = require('../../lib/middleware/withAuth');
const { createDocumentSchema } = require('../../schemas/document.schema');
const { getDb } = require('../../lib/db');
const { setCorsHeaders, handleOptions, setSecurityHeaders } = require('../../lib/cors');
const { AppError, sendError } = require('../../lib/errors');

async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  const db = getDb();

  try {
    if (req.method === 'GET') {
      const page = Math.max(1, parseInt(req.query?.page || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit || '20')));
      const offset = (page - 1) * limit;

      const { data: items, error, count } = await db.from('documents')
        .select('id, title, format, status, created_at, updated_at', { count: 'exact' })
        .eq('user_id', req.user.id)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return res.json({ items: items || [], page, total: count, limit });
    }

    if (req.method === 'POST') {
      const result = createDocumentSchema.safeParse(req.body);
      if (!result.success) {
        throw new AppError('VALIDATION_ERROR', result.error.errors[0].message, 400);
      }
      const { title, content, format, tone, status } = result.data;
      const { data: doc, error } = await db.from('documents').insert({
        user_id: req.user.id,
        title,
        content,
        format,
        tone,
        status,
      }).select().single();

      if (error) throw error;
      return res.status(201).json(doc);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa GET o POST' } });
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = withAuth(handler);
