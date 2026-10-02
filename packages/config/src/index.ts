import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env if present
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APPLICATION_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:4000'),

  // Database
  DATABASE_URL: z.string().min(1).default('postgresql://postgres:postgres@localhost:5432/vetvision_ai?schema=public'),

  // Session & Security
  SESSION_SECRET: z.string().min(16).default('dev-insecure-secret-replace-in-production-32-chars'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./data/storage'),
  OBJECT_STORAGE_ENDPOINT: z.string().optional().default('http://localhost:9000'),
  OBJECT_STORAGE_REGION: z.string().optional().default('us-east-1'),
  OBJECT_STORAGE_BUCKET: z.string().optional().default('vetvision-assets'),
  OBJECT_STORAGE_ACCESS_KEY: z.string().optional().default(''),
  OBJECT_STORAGE_SECRET_KEY: z.string().optional().default(''),
  OBJECT_STORAGE_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

  // Internal AI Service
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  AI_SERVICE_INTERNAL_SECRET: z.string().default('dev-internal-ai-secret-key-32-bytes-long'),
  AI_SERVICE_TIMEOUT_MS: z.coerce.number().default(15000),
  AI_MODEL_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),

  // Email
  EMAIL_PROVIDER: z.enum(['console', 'smtp', 'sendgrid']).default('console'),
  EMAIL_FROM_ADDRESS: z.string().email().default('noreply@vetvision.ai'),
  EMAIL_FROM_NAME: z.string().default('VetVision AI'),
  SMTP_HOST: z.string().optional().default('localhost'),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_SECURE: z.coerce.boolean().default(false),

  // MSG91 Email OTP Service Configuration (Server-Side Only)
  MSG91_AUTH_KEY: z.string().optional().default(''),
  MSG91_TEMPLATE_ID: z.string().optional().default(''),
  MSG91_EMAIL_TEMPLATE_ID: z.string().optional().default(''),
  MSG91_OTP_API_URL: z.string().url().default('https://control.msg91.com/api/v5/otp'),
  OTP_EXPIRY_MINUTES: z.coerce.number().default(10),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),

  // Rate Limiting & CORS
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1000),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000')
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedEnv: EnvConfig;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Invalid environment variables:', JSON.stringify(error.format(), null, 2));
  }
  // Fall back to defaults in dev/test, but fail in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Invalid environment configuration in production');
  }
  parsedEnv = envSchema.parse({
    NODE_ENV: 'development',
    SESSION_SECRET: 'dev-insecure-secret-replace-in-production-32-chars'
  });
}

export const config = {
  ...parsedEnv,
  isProduction: parsedEnv.NODE_ENV === 'production',
  isDevelopment: parsedEnv.NODE_ENV === 'development',
  isTest: parsedEnv.NODE_ENV === 'test',
  corsOrigins: parsedEnv.CORS_ORIGIN.split(',').map((o) => o.trim())
};
