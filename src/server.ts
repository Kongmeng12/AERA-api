import 'reflect-metadata';
import type { Server } from 'node:http';
import { createApp } from './app';
import { appConfig } from './config/app.config';
import { AppDataSource } from './core/database/data-source';
import { logger } from './shared/logger/logger';

const SHUTDOWN_TIMEOUT_MS = 10_000;

let server: Server | undefined;
let shuttingDown = false;

async function shutdown(reason: string, exitCode: number): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ reason }, 'Shutting down');

  // Do not let a stuck connection hold the process open forever.
  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    if (server) {
      const closing = server;
      await new Promise<void>((resolve, reject) => {
        closing.close((error) => (error ? reject(error) : resolve()));
        closing.closeIdleConnections();
      });
    }
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    logger.info('Shutdown complete');
    process.exitCode = exitCode;
  } catch (error) {
    logger.error({ reason: error instanceof Error ? error.message : 'unknown' }, 'Shutdown failed');
    process.exitCode = 1;
  } finally {
    clearTimeout(forceExit);
  }
}

async function start(): Promise<void> {
  await AppDataSource.initialize();
  logger.info('Database connected');

  const app = createApp(AppDataSource);
  server = app.listen(appConfig.port, () => {
    logger.info({ port: appConfig.port, env: appConfig.env }, 'Server listening');
  });
  server.on('error', (error) => {
    logger.fatal({ reason: error.message }, 'HTTP server error');
    void shutdown('server error', 1);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM', 0));
process.on('SIGINT', () => void shutdown('SIGINT', 0));
process.on('unhandledRejection', (reason) => {
  logger.fatal(
    { reason: reason instanceof Error ? reason.message : 'unknown' },
    'Unhandled rejection',
  );
  void shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (error) => {
  logger.fatal({ reason: error.message, stack: error.stack }, 'Uncaught exception');
  void shutdown('uncaughtException', 1);
});

start().catch((error: unknown) => {
  logger.fatal({ reason: error instanceof Error ? error.message : 'unknown' }, 'Startup failed');
  void shutdown('startup failure', 1);
});
