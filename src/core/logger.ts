type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const canDebug = import.meta.env.DEV;

function write(level: LogLevel, message: string, metadata?: unknown) {
  if (!canDebug && level === 'debug') {
    return;
  }

  const prefix = `[app:${level}]`;

  if (level === 'error') {
    console.error(prefix, message, metadata ?? '');
    return;
  }

  if (level === 'warn') {
    console.warn(prefix, message, metadata ?? '');
    return;
  }

  if (level === 'info') {
    console.info(prefix, message, metadata ?? '');
    return;
  }

  console.debug(prefix, message, metadata ?? '');
}

export const logger = {
  debug: (message: string, metadata?: unknown) => write('debug', message, metadata),
  info: (message: string, metadata?: unknown) => write('info', message, metadata),
  warn: (message: string, metadata?: unknown) => write('warn', message, metadata),
  error: (message: string, metadata?: unknown) => write('error', message, metadata),
};

