const { z } = require('zod');

const FORMATS = ['instagram', 'blog', 'youtube', 'email', 'seo'];
const TONES = ['profesional', 'divertido', 'formal', 'creativo'];

const generateSchema = z.object({
  prompt: z.string().min(3, 'El prompt debe tener al menos 3 caracteres').max(2000, 'El prompt es demasiado largo'),
  tone: z.enum(TONES).default('profesional'),
  format: z.enum(FORMATS),
});

module.exports = { generateSchema };
