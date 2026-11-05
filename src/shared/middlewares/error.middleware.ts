import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../../core/exceptions/app-error';
import { ERROR_CODES } from '../constants/error-codes';
import { mapError } from '../helpers/map-error';
import { logger } from '../logger/logger';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, ERROR_CODES.ROUTE_NOT_FOUND, 'Route not found'));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const appError = mapError(error);
  if (appError.statusCode >= 500) {
    // Log selected fields only: TypeORM errors carry SQL parameters, which can hold secrets.
    const { name, message, stack } =
      error instanceof Error
        ? error
        : { name: 'NonError', message: String(error), stack: undefined };
    logger.error(
      { requestId: req.id, method: req.method, path: req.path, err: { name, message, stack } },
      'Unexpected API error',
    );
  }
  res.status(appError.statusCode).json({
    success: false,
    code: appError.code,
    message: appError.message,
    ...(appError.errors ? { errors: appError.errors } : {}),
  });
};
