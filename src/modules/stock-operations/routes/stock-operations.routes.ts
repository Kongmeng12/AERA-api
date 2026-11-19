import { Router } from 'express';
import { ROLES } from '../../../shared/constants/roles';
import { authenticate } from '../../../shared/guards/authenticate.guard';
import { authorize } from '../../../shared/guards/authorize.guard';
import { validate } from '../../../shared/middlewares/validate.middleware';
import type { StockOperationsController } from '../controllers/stock-operations.controller';
import {
  createStockCountSchema,
  createStockTransferSchema,
  createStockWriteoffSchema,
  listStockCountsQuerySchema,
  listStockTransfersQuerySchema,
  listStockWriteoffsQuerySchema,
  receiveStockTransferSchema,
  rejectStockWriteoffSchema,
  stockOperationIdParamsSchema,
} from '../validators/stock-operations.validator';

export function createStockOperationsRouter(controller: StockOperationsController): Router {
  const router = Router();
  const canRead = authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE, ROLES.PURCHASING);
  const canOperate = authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE);
  const canApprove = authorize(ROLES.ADMIN, ROLES.MANAGER);
  router.use(authenticate);

  router.get(
    '/inventory/transfers',
    canRead,
    validate({ query: listStockTransfersQuerySchema }),
    controller.listTransfers,
  );
  router.get(
    '/inventory/transfers/:id',
    canRead,
    validate({ params: stockOperationIdParamsSchema }),
    controller.getTransfer,
  );
  router.post(
    '/inventory/transfers',
    canOperate,
    validate({ body: createStockTransferSchema }),
    controller.createTransfer,
  );
  router.post(
    '/inventory/transfers/:id/dispatch',
    canOperate,
    validate({ params: stockOperationIdParamsSchema }),
    controller.dispatchTransfer,
  );
  router.post(
    '/inventory/transfers/:id/receive',
    canOperate,
    validate({ params: stockOperationIdParamsSchema, body: receiveStockTransferSchema }),
    controller.receiveTransfer,
  );

  router.get(
    '/inventory/counts',
    canRead,
    validate({ query: listStockCountsQuerySchema }),
    controller.listCounts,
  );
  router.get(
    '/inventory/counts/:id',
    canRead,
    validate({ params: stockOperationIdParamsSchema }),
    controller.getCount,
  );
  router.post(
    '/inventory/counts',
    canOperate,
    validate({ body: createStockCountSchema }),
    controller.createCount,
  );
  router.post(
    '/inventory/counts/:id/approve',
    canApprove,
    validate({ params: stockOperationIdParamsSchema }),
    controller.approveCount,
  );

  router.get(
    '/inventory/writeoffs',
    canRead,
    validate({ query: listStockWriteoffsQuerySchema }),
    controller.listWriteoffs,
  );
  router.get(
    '/inventory/writeoffs/:id',
    canRead,
    validate({ params: stockOperationIdParamsSchema }),
    controller.getWriteoff,
  );
  router.post(
    '/inventory/writeoffs',
    canOperate,
    validate({ body: createStockWriteoffSchema }),
    controller.createWriteoff,
  );
  router.post(
    '/inventory/writeoffs/:id/approve',
    canApprove,
    validate({ params: stockOperationIdParamsSchema }),
    controller.approveWriteoff,
  );
  router.post(
    '/inventory/writeoffs/:id/reject',
    canApprove,
    validate({ params: stockOperationIdParamsSchema, body: rejectStockWriteoffSchema }),
    controller.rejectWriteoff,
  );

  return router;
}
