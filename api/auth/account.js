const { withAuth } = require('../../lib/middleware/withAuth');
const { getDb } = require('../../lib/db');
const { setCorsHeaders, handleOptions, setSecurityHeaders } = require('../../lib/cors');
const { AppError, sendError } = require('../../lib/errors');
const { verify } = require('../../lib/password');

async function deleteHandler(req, res) {
  const db = getDb();

  const { data: user } = await db.from('users')
    .select('password_hash')
    .eq('id', req.user.id)
    .single();

  if (!user) throw new AppError('NOT_FOUND', 'Usuario no encontrado', 404);

  if (user.password_hash !== 'google_oauth') {
    const { password } = req.body || {};
    if (!password) throw new AppError('VALIDATION_ERROR', 'Contraseña requerida para eliminar la cuenta', 400);
    const valid = await verify(password, user.password_hash);
    if (!valid) throw new AppError('INVALID_PASSWORD', 'Contraseña incorrecta', 401);
  }

  try {
    await db.auth.admin.deleteUser(req.user.id);
  } catch (_) {
    // auth.users might not exist or admin access may not be available — continue
  }

  const { error } = await db.from('users').delete().eq('id', req.user.id);
  if (error) throw error;

  res.setHeader('Set-Cookie', 'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0');

  res.json({ success: true });
}

async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  try {
    if (req.method === 'DELETE') return await deleteHandler(req, res);
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa DELETE' } });
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = withAuth(handler);
