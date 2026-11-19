import type { Router } from 'express';
import type { DataSource } from 'typeorm';
import type { InventoryService } from '../inventory/services/inventory.service';
import { SalesController } from './controllers/sales.controller';
import { SalesRepository } from './repositories/sales.repository';
import { createSalesRouter } from './routes/sales.routes';
import { SalesService } from './services/sales.service';

export interface SalesModule {
  router: Router;
  service: SalesService;
}

export function createSalesModule(
  dataSource: DataSource,
  inventory: InventoryService,
): SalesModule {
  const service = new SalesService(new SalesRepository(dataSource), inventory);
  return { router: createSalesRouter(new SalesController(service)), service };
}
