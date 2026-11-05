import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { DataSource } from 'typeorm';
import { appConfig } from './config/app.config';
import { createApiRouter } from './routes';
import { createDocsRouter } from './routes/openapi';
import { errorHandler, notFoundHandler } from './shared/middlewares/error.middleware';
import { createRateLimiter } from './shared/middlewares/rate-limit.middleware';
import { requestLogger } from './shared/middlewares/request-logger.middleware';

const BODY_SIZE_LIMIT = '100kb';

export function createApp(dataSource: DataSource): Express {
  const app = express();

  app.set('trust proxy', appConfig.trustProxy);
  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: [...appConfig.corsOrigins] }));
  app.use(createRateLimiter(appConfig.rateLimit.max));
  app.use(express.json({ limit: BODY_SIZE_LIMIT }));

  if (appConfig.swaggerEnabled) {
    app.use('/api/docs', createDocsRouter());
  }
  app.use(appConfig.apiBasePath, createApiRouter(dataSource));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
