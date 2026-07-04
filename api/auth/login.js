const { getDb } = require('../../lib/db');
const { verify } = require('../../lib/password');
const { signAccessToken, generateRefreshToken, hashRefreshToken, getRefreshExpiry } = require('../../lib/jwt');
const { loginSchema } = require('../../schemas/auth.schema');
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
    const { email, password } = req.validated;
    const db = getDb();

    const { data: user, error } = await db.from('users')
      .select('id, email, name, password_hash, plan, avatar_url')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    if (!user) throw new AppError('INVALID_CREDENTIALS', 'Email o contraseña incorrectos', 401);

    const valid = await verify(password, user.password_hash);
    if (!valid) throw new AppError('INVALID_CREDENTIALS', 'Email o contraseña incorrectos', 401);

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

    res.json({
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan, avatar_url: user.avatar_url },
      accessToken,
    });
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = withValidation(loginSchema)(handler);
