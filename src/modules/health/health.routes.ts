import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { z } from 'zod';
import { AppError } from '../../core/exceptions/app-error';
import { ERROR_CODES } from '../../shared/constants/error-codes';
import { logger } from '../../shared/logger/logger';
import { errorResponse, openApiRegistry, successResponse } from '../../shared/openapi/registry';
import { sendSuccess } from '../../shared/response/api-response';

openApiRegistry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Check that the API and its database are available',
  description: 'Public.',
  responses: {
    200: successResponse('Service is healthy', z.object({ status: z.literal('ok') }), {
      status: 'ok',
    }),
    503: errorResponse('Database is unavailable'),
  },
});

export function createHealthRouter(dataSource: DataSource): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    try {
      await dataSource.query('SELECT 1');
    } catch (error) {
      logger.error(
        { reason: error instanceof Error ? error.message : 'unknown' },
        'Health check failed',
      );
      throw new AppError(503, ERROR_CODES.SERVICE_UNAVAILABLE, 'Service is unavailable');
    }
    sendSuccess(res, { status: 'ok' }, 'Service is healthy');
  });
  return router;
}
