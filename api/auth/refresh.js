const { getDb } = require('../../lib/db');
const { signAccessToken, generateRefreshToken, hashRefreshToken, getRefreshExpiry } = require('../../lib/jwt');
const { setCorsHeaders, handleOptions, setSecurityHeaders } = require('../../lib/cors');
const { AppError, sendError } = require('../../lib/errors');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa POST' } });
  }

  try {
    const cookie = req.headers.cookie;
    if (!cookie) throw new AppError('NO_REFRESH_TOKEN', 'No se encontró refresh token', 401);

    const match = cookie.split(';').find(c => c.trim().startsWith('refresh_token='));
    if (!match) throw new AppError('NO_REFRESH_TOKEN', 'No se encontró refresh token', 401);

    const rawToken = match.split('=')[1];
    const tokenHash = hashRefreshToken(rawToken);
    const db = getDb();

    const { data: stored } = await db.from('refresh_tokens')
      .select('id, user_id, revoked, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (!stored || stored.revoked) {
      throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token inválido o revocado', 401);
    }

    if (new Date(stored.expires_at) < new Date()) {
      throw new AppError('REFRESH_EXPIRED', 'Refresh token expirado', 401);
    }

    const db2 = getDb();
    const { data: user } = await db2.from('users')
      .select('id, email, name, plan, avatar_url')
      .eq('id', stored.user_id)
      .single();

    await db.from('refresh_tokens').update({ revoked: true }).eq('id', stored.id);

    const newRefreshToken = generateRefreshToken();
    const newHash = hashRefreshToken(newRefreshToken);

    await db.from('refresh_tokens').insert({
      user_id: user.id,
      token_hash: newHash,
      user_agent: req.headers['user-agent'] || null,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || null,
      expires_at: getRefreshExpiry().toISOString(),
    });

    const accessToken = signAccessToken(user);

    res.setHeader('Set-Cookie', `refresh_token=${newRefreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${30 * 24 * 60 * 60}`);

    res.json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan, avatar_url: user.avatar_url },
    });
  } catch (err) {
    sendError(res, err);
  }
};
