import { z } from 'zod';

export const FORMATS = ['instagram', 'blog', 'youtube', 'email', 'seo'] as const;
export const TONES = ['profesional', 'divertido', 'formal', 'creativo'] as const;

export const generateSchema = z.object({
  prompt: z.string().min(3, 'El prompt debe tener al menos 3 caracteres').max(2000, 'El prompt es demasiado largo'),
  tone: z.enum(TONES).default('profesional'),
  format: z.enum(FORMATS),
  stream: z.boolean().default(false),
});

export type GenerateInput = z.infer<typeof generateSchema>;
export type Format = (typeof FORMATS)[number];
export type Tone = (typeof TONES)[number];
