import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().min(1, 'El nombre es requerido').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100).optional(),
  avatar_url: z.string().max(500000, 'La imagen es demasiado grande').optional(),
  preferences: z.record(z.boolean()).optional(),
});
