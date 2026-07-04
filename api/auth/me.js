const { withAuth } = require('../../lib/middleware/withAuth');
const { getDb } = require('../../lib/db');
const { setCorsHeaders, handleOptions, setSecurityHeaders } = require('../../lib/cors');
const { sendError } = require('../../lib/errors');

async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa GET' } });
  }

  try {
    const db = getDb();
    const { data: user, error } = await db.from('users')
      .select('id, email, name, plan, avatar_url')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json(user);
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = withAuth(handler);
