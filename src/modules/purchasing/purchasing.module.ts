import type { Router } from 'express';
import type { DataSource } from 'typeorm';
import { PurchasingController } from './controllers/purchasing.controller';
import { PurchasingRepository } from './repositories/purchasing.repository';
import { createPurchasingRouter } from './routes/purchasing.routes';
import { PurchasingService } from './services/purchasing.service';

export interface PurchasingModule {
  router: Router;
}

export function createPurchasingModule(dataSource: DataSource): PurchasingModule {
  const service = new PurchasingService(new PurchasingRepository(dataSource));
  return { router: createPurchasingRouter(new PurchasingController(service)) };
}
