import type { Router } from 'express';
import type { DataSource } from 'typeorm';
import { StockOperationsController } from './controllers/stock-operations.controller';
import { StockOperationsRepository } from './repositories/stock-operations.repository';
import { createStockOperationsRouter } from './routes/stock-operations.routes';
import { StockOperationsService } from './services/stock-operations.service';

export interface StockOperationsModule {
  router: Router;
}

export function createStockOperationsModule(dataSource: DataSource): StockOperationsModule {
  const service = new StockOperationsService(new StockOperationsRepository(dataSource));
  return { router: createStockOperationsRouter(new StockOperationsController(service)) };
}
