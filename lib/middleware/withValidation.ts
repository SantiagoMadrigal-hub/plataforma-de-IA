import type { ServerResponse } from 'http';
import type { ZodSchema, z } from 'zod';
import type { VercelRequest, ApiHandler } from '../types.js';
import { AppError } from '../errors.js';

export function withValidation<T extends ZodSchema>(schema: T) {
  return (handler: (req: VercelRequest & { validated?: z.infer<T> }, res: ServerResponse) => Promise<void> | void): ApiHandler =>
    async (req, res) => {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const first = result.error.errors[0];
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: { code: 'VALIDATION_ERROR', message: first.message }
        }));
        return;
      }
      (req as VercelRequest & { validated?: z.infer<T> }).validated = result.data;
      return handler(req as VercelRequest & { validated?: z.infer<T> }, res);
    };
}
