import { env } from './env.config';

export const appConfig = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  port: env.PORT,
  trustProxy: env.TRUST_PROXY,
  logLevel: env.LOG_LEVEL,
  apiBasePath: '/api/v1',
  corsOrigins: env.CORS_ORIGIN,
  bcryptRounds: env.BCRYPT_ROUNDS,
  swaggerEnabled: env.SWAGGER_ENABLED
    ? env.SWAGGER_ENABLED === 'true'
    : env.NODE_ENV !== 'production',
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    authMax: env.AUTH_RATE_LIMIT_MAX,
  },
} as const;
