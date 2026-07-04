const { getDb } = require('../../lib/db');
const { hashRefreshToken } = require('../../lib/jwt');
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
    const cookie = req.headers.cookie;
    if (cookie) {
      const match = cookie.split(';').find(c => c.trim().startsWith('refresh_token='));
      if (match) {
        const token = match.split('=')[1];
        const tokenHash = hashRefreshToken(token);
        const db = getDb();
        await db.from('refresh_tokens').update({ revoked: true }).eq('token_hash', tokenHash);
      }
    }

    res.setHeader('Set-Cookie', 'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0');
    res.json({ success: true });
  } catch (err) {
    sendError(res, err);
  }
};
