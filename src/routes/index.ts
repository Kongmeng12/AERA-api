import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { createAuthModule } from '../modules/auth/auth.module';
import { createHealthRouter } from '../modules/health/health.routes';
import { createMasterDataModule } from '../modules/master-data/master-data.module';
import { createRolesModule } from '../modules/roles/roles.module';
import { createUsersModule } from '../modules/users/users.module';

export function createApiRouter(dataSource: DataSource): Router {
  const roles = createRolesModule(dataSource);
  const users = createUsersModule(dataSource, roles.roleLookup);
  const masterData = createMasterDataModule(dataSource);

  const router = Router();
  router.use('/health', createHealthRouter(dataSource));
  router.use('/auth', createAuthModule(dataSource, users.service));
  router.use('/users', users.router);
  router.use('/roles', roles.router);
  router.use(masterData.router);
  return router;
}
