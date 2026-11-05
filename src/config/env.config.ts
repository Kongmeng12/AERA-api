import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Tests configure their environment in tests/setup-env.ts.
if (process.env.NODE_ENV !== 'test') {
  loadDotenv({ quiet: true });
}

const duration = z.string().regex(/^\d+(ms|s|m|h|d)$/, 'must look like 15m, 7d or 3600s');
const secret = z
  .string()
  .min(32, 'must be at least 32 characters')
  .refine((value) => !value.startsWith('replace_'), 'must not be a placeholder');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
    DB_USERNAME: z.string().min(1),
    DB_PASSWORD: z.string(),
    DB_DATABASE: z.string().min(1),

    JWT_ACCESS_SECRET: secret,
    JWT_ACCESS_EXPIRES_IN: duration.default('15m'),
    JWT_REFRESH_SECRET: secret,
    JWT_REFRESH_EXPIRES_IN: duration.default('7d'),
    JWT_ISSUER: z.string().min(1).default('aera-mineral-api'),
    JWT_AUDIENCE: z.string().min(1).default('aera-mineral-clients'),

    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

    CORS_ORIGIN: z
      .string()
      .min(1)
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .refine((origins) => !origins.includes('*'), 'must be an explicit allowlist, not *'),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

    SWAGGER_ENABLED: z.enum(['true', 'false']).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'must differ from JWT_ACCESS_SECRET',
      });
    }
    if (env.NODE_ENV === 'production' && env.BCRYPT_ROUNDS < 10) {
      ctx.addIssue({
        code: 'custom',
        path: ['BCRYPT_ROUNDS'],
        message: 'must be at least 10 in production',
      });
    }
  });

function loadEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);
  if (result.success) {
    return result.data;
  }
  // Report names and rules only; values may be secrets.
  const problems = result.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${problems}`);
}

export const env = loadEnv();
