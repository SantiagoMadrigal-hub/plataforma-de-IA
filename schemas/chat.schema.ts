import { z } from 'zod';

export const chatSchema = z.object({
  content: z.string().min(1, 'El contenido es obligatorio').max(50000, 'El contenido es demasiado largo'),
  instruction: z.string().min(2, 'La instrucción debe tener al menos 2 caracteres').max(2000, 'La instrucción es demasiado larga'),
  originalPrompt: z.string().max(2000).optional(),
  tone: z.string().max(50).optional(),
  format: z.string().max(50).optional(),
});

export type ChatInput = z.infer<typeof chatSchema>;
