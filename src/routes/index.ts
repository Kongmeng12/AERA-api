import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { createAuthModule } from '../modules/auth/auth.module';
import { createHealthRouter } from '../modules/health/health.routes';
import { createInventoryModule } from '../modules/inventory/inventory.module';
import { createMasterDataModule } from '../modules/master-data/master-data.module';
import { createPurchasingModule } from '../modules/purchasing/purchasing.module';
import { createRolesModule } from '../modules/roles/roles.module';
import { createUsersModule } from '../modules/users/users.module';

export function createApiRouter(dataSource: DataSource): Router {
  const roles = createRolesModule(dataSource);
  const users = createUsersModule(dataSource, roles.roleLookup);
  const masterData = createMasterDataModule(dataSource);
  const purchasing = createPurchasingModule(dataSource);
  const inventory = createInventoryModule(dataSource);

  const router = Router();
  router.use('/health', createHealthRouter(dataSource));
  router.use('/auth', createAuthModule(dataSource, users.service));
  router.use('/users', users.router);
  router.use('/roles', roles.router);
  router.use(masterData.router);
  router.use(purchasing.router);
  router.use(inventory.router);
  return router;
}
