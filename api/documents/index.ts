import type { ServerResponse } from 'http';
import type { VercelRequest, AuthenticatedRequest } from '../../lib/types.js';
import { withAuth } from '../../lib/middleware/withAuth.js';
import { createDocumentSchema, updateDocumentSchema } from '../../schemas/document.schema.js';
import { getDb } from '../../lib/db.js';
import { setCorsHeaders, handleOptions, setSecurityHeaders } from '../../lib/cors.js';
import { AppError, sendError } from '../../lib/errors.js';

async function handler(req: VercelRequest, res: ServerResponse) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  const authReq = req as AuthenticatedRequest;
  const db = getDb();
  const docId = req.query?.id as string | undefined;

  try {
    if (docId) {
      const { data: doc } = await db.from('documents').select().eq('id', docId).single();
      if (!doc) throw new AppError('NOT_FOUND', 'Documento no encontrado', 404);
      if (doc.user_id !== authReq.user.id) throw new AppError('FORBIDDEN', 'No tienes acceso a este documento', 403);

      if (req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(doc));
        return;
      }

      if (req.method === 'PUT') {
        const result = updateDocumentSchema.safeParse(req.body);
        if (!result.success) throw new AppError('VALIDATION_ERROR', result.error.errors[0].message, 400);
        const { data: updated, error } = await db.from('documents')
          .update({ ...result.data, updated_at: new Date().toISOString() })
          .eq('id', docId).select().single();
        if (error) throw error;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(updated));
        return;
      }

      if (req.method === 'DELETE') {
        const { error } = await db.from('documents').delete().eq('id', docId);
        if (error) throw error;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
        return;
      }

      res.setHeader('Allow', 'GET, PUT, DELETE');
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa GET, PUT o DELETE' } }));
      return;
    }

    if (req.method === 'GET') {
      const page = Math.max(1, parseInt(req.query?.page as string || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit as string || '20')));
      const offset = (page - 1) * limit;

      const { data: items, error, count } = await db.from('documents')
        .select('id, title, format, status, created_at, updated_at', { count: 'exact' })
        .eq('user_id', authReq.user.id)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ items: items || [], page, total: count, limit }));
      return;
    }

    if (req.method === 'POST') {
      const result = createDocumentSchema.safeParse(req.body);
      if (!result.success) throw new AppError('VALIDATION_ERROR', result.error.errors[0].message, 400);
      const { title, content, format, tone, status } = result.data;
      const { data: doc, error } = await db.from('documents').insert({
        user_id: authReq.user.id, title, content, format, tone, status,
      }).select().single();
      if (error) throw error;
      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(doc));
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa GET o POST' } }));
  } catch (err) {
    sendError(res, err);
  }
}

export default withAuth(handler);
