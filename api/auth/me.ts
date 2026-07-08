import type { ServerResponse } from 'http';
import type { VercelRequest, AuthenticatedRequest } from '../../lib/types.js';
import { withAuth } from '../../lib/middleware/withAuth.js';
import { getDb } from '../../lib/db.js';
import { setCorsHeaders, handleOptions, setSecurityHeaders } from '../../lib/cors.js';
import { AppError, sendError } from '../../lib/errors.js';
import { updateProfileSchema } from '../../schemas/auth.schema.js';

const PLAN_LIMITS: Record<string, { perDay: number }> = {
  free:     { perDay: 10 },
  pro:      { perDay: 100 },
  business: { perDay: 500 },
};

async function getHandler(authReq: AuthenticatedRequest, res: ServerResponse) {
  const db = getDb();

  const { data: user, error } = await db.from('users')
    .select('id, email, name, plan, avatar_url, created_at, password_hash, preferences')
    .eq('id', authReq.user.id)
    .single();

  if (error) throw error;

  const authProvider = user.password_hash === 'google_oauth' ? 'google' : 'email';
  delete user.password_hash;

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { count: docsThisMonth } = await db.from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', authReq.user.id)
    .gte('created_at', monthStart);

  const { count: todaysGens } = await db.from('generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', authReq.user.id)
    .gte('created_at', today);

  const { data: gens, error: gensErr } = await db.from('generations')
    .select('tokens_used')
    .eq('user_id', authReq.user.id);
  if (gensErr) throw gensErr;
  const totalTokens = (gens || []).reduce((s: number, g: { tokens_used?: number }) => s + (g.tokens_used || 0), 0);

  const { data: docs, error: docsErr } = await db.from('documents')
    .select('content')
    .eq('user_id', authReq.user.id);
  if (docsErr) throw docsErr;
  const storageBytes = (docs || []).reduce((s: number, d: { content?: string }) => s + ((d.content || '').length || 0), 0);

  const dailyLimit = PLAN_LIMITS[user.plan]?.perDay || 10;
  const creditsRemaining = Math.max(0, dailyLimit - (todaysGens || 0));

  const renewalDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    avatar_url: user.avatar_url,
    authProvider,
    preferences: user.preferences || {},
    stats: {
      credits: creditsRemaining,
      creditsLimit: dailyLimit,
      documentsThisMonth: docsThisMonth || 0,
      documentsLimit: dailyLimit,
      aiTokensUsed: totalTokens,
      aiTokensLimit: 100000,
      storageUsed: Math.round(storageBytes / 1024),
      storageLimit: 102400,
      renewalDate,
    },
  }));
}

async function putHandler(authReq: AuthenticatedRequest, res: ServerResponse) {
  const result = updateProfileSchema.safeParse(authReq.body);
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', result.error.errors[0].message, 400);
  }

  const db = getDb();

  const updates: Record<string, unknown> = {};
  if (result.data.name !== undefined) updates.name = result.data.name;
  if (result.data.avatar_url !== undefined) updates.avatar_url = result.data.avatar_url;

  if (result.data.preferences !== undefined) {
    const { data: existing } = await db.from('users')
      .select('preferences')
      .eq('id', authReq.user.id)
      .single();
    updates.preferences = { ...(existing?.preferences || {}), ...result.data.preferences };
  }

  if (Object.keys(updates).length === 0) {
    const { data: user } = await db.from('users')
      .select('id, email, name, plan, avatar_url, preferences')
      .eq('id', authReq.user.id)
      .single();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(user));
    return;
  }

  updates.updated_at = new Date().toISOString();

  const { data: user, error } = await db.from('users')
    .update(updates)
    .eq('id', authReq.user.id)
    .select('id, email, name, plan, avatar_url, preferences')
    .single();

  if (error) throw error;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(user));
}

async function handler(req: VercelRequest, res: ServerResponse) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  const authReq = req as AuthenticatedRequest;

  try {
    if (req.method === 'GET') return await getHandler(authReq, res);
    if (req.method === 'PUT') return await putHandler(authReq, res);

    res.setHeader('Allow', 'GET, PUT');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa GET o PUT' } }));
  } catch (err) {
    sendError(res, err);
  }
}

export default withAuth(handler);
