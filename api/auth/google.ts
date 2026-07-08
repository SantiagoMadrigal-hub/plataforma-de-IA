import type { ServerResponse } from 'http';
import type { VercelRequest } from '../../lib/types.js';
import { z } from 'zod';
import { getDb } from '../../lib/db.js';
import { signAccessToken, generateRefreshToken, hashRefreshToken, getRefreshExpiry } from '../../lib/jwt.js';
import { withValidation } from '../../lib/middleware/withValidation.js';
import { setCorsHeaders, handleOptions, setSecurityHeaders } from '../../lib/cors.js';
import { sendError } from '../../lib/errors.js';

const googleSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email('Email requerido'),
  avatar_url: z.string().optional(),
});

async function handler(req: VercelRequest & { validated?: z.infer<typeof googleSchema> }, res: ServerResponse) {
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
    const { name, email, avatar_url } = req.validated!;
    const db = getDb();
    const { data: existing } = await db.from('users').select().eq('email', email).maybeSingle();

    let user: { id: string; email: string; name: string; plan: string; avatar_url: string | null };
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

export default withValidation(googleSchema)(handler);
