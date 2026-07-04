const { getDb } = require('../../lib/db');
const { signAccessToken, generateRefreshToken, hashRefreshToken, getRefreshExpiry } = require('../../lib/jwt');
const { setCorsHeaders, handleOptions, setSecurityHeaders } = require('../../lib/cors');
const { sendError } = require('../../lib/errors');

module.exports = async (req, res) => {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa POST' } });
  }

  try {
    const { id: googleId, name, email, avatar_url } = req.body;
    if (!email) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email requerido' } });
    }

    const db = getDb();
    const { data: existing } = await db.from('users').select().eq('email', email).maybeSingle();

    let user;
    if (existing) {
      await db.from('users').update({
        name: name || existing.name,
        avatar_url: avatar_url || existing.avatar_url,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
      user = existing;
    } else {
      const { data: newUser, error } = await db.from('users').insert({
        email,
        name: name || email.split('@')[0],
        avatar_url,
        password_hash: 'google_oauth',
      }).select('id, email, name, plan, avatar_url').single();

      if (error) throw error;
      user = newUser;
    }

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
};
