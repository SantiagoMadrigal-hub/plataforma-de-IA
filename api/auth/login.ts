import type { ServerResponse } from 'http';
import type { VercelRequest } from '../../lib/types.js';
import { getDb } from '../../lib/db.js';
import { verify } from '../../lib/password.js';
import { signAccessToken, generateRefreshToken, hashRefreshToken, getRefreshExpiry } from '../../lib/jwt.js';
import { loginSchema } from '../../schemas/auth.schema.js';
import { withValidation } from '../../lib/middleware/withValidation.js';
import { setCorsHeaders, handleOptions, setSecurityHeaders } from '../../lib/cors.js';
import { AppError, sendError } from '../../lib/errors.js';

async function handler(req: VercelRequest & { validated?: { email: string; password: string } }, res: ServerResponse) {
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
    const { email, password } = req.validated!;
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
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
      expires_at: getRefreshExpiry().toISOString(),
    });

    res.setHeader('Set-Cookie', `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${30 * 24 * 60 * 60}`);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan, avatar_url: user.avatar_url },
      accessToken,
    }));
  } catch (err) {
    sendError(res, err);
  }
}

export default withValidation(loginSchema)(handler);
