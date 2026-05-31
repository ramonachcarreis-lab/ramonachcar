/** Envelope JSON padronizado — alinhado a server/apiResponse.ts */

export type ApiErrorPayload = {
  ok: false;
  message: string;
  code?: string;
};

export type ApiSuccessPayload<T> = {
  ok: true;
  data: T;
  empty?: boolean;
  meta?: Record<string, unknown>;
};

export type ApiEnvelope<T> = ApiSuccessPayload<T> | ApiErrorPayload;

/** Estado de UI para listas e painéis (loading / vazio / erro / dados). */
export type ClientDataState<T> =
  | { status: 'loading' }
  | { status: 'empty'; message: string }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

export function clientStateFromEnvelope<T>(
  envelope: ApiEnvelope<T> | null | undefined,
  isLoading: boolean,
  emptyMessage = 'Nenhum registro encontrado.'
): ClientDataState<T> {
  if (isLoading) return { status: 'loading' };
  if (!envelope) return { status: 'error', message: 'Resposta inválida do servidor.' };
  if (!envelope.ok) return { status: 'error', message: envelope.message };
  const data = envelope.data;
  const isEmptyArray = Array.isArray(data) && data.length === 0;
  if (envelope.empty || isEmptyArray) {
    return { status: 'empty', message: emptyMessage };
  }
  return { status: 'success', data };
}
