import type { Router } from 'express';
import type { DataSource } from 'typeorm';
import { MasterDataController } from './controllers/master-data.controller';
import { createMasterDataRouter } from './routes/master-data.routes';
import { MasterDataService } from './services/master-data.service';
import { MasterDataRepository } from './repositories/master-data.repository';

export interface MasterDataModule {
  router: Router;
}

export function createMasterDataModule(dataSource: DataSource): MasterDataModule {
  const service = new MasterDataService(new MasterDataRepository(dataSource));
  return { router: createMasterDataRouter(new MasterDataController(service)) };
}
