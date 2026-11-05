import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { appConfig } from '../../config/app.config';
import { AppError } from '../../core/exceptions/app-error';
import { ERROR_CODES } from '../constants/error-codes';

export function createRateLimiter(
  max: number,
  windowMs = appConfig.rateLimit.windowMs,
): RequestHandler {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(
        new AppError(429, ERROR_CODES.RATE_LIMITED, 'Too many requests, please try again later'),
      );
    },
  });
}
