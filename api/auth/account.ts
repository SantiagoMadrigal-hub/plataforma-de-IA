import type { ServerResponse } from 'http';
import type { VercelRequest, AuthenticatedRequest } from '../../lib/types.js';
import { withAuth } from '../../lib/middleware/withAuth.js';
import { getDb } from '../../lib/db.js';
import { setCorsHeaders, handleOptions, setSecurityHeaders } from '../../lib/cors.js';
import { AppError, sendError } from '../../lib/errors.js';
import { verify } from '../../lib/password.js';

async function deleteHandler(authReq: AuthenticatedRequest, res: ServerResponse) {
  const db = getDb();

  const { data: user } = await db.from('users')
    .select('password_hash')
    .eq('id', authReq.user.id)
    .single();

  if (!user) throw new AppError('NOT_FOUND', 'Usuario no encontrado', 404);

  if (user.password_hash !== 'google_oauth') {
    const body = authReq.body as { password?: string } | undefined;
    const password = body?.password;
    if (!password) throw new AppError('VALIDATION_ERROR', 'Contraseña requerida para eliminar la cuenta', 400);
    const valid = await verify(password, user.password_hash);
    if (!valid) throw new AppError('INVALID_PASSWORD', 'Contraseña incorrecta', 401);
  }

  try {
    await db.auth.admin.deleteUser(authReq.user.id);
  } catch (_) {
    // auth.users might not exist — continue
  }

  const { error } = await db.from('users').delete().eq('id', authReq.user.id);
  if (error) throw error;

  res.setHeader('Set-Cookie', 'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0');

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ success: true }));
}

async function handler(req: VercelRequest, res: ServerResponse) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  const authReq = req as AuthenticatedRequest;

  try {
    if (req.method === 'DELETE') return await deleteHandler(authReq, res);
    res.setHeader('Allow', 'DELETE');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa DELETE' } }));
  } catch (err) {
    sendError(res, err);
  }
}

export default withAuth(handler);
