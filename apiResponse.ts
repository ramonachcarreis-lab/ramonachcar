import type { Response } from 'express';

export type ApiErrorPayload = {
  ok: false;
  message: string;
  code?: string;
};

export type ApiSuccessPayload<T> = {
  ok: true;
  data: T;
  /** true quando a lista/objeto representa estado vazio intencional */
  empty?: boolean;
  meta?: Record<string, unknown>;
};

export function sendError(
  res: Response,
  status: number,
  message: string,
  code?: string
): void {
  const body: ApiErrorPayload = { ok: false, message, ...(code ? { code } : {}) };
  res.status(status).json(body);
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  status = 200,
  options?: { empty?: boolean; meta?: Record<string, unknown> }
): void {
  res.status(status).json({
    ok: true,
    data,
    ...(options?.empty ? { empty: true } : {}),
    ...(options?.meta ? { meta: options.meta } : {}),
  } satisfies ApiSuccessPayload<T>);
}

/** Resposta de sucesso com lista vazia — front pode renderizar empty state. */
export function sendEmptyList<T extends unknown[]>(
  res: Response,
  emptyData: T,
  message?: string
): void {
  sendSuccess(res, emptyData, 200, {
    empty: true,
    meta: message ? { message } : undefined,
  });
}
