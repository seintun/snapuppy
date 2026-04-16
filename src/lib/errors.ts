export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: unknown, originalError?: unknown) {
    super(message, 'AUTH_ERROR', details, originalError);
    this.name = 'AuthError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown, originalError?: unknown) {
    super(message, 'DATABASE_ERROR', details, originalError);
    this.name = 'DatabaseError';
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
