import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { createAuthModule } from '../modules/auth/auth.module';
import { createDeliveryModule } from '../modules/delivery/delivery.module';
import { createFinanceModule } from '../modules/finance/finance.module';
import { createHealthRouter } from '../modules/health/health.routes';
import { createInventoryModule } from '../modules/inventory/inventory.module';
import { createMasterDataModule } from '../modules/master-data/master-data.module';
import { createPurchasingModule } from '../modules/purchasing/purchasing.module';
import { createProductionModule } from '../modules/production/production.module';
import { createRolesModule } from '../modules/roles/roles.module';
import { createReturnsModule } from '../modules/returns/returns.module';
import { createSalesModule } from '../modules/sales/sales.module';
import { createUsersModule } from '../modules/users/users.module';

export function createApiRouter(dataSource: DataSource): Router {
  const roles = createRolesModule(dataSource);
  const users = createUsersModule(dataSource, roles.roleLookup);
  const masterData = createMasterDataModule(dataSource);
  const purchasing = createPurchasingModule(dataSource);
  const inventory = createInventoryModule(dataSource);
  const sales = createSalesModule(dataSource, inventory.service);
  const returns = createReturnsModule(dataSource, inventory.service);
  const finance = createFinanceModule(dataSource);
  const delivery = createDeliveryModule(dataSource, sales.service, inventory.service);
  const production = createProductionModule(dataSource);

  const router = Router();
  router.use('/health', createHealthRouter(dataSource));
  router.use('/auth', createAuthModule(dataSource, users.service));
  router.use('/users', users.router);
  router.use('/roles', roles.router);
  router.use(masterData.router);
  router.use(purchasing.router);
  router.use(inventory.router);
  router.use(sales.router);
  router.use(returns.router);
  router.use(finance.router);
  router.use(delivery.router);
  router.use('/production', production.router);
  return router;
}
