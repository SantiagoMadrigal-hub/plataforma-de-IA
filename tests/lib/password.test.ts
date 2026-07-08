import { describe, it, expect } from 'vitest';
import { hash, verify } from '../../lib/password.js';

describe('password', () => {
  it('hashes and verifies a password correctly', async () => {
    const password = 'MiPasswordSegura123!';
    const hashed = await hash(password);
    expect(hashed).not.toBe(password);
    expect(hashed).toContain('$2a$');

    const valid = await verify(password, hashed);
    expect(valid).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hashed = await hash('correct-password');
    const valid = await verify('wrong-password', hashed);
    expect(valid).toBe(false);
  });
});
