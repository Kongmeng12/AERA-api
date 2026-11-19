import type { Router } from 'express';
import type { DataSource } from 'typeorm';
import type { InventoryService } from '../inventory/services/inventory.service';
import type { SalesService } from '../sales/services/sales.service';
import { DeliveryController } from './controllers/delivery.controller';
import { DeliveryRepository } from './repositories/delivery.repository';
import { createDeliveryRouter } from './routes/delivery.routes';
import { DeliveryService } from './services/delivery.service';

export interface DeliveryModule {
  router: Router;
}

export function createDeliveryModule(
  dataSource: DataSource,
  sales: SalesService,
  inventory: InventoryService,
): DeliveryModule {
  const service = new DeliveryService(new DeliveryRepository(dataSource), sales, inventory);
  return { router: createDeliveryRouter(new DeliveryController(service)) };
}
