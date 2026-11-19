import type { Router } from 'express';
import type { DataSource } from 'typeorm';
import type { InventoryService } from '../inventory/services/inventory.service';
import { ReturnsController } from './controllers/returns.controller';
import { ReturnsRepository } from './repositories/returns.repository';
import { createReturnsRouter } from './routes/returns.routes';
import { ReturnsService } from './services/returns.service';

export interface ReturnsModule {
  router: Router;
}

export function createReturnsModule(
  dataSource: DataSource,
  inventory: InventoryService,
): ReturnsModule {
  const service = new ReturnsService(new ReturnsRepository(dataSource), inventory);
  return { router: createReturnsRouter(new ReturnsController(service)) };
}
