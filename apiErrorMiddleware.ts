import type { Express, Request, Response, NextFunction } from 'express';
import { sendError } from './apiResponse';

export class HttpError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function registerApiErrorMiddleware(app: Express): void {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    if (err instanceof HttpError) {
      return sendError(res, err.status, err.message, err.code);
    }
    console.error('[API]', err);
    return sendError(res, 500, 'Erro interno do servidor. Tente novamente.');
  });
}
