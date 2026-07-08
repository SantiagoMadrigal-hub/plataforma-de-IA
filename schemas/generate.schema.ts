import { z } from 'zod';

export const FORMATS = ['instagram', 'blog', 'youtube', 'email', 'seo'] as const;
export const TONES = ['profesional', 'divertido', 'formal', 'creativo'] as const;

const generateFields = {
  prompt: z.string().min(3, 'El prompt debe tener al menos 3 caracteres').max(2000, 'El prompt es demasiado largo'),
  tone: z.enum(TONES).default('profesional'),
  format: z.enum(FORMATS),
};

const refineFields = {
  content: z.string().min(1, 'El contenido es obligatorio').max(50000, 'El contenido es demasiado largo'),
  instruction: z.string().min(2, 'La instrucción debe tener al menos 2 caracteres').max(2000, 'La instrucción es demasiado larga'),
  tone: z.enum(TONES).optional(),
  format: z.enum(FORMATS).optional(),
  originalPrompt: z.string().max(2000).optional(),
};

export const generateSchema = z.object(generateFields);

export const refineSchema = z.object(refineFields);

export const generateOrRefineSchema = z.union([
  z.object({ ...generateFields }),
  z.object({ ...refineFields }),
]);

export type GenerateInput = z.infer<typeof generateSchema>;
export type RefineInput = z.infer<typeof refineSchema>;
export type Format = (typeof FORMATS)[number];
export type Tone = (typeof TONES)[number];
