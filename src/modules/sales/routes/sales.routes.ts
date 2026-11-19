import { Router } from 'express';
import { ROLES } from '../../../shared/constants/roles';
import { authenticate } from '../../../shared/guards/authenticate.guard';
import { authorize } from '../../../shared/guards/authorize.guard';
import { validate } from '../../../shared/middlewares/validate.middleware';
import type { SalesController } from '../controllers/sales.controller';
import {
  createPaymentReceiptSchema,
  createSalesOrderSchema,
  createSalesPriceSchema,
  listSalesInvoicesQuerySchema,
  listSalesOrdersQuerySchema,
  listSalesPricesQuerySchema,
  salesIdParamsSchema,
  salesOrderCancellationSchema,
} from '../validators/sales.validator';

export function createSalesRouter(controller: SalesController): Router {
  const router = Router();
  const canRead = authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.ACCOUNTING);
  router.use(authenticate);
  router.get(
    '/sales-orders',
    canRead,
    validate({ query: listSalesOrdersQuerySchema }),
    controller.listOrders,
  );
  router.get(
    '/sales-orders/:id',
    canRead,
    validate({ params: salesIdParamsSchema }),
    controller.getOrder,
  );
  router.post(
    '/sales-orders',
    authorize(ROLES.ADMIN, ROLES.SALES),
    validate({ body: createSalesOrderSchema }),
    controller.createOrder,
  );
  router.post(
    '/sales-orders/:id/approve',
    authorize(ROLES.ADMIN, ROLES.MANAGER),
    validate({ params: salesIdParamsSchema }),
    controller.approveOrder,
  );
  router.post(
    '/sales-orders/:id/cancel',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES),
    validate({ params: salesIdParamsSchema, body: salesOrderCancellationSchema }),
    controller.cancelOrder,
  );
  router.get(
    '/sales-prices',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES),
    validate({ query: listSalesPricesQuerySchema }),
    controller.listPrices,
  );
  router.post(
    '/sales-prices',
    authorize(ROLES.ADMIN),
    validate({ body: createSalesPriceSchema }),
    controller.createPrice,
  );
  router.get(
    '/sales-invoices',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.ACCOUNTING),
    validate({ query: listSalesInvoicesQuerySchema }),
    controller.listInvoices,
  );
  router.get(
    '/sales-invoices/:id',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.ACCOUNTING),
    validate({ params: salesIdParamsSchema }),
    controller.getInvoice,
  );
  router.post(
    '/payment-receipts',
    authorize(ROLES.ADMIN, ROLES.ACCOUNTING),
    validate({ body: createPaymentReceiptSchema }),
    controller.createPaymentReceipt,
  );
  return router;
}
