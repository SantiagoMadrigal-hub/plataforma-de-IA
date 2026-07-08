import type { ServerResponse } from 'http';
import type { VercelRequest } from '../../lib/types.js';
import { parse } from 'cookie';
import { getDb } from '../../lib/db.js';
import { signAccessToken, generateRefreshToken, hashRefreshToken, getRefreshExpiry } from '../../lib/jwt.js';
import { setCorsHeaders, handleOptions, setSecurityHeaders } from '../../lib/cors.js';
import { AppError, sendError } from '../../lib/errors.js';

export default async function handler(req: VercelRequest, res: ServerResponse) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(req, res);
  setSecurityHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa POST' } }));
    return;
  }

  try {
    const cookies = parse(req.headers.cookie || '');
    const rawToken = cookies.refresh_token;
    if (!rawToken) throw new AppError('NO_REFRESH_TOKEN', 'No se encontró refresh token', 401);

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

    const { data: user } = await db.from('users')
      .select('id, email, name, plan, avatar_url')
      .eq('id', stored.user_id)
      .single();

    if (!user) throw new AppError('USER_NOT_FOUND', 'Usuario no encontrado', 404);

    await db.from('refresh_tokens').update({ revoked: true }).eq('id', stored.id);

    const newRefreshToken = generateRefreshToken();
    const newHash = hashRefreshToken(newRefreshToken);

    await db.from('refresh_tokens').insert({
      user_id: user.id,
      token_hash: newHash,
      user_agent: req.headers['user-agent'] || null,
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      expires_at: getRefreshExpiry().toISOString(),
    });

    const accessToken = signAccessToken(user);

    res.setHeader('Set-Cookie', `refresh_token=${newRefreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${30 * 24 * 60 * 60}`);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan, avatar_url: user.avatar_url },
    }));
  } catch (err) {
    sendError(res, err);
  }
};
