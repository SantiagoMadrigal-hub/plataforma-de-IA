const { z } = require('zod');

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200).default('Sin título'),
  content: z.string().default(''),
  format: z.string().optional(),
  tone: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  format: z.string().optional(),
  tone: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

module.exports = { createDocumentSchema, updateDocumentSchema };
