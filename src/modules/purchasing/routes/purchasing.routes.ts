import { Router } from 'express';
import { ROLES } from '../../../shared/constants/roles';
import { authenticate } from '../../../shared/guards/authenticate.guard';
import { authorize } from '../../../shared/guards/authorize.guard';
import { validate } from '../../../shared/middlewares/validate.middleware';
import type { PurchasingController } from '../controllers/purchasing.controller';
import {
  createGoodsReceiptSchema,
  createPurchaseOrderSchema,
  listGoodsReceiptsQuerySchema,
  listPurchaseOrdersQuerySchema,
  purchaseOrderIdParamsSchema,
} from '../validators/purchasing.validator';

export function createPurchasingRouter(controller: PurchasingController): Router {
  const router = Router();
  const canRead = authorize(
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.PURCHASING,
    ROLES.WAREHOUSE,
    ROLES.ACCOUNTING,
  );
  router.use(authenticate);
  router.get(
    '/purchase-orders',
    canRead,
    validate({ query: listPurchaseOrdersQuerySchema }),
    controller.listPurchaseOrders,
  );
  router.get(
    '/purchase-orders/:id',
    canRead,
    validate({ params: purchaseOrderIdParamsSchema }),
    controller.getPurchaseOrder,
  );
  router.post(
    '/purchase-orders',
    authorize(ROLES.ADMIN, ROLES.PURCHASING),
    validate({ body: createPurchaseOrderSchema }),
    controller.createPurchaseOrder,
  );
  router.post(
    '/purchase-orders/:id/issue',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PURCHASING),
    validate({ params: purchaseOrderIdParamsSchema }),
    controller.issuePurchaseOrder,
  );
  router.get(
    '/goods-receipts',
    canRead,
    validate({ query: listGoodsReceiptsQuerySchema }),
    controller.listGoodsReceipts,
  );
  router.get(
    '/goods-receipts/:id',
    canRead,
    validate({ params: purchaseOrderIdParamsSchema }),
    controller.getGoodsReceipt,
  );
  router.post(
    '/goods-receipts',
    authorize(ROLES.ADMIN, ROLES.PURCHASING, ROLES.WAREHOUSE),
    validate({ body: createGoodsReceiptSchema }),
    controller.createGoodsReceipt,
  );
  return router;
}
