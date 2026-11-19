import type { Router } from 'express';
import type { DataSource } from 'typeorm';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryRepository } from './repositories/inventory.repository';
import { createInventoryRouter } from './routes/inventory.routes';
import { InventoryService } from './services/inventory.service';

export interface InventoryModule {
  router: Router;
}

export function createInventoryModule(dataSource: DataSource): InventoryModule {
  const service = new InventoryService(new InventoryRepository(dataSource));
  return { router: createInventoryRouter(new InventoryController(service)) };
}
