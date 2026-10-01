// ==============================================================================
// Structured Logger with Sensitive Field Redaction
// ==============================================================================

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type SystemEvent =
  | 'USER_REGISTER'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'ANIMAL_CREATED'
  | 'ANIMAL_UPDATED'
  | 'ANIMAL_DELETED'
  | 'HEALTH_RECORD_CREATED'
  | 'VACCINATION_RECORDED'
  | 'MEDICATION_PRESCRIBED'
  | 'FILE_UPLOADED'
  | 'SCAN_UPLOADED'
  | 'AI_INFERENCE_STARTED'
  | 'AI_INFERENCE_COMPLETED'
  | 'AI_INFERENCE_FAILED'
  | 'CONSULTATION_REQUESTED'
  | 'CONSULTATION_ACCEPTED'
  | 'CONSULTATION_COMPLETED'
  | 'CONSULTATION_MESSAGE'
  | 'VET_VERIFICATION_UPDATED'
  | 'MODEL_VERSION_CREATED';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'newpassword',
  'currentpassword',
  'token',
  'sessiontoken',
  'session_secret',
  'secret',
  'authorization',
  'cookie',
  'apikey',
  'privatekey'
]);

function redact(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redact(value, depth + 1);
    }
  }
  return result;
}

export const logger = {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(meta ? (redact(meta) as Record<string, unknown>) : {})
    };
    const serialized = JSON.stringify(entry);
    if (level === 'error') {
      console.error(serialized);
    } else if (level === 'warn') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  },

  info(message: string, meta?: Record<string, unknown>) {
    this.log('info', message, meta);
  },

  warn(message: string, meta?: Record<string, unknown>) {
    this.log('warn', message, meta);
  },

  error(message: string, meta?: Record<string, unknown>) {
    this.log('error', message, meta);
  },

  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, meta);
    }
  },

  event(event: SystemEvent, meta?: Record<string, unknown>) {
    this.info(`EVENT: ${event}`, { event, ...meta });
  }
};
