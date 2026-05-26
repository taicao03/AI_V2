export class AppError extends Error {
  readonly code: string;
  readonly causeValue: unknown;

  constructor(message: string, options?: { code?: string; cause?: unknown }) {
    super(message);
    this.name = 'AppError';
    this.code = options?.code ?? 'UNKNOWN_ERROR';
    this.causeValue = options?.cause;
  }
}

export type Result<T, E = AppError> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: E;
    };

export function toAppError(error: unknown, fallbackMessage: string, code = 'UNKNOWN_ERROR'): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, { cause: error, code });
  }

  return new AppError(fallbackMessage, { cause: error, code });
}

