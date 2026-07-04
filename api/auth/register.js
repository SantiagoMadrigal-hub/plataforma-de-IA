const { getDb } = require('../../lib/db');
const { hash } = require('../../lib/password');
const { signAccessToken, generateRefreshToken, hashRefreshToken, getRefreshExpiry } = require('../../lib/jwt');
const { registerSchema } = require('../../schemas/auth.schema');
const { withValidation } = require('../../lib/middleware/withValidation');
const { setCorsHeaders, handleOptions, setSecurityHeaders } = require('../../lib/cors');
const { AppError, sendError } = require('../../lib/errors');

async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa POST' } });
  }

  try {
    const { email, password, name } = req.validated;
    const db = getDb();

    const { data: existing } = await db.from('users').select('id').eq('email', email).maybeSingle();
    if (existing) {
      throw new AppError('EMAIL_EXISTS', 'El correo ya está registrado');
    }

    const passwordHash = await hash(password);
    const { data: user, error } = await db.from('users').insert({
      email,
      password_hash: passwordHash,
      name,
    }).select('id, email, name, plan, avatar_url').single();

    if (error) throw error;

    const accessToken = signAccessToken(user);
    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);

    await db.from('refresh_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      user_agent: req.headers['user-agent'] || null,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || null,
      expires_at: getRefreshExpiry().toISOString(),
    });

    res.setHeader('Set-Cookie', `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${30 * 24 * 60 * 60}`);

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan, avatar_url: user.avatar_url },
      accessToken,
    });
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = withValidation(registerSchema)(handler);
