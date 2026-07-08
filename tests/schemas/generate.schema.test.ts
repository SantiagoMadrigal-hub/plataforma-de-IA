import { describe, it, expect } from 'vitest';
import { generateSchema } from '../../schemas/generate.schema.js';

describe('generateSchema', () => {
  it('accepts valid generation input', () => {
    const result = generateSchema.safeParse({
      prompt: 'Crea un post sobre productividad',
      tone: 'profesional',
      format: 'blog',
    });
    expect(result.success).toBe(true);
  });

  it('defaults tone to profesional', () => {
    const result = generateSchema.safeParse({
      prompt: 'Crea un post',
      format: 'instagram',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tone).toBe('profesional');
    }
  });

  it('rejects invalid format', () => {
    const result = generateSchema.safeParse({
      prompt: 'Crea un post',
      format: 'invalid-format',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short prompt', () => {
    const result = generateSchema.safeParse({
      prompt: 'ab',
      format: 'blog',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid tone', () => {
    const result = generateSchema.safeParse({
      prompt: 'Crea un post',
      tone: 'inexistente',
      format: 'blog',
    });
    expect(result.success).toBe(false);
  });
});
