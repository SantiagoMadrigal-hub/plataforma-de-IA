import { describe, it, expect, vi } from 'vitest';
import { AppError, sendError } from '../../lib/errors.js';
import type { ServerResponse } from 'http';

function mockRes(): ServerResponse {
  const res: Partial<ServerResponse> = {
    statusCode: 0,
    _headers: {},
    setHeader: vi.fn().mockImplementation(function (this: ServerResponse, name: string, value: string | number) {
      (this as any)._headers[name] = value;
    }),
    end: vi.fn(),
  };
  return res as ServerResponse;
}

describe('AppError', () => {
  it('creates an error with code and default status 400', () => {
    const err = new AppError('TEST_ERROR', 'Algo salió mal');
    expect(err.message).toBe('Algo salió mal');
    expect(err.code).toBe('TEST_ERROR');
    expect(err.status).toBe(400);
    expect(err.isAppError).toBe(true);
  });

  it('creates an error with custom status', () => {
    const err = new AppError('NOT_FOUND', 'No encontrado', 404);
    expect(err.status).toBe(404);
  });
});

describe('sendError', () => {
  it('sends AppError with correct status and code', () => {
    const res = mockRes();
    const err = new AppError('NOT_FOUND', 'Recurso no encontrado', 404);
    sendError(res, err);
    expect(res.statusCode).toBe(404);
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Recurso no encontrado' } })
    );
  });

  it('sends 500 for unknown errors', () => {
    const res = mockRes();
    sendError(res, new Error('algo inesperado'));
    expect(res.statusCode).toBe(500);
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } })
    );
  });
});
