type Meta = Record<string, unknown>;

// Structured logger. Log the actor and the operation, never the payload:
// no password, OTP, token, encryption key, or candidate choice reaches a log line.
function write(level: 'info' | 'warn' | 'error', message: string, meta: Meta = {}): void {
  const line = JSON.stringify({ level, message, ...meta, time: new Date().toISOString() });
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, meta?: Meta) => write('info', message, meta),
  warn: (message: string, meta?: Meta) => write('warn', message, meta),
  error: (message: string, meta?: Meta) => write('error', message, meta),
};
