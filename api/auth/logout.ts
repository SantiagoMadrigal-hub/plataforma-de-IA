import type { ServerResponse } from 'http';
import type { VercelRequest } from '../../lib/types.js';
import { parse } from 'cookie';
import { getDb } from '../../lib/db.js';
import { hashRefreshToken } from '../../lib/jwt.js';
import { setCorsHeaders, handleOptions, setSecurityHeaders } from '../../lib/cors.js';
import { sendError } from '../../lib/errors.js';

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
    const token = cookies.refresh_token;
    if (token) {
      const tokenHash = hashRefreshToken(token);
      const db = getDb();
      await db.from('refresh_tokens').update({ revoked: true }).eq('token_hash', tokenHash);
    }

    res.setHeader('Set-Cookie', 'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
  } catch (err) {
    sendError(res, err);
  }
};
