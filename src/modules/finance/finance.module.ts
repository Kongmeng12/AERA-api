import type { Router } from 'express';
import type { DataSource } from 'typeorm';
import { FinanceController } from './controllers/finance.controller';
import { FinanceRepository } from './repositories/finance.repository';
import { createFinanceRouter } from './routes/finance.routes';
import { FinanceService } from './services/finance.service';

export interface FinanceModule {
  router: Router;
  service: FinanceService;
}

export function createFinanceModule(dataSource: DataSource): FinanceModule {
  const service = new FinanceService(new FinanceRepository(dataSource));
  return { router: createFinanceRouter(new FinanceController(service)), service };
}
