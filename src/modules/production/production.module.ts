import type { Router } from 'express';
import type { DataSource } from 'typeorm';
import { ProductionController } from './controllers/production.controller';
import { ProductionRepository } from './repositories/production.repository';
import { createProductionRouter } from './routes/production.routes';
import { ProductionService } from './services/production.service';

export interface ProductionModule {
  router: Router;
}

export function createProductionModule(dataSource: DataSource): ProductionModule {
  const service = new ProductionService(new ProductionRepository(dataSource));
  return { router: createProductionRouter(new ProductionController(service)) };
}
