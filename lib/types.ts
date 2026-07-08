import type { IncomingMessage, ServerResponse } from 'http';

export interface VercelRequest extends IncomingMessage {
  query?: Record<string, string | string[]>;
  body?: unknown;
}

export interface AuthenticatedRequest extends VercelRequest {
  user: { id: string; email: string; plan: string };
}

export type ApiHandler = (req: VercelRequest, res: ServerResponse) => Promise<void> | void;
