// Domain errors travel from services as typed results and are translated
// to status codes in controllers / the error middleware. A domain error
// message is safe to send to the client; internal errors are not.

export type DomainErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'SESSION_INVALID'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'VALIDATION';

export class DomainError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: DomainError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (status: number, code: DomainErrorCode, message: string): Result<never> => ({
  ok: false,
  error: new DomainError(status, code, message),
});
