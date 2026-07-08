import { describe, it, expect, beforeAll } from 'vitest';
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshExpiry,
} from '../../lib/jwt.js';

const TEST_USER = { id: 'user-123', email: 'test@example.com', plan: 'free' };

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-32chars';
});

describe('jwt', () => {
  it('signs and verifies an access token', () => {
    const token = signAccessToken(TEST_USER);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe('user-123');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.plan).toBe('free');
  });

  it('rejects tampered token', () => {
    const token = signAccessToken(TEST_USER);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('generates unique refresh tokens', () => {
    const t1 = generateRefreshToken();
    const t2 = generateRefreshToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBe(96); // 48 bytes = 96 hex chars
  });

  it('hashes refresh tokens consistently', () => {
    const token = generateRefreshToken();
    const hash1 = hashRefreshToken(token);
    const hash2 = hashRefreshToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(token);
  });

  it('getRefreshExpiry returns a date in the future', () => {
    const expiry = getRefreshExpiry();
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });
});
