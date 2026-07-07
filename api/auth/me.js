const { withAuth } = require('../../lib/middleware/withAuth');
const { getDb } = require('../../lib/db');
const { setCorsHeaders, handleOptions, setSecurityHeaders } = require('../../lib/cors');
const { AppError, sendError } = require('../../lib/errors');

const PLAN_LIMITS = {
  free:     { perDay: 10 },
  pro:      { perDay: 100 },
  business: { perDay: 500 },
};

async function getHandler(req, res) {
  const db = getDb();

  const { data: user, error } = await db.from('users')
    .select('id, email, name, plan, avatar_url, created_at')
    .eq('id', req.user.id)
    .single();

  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);

  const { count: docsThisMonth } = await db.from('documents')
    .count('id', { head: true })
    .eq('user_id', req.user.id)
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const { count: todaysGens } = await db.from('generations')
    .count('id', { head: true })
    .eq('user_id', req.user.id)
    .gte('created_at', today);

  const { rows: tokenSum } = await db.raw(
    'SELECT COALESCE(SUM(tokens_used), 0) as total FROM generations WHERE user_id = $1',
    [req.user.id]
  );
  const totalTokens = parseInt(tokenSum?.[0]?.total || '0', 10);

  const dailyLimit = PLAN_LIMITS[user.plan]?.perDay || 10;
  const creditsRemaining = Math.max(0, dailyLimit - (todaysGens || 0));

  const renewalDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const { rows: storageSum } = await db.raw(
    "SELECT COALESCE(SUM(LENGTH(content)), 0) as total FROM documents WHERE user_id = $1",
    [req.user.id]
  );
  const storageUsed = parseInt(storageSum?.[0]?.total || '0', 10);

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    avatar_url: user.avatar_url,
    stats: {
      credits: creditsRemaining,
      creditsLimit: dailyLimit,
      documentsThisMonth: docsThisMonth || 0,
      aiTokensUsed: totalTokens,
      aiTokensLimit: 100000,
      storageUsed: Math.round(storageUsed / 1024),
      storageLimit: 102400,
      renewalDate,
    },
  });
}

async function putHandler(req, res) {
  const { updateProfileSchema } = require('../../schemas/auth.schema');
  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', result.error.errors[0].message, 400);
  }

  const updates = {};
  if (result.data.name !== undefined) updates.name = result.data.name;
  if (result.data.avatar_url !== undefined) updates.avatar_url = result.data.avatar_url;
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length === 1) {
    return res.json({ id: req.user.id, email: req.user.email, name: req.user.name, plan: req.user.plan, avatar_url: req.user.avatar_url });
  }

  const db = getDb();
  const { data: user, error } = await db.from('users')
    .update(updates)
    .eq('id', req.user.id)
    .select('id, email, name, plan, avatar_url')
    .single();

  if (error) throw error;
  res.json(user);
}

async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  try {
    if (req.method === 'GET') return await getHandler(req, res);
    if (req.method === 'PUT') return await putHandler(req, res);

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa GET o PUT' } });
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = withAuth(handler);
