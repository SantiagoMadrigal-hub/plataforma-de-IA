import type { ServerResponse } from 'http';
import type { VercelRequest } from '../../lib/types.js';
import { getDb } from '../../lib/db.js';
import { hash } from '../../lib/password.js';
import { signAccessToken, generateRefreshToken, hashRefreshToken, getRefreshExpiry } from '../../lib/jwt.js';
import { registerSchema } from '../../schemas/auth.schema.js';
import { withValidation } from '../../lib/middleware/withValidation.js';
import { setCorsHeaders, handleOptions, setSecurityHeaders } from '../../lib/cors.js';
import { AppError, sendError } from '../../lib/errors.js';

async function handler(req: VercelRequest & { validated?: { email: string; password: string; name: string } }, res: ServerResponse) {
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
    const { email, password, name } = req.validated!;
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
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      expires_at: getRefreshExpiry().toISOString(),
    });

    res.setHeader('Set-Cookie', `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${30 * 24 * 60 * 60}`);

    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan, avatar_url: user.avatar_url },
      accessToken,
    }));
  } catch (err) {
    sendError(res, err);
  }
}

export default withValidation(registerSchema)(handler);
