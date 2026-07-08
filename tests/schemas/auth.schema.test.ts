import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, updateProfileSchema } from '../../schemas/auth.schema.js';

describe('auth schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid registration data', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: '12345678',
        name: 'Test User',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short password', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: '123',
        name: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'not-an-email',
        password: '12345678',
        name: 'Test',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login data', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'anything',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('accepts partial profile update', () => {
      const result = updateProfileSchema.safeParse({ name: 'New Name' });
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
