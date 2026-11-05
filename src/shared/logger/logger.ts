import pino from 'pino';
import { appConfig } from '../../config/app.config';

export const logger = pino({
  level: appConfig.logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      'accessToken',
      'refreshToken',
    ],
    censor: '[REDACTED]',
  },
});
