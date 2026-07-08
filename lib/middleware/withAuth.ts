import type { ServerResponse } from 'http';
import type { VercelRequest, AuthenticatedRequest, ApiHandler } from '../types.js';
import { verifyAccessToken } from '../jwt.js';
import { AppError } from '../errors.js';

export function withAuth(handler: ApiHandler): ApiHandler {
  return async (req: VercelRequest, res: ServerResponse) => {
    try {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        throw new AppError('UNAUTHORIZED', 'Token de acceso requerido', 401);
      }
      const token = auth.split(' ')[1];
      const decoded = verifyAccessToken(token);
      const authReq = req as AuthenticatedRequest;
      authReq.user = { id: decoded.id, email: decoded.email, plan: decoded.plan };
      return handler(authReq, res);
    } catch (err) {
      if (err instanceof AppError) {
        res.statusCode = err.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: { code: err.code, message: err.message }
        }));
        return;
      }
      if (err instanceof Error && err.name === 'TokenExpiredError') {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: { code: 'TOKEN_EXPIRED', message: 'El token ha expirado' }
        }));
        return;
      }
      if (err instanceof Error && err.name === 'JsonWebTokenError') {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: { code: 'INVALID_TOKEN', message: 'Token inválido' }
        }));
        return;
      }
      console.error('Auth error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' }
      }));
    }
  };
}
