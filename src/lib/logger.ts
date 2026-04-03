import { isAppError } from './errors';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.isDevelopment && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (level === 'error') {
      console.error(prefix, message, context || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, context || '');
    } else {
      console.info(prefix, message, context || '');
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, err?: unknown, context?: LogContext) {
    const warnContext: LogContext = { ...context };
    if (err instanceof Error) {
      warnContext.stack = err.stack;
    }
    this.log('warn', message, err ? { error: err, ...warnContext } : warnContext);
  }

  error(message: string, err: unknown, context?: LogContext) {
    const errorContext: LogContext = { ...context };

    if (isAppError(err)) {
      errorContext.code = err.code;
      errorContext.details = err.details;
      errorContext.originalError = err.originalError;
    } else if (err instanceof Error) {
      errorContext.stack = err.stack;
    }

    this.log('error', message, errorContext);
  }
}

export const logger = new Logger();
