const { withAuth } = require('../../lib/middleware/withAuth');
const { withValidation } = require('../../lib/middleware/withValidation');
const { updateDocumentSchema } = require('../../schemas/document.schema');
const { getDb } = require('../../lib/db');
const { setCorsHeaders, handleOptions, setSecurityHeaders } = require('../../lib/cors');
const { AppError, sendError } = require('../../lib/errors');

async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  const db = getDb();
  const docId = req.query?.id || req.path?.split('/').pop();

  try {
    const { data: doc } = await db.from('documents')
      .select()
      .eq('id', docId)
      .single();

    if (!doc) throw new AppError('NOT_FOUND', 'Documento no encontrado', 404);
    if (doc.user_id !== req.user.id) throw new AppError('FORBIDDEN', 'No tienes acceso a este documento', 403);

    if (req.method === 'GET') {
      return res.json(doc);
    }

    if (req.method === 'PUT') {
      const updates = req.validated;
      const { data: updated, error } = await db.from('documents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', docId)
        .select()
        .single();

      if (error) throw error;
      return res.json(updated);
    }

    if (req.method === 'DELETE') {
      const { error } = await db.from('documents').delete().eq('id', docId);
      if (error) throw error;
      return res.json({ success: true });
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa GET, PUT o DELETE' } });
  } catch (err) {
    sendError(res, err);
  }
}

const withValidationWrapper = (fn) => async (req, res) => {
  if (req.method === 'PUT') {
    const schema = require('../../schemas/document.schema');
    const result = schema.updateDocumentSchema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.errors[0];
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: first.message } });
    }
    req.validated = result.data;
  }
  return fn(req, res);
};

module.exports = withAuth(withValidationWrapper(handler));
