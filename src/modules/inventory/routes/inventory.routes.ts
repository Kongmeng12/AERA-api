import { Router } from 'express';
import { ROLES } from '../../../shared/constants/roles';
import { authenticate } from '../../../shared/guards/authenticate.guard';
import { authorize } from '../../../shared/guards/authorize.guard';
import { validate } from '../../../shared/middlewares/validate.middleware';
import type { InventoryController } from '../controllers/inventory.controller';
import {
  listInventoryBalancesQuerySchema,
  listStockBatchesQuerySchema,
  listStockMovementsQuerySchema,
} from '../validators/inventory.validator';

export function createInventoryRouter(controller: InventoryController): Router {
  const router = Router();
  const canRead = authorize(
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.WAREHOUSE,
    ROLES.PURCHASING,
    ROLES.QC,
  );
  router.use(authenticate);
  router.get(
    '/inventory/balances',
    canRead,
    validate({ query: listInventoryBalancesQuerySchema }),
    controller.listBalances,
  );
  router.get(
    '/inventory/batches',
    canRead,
    validate({ query: listStockBatchesQuerySchema }),
    controller.listBatches,
  );
  router.get(
    '/inventory/movements',
    canRead,
    validate({ query: listStockMovementsQuerySchema }),
    controller.listMovements,
  );
  return router;
}
