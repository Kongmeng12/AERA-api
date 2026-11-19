import type { Router } from 'express';
import type { DataSource } from 'typeorm';
import { QualityControlController } from './controllers/quality-control.controller';
import { QualityControlRepository } from './repositories/quality-control.repository';
import { createQualityControlRouter } from './routes/quality-control.routes';
import { QualityControlService } from './services/quality-control.service';

export interface QualityControlModule {
  router: Router;
}

export function createQualityControlModule(dataSource: DataSource): QualityControlModule {
  const service = new QualityControlService(new QualityControlRepository(dataSource));
  return { router: createQualityControlRouter(new QualityControlController(service)) };
}
