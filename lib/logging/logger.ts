import { randomUUID } from 'node:crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  event: string;
  userId?: string;
  newsletterId?: string;
  requestId?: string;
};

export type LogDetails = Record<string, unknown>;

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY = /(?:authorization|cookie|email|password|secret|session|token)/i;

function redact(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY.test(key)) return REDACTED;
  if (Array.isArray(value)) return value.map((entry) => redact(entry));
  if (value instanceof Error) return { name: value.name };
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([entryKey, entry]) => [entryKey, redact(entry, entryKey)]));
}

function write(level: LogLevel, context: LogContext, details?: LogDetails) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    ...context,
    ...(details ? { details: redact(details) } : {}),
  };
  const method = level === 'debug' ? 'debug' : level === 'info' ? 'info' : level === 'warn' ? 'warn' : 'error';
  // The logger is the sole approved server-side console sink; callers emit structured fields only.
  // eslint-disable-next-line no-console
  console[method](JSON.stringify(entry));
}

export const logger = {
  debug: (context: LogContext, details?: LogDetails) => write('debug', context, details),
  info: (context: LogContext, details?: LogDetails) => write('info', context, details),
  warn: (context: LogContext, details?: LogDetails) => write('warn', context, details),
  error: (context: LogContext, details?: LogDetails) => write('error', context, details),
};

export function requestIdFrom(request: Request) {
  return request.headers.get('x-request-id') || randomUUID();
}
