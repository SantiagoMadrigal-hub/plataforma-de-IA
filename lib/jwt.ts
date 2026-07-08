import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY_DAYS = 30;

interface JwtPayload {
  id: string;
  email: string;
  plan: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado');
  return secret;
}

export function signAccessToken(user: { id: string; email: string; plan: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, plan: user.plan },
    getSecret(),
    { expiresIn: ACCESS_EXPIRY }
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getRefreshExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_EXPIRY_DAYS);
  return d;
}
