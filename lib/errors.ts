import type { ServerResponse } from 'http';

export class AppError extends Error {
  code: string;
  status: number;
  isAppError: true;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
    this.isAppError = true;
    this.name = 'AppError';
  }
}

export function sendError(res: ServerResponse, err: unknown): void {
  if (err instanceof AppError) {
    res.statusCode = err.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: { code: err.code, message: err.message }
    }));
    return;
  }

  const msg = err instanceof Error ? err.message : 'Error interno del servidor';
  console.error('Error inesperado:', err);
  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    error: { code: 'INTERNAL_ERROR', message: msg }
  }));
}
