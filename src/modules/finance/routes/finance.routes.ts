import { Router } from 'express';
import { ROLES } from '../../../shared/constants/roles';
import { authenticate } from '../../../shared/guards/authenticate.guard';
import { authorize } from '../../../shared/guards/authorize.guard';
import { validate } from '../../../shared/middlewares/validate.middleware';
import type { FinanceController } from '../controllers/finance.controller';
import {
  createSupplierBillSchema,
  createSupplierPaymentSchema,
  financeIdParamsSchema,
  listSupplierBillsQuerySchema,
} from '../validators/finance.validator';

export function createFinanceRouter(controller: FinanceController): Router {
  const router = Router();
  const canRead = authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PURCHASING, ROLES.ACCOUNTING);
  router.use(authenticate);
  router.get(
    '/supplier-bills',
    canRead,
    validate({ query: listSupplierBillsQuerySchema }),
    controller.listSupplierBills,
  );
  router.get(
    '/supplier-bills/:id',
    canRead,
    validate({ params: financeIdParamsSchema }),
    controller.getSupplierBill,
  );
  router.post(
    '/supplier-bills',
    authorize(ROLES.ADMIN, ROLES.ACCOUNTING),
    validate({ body: createSupplierBillSchema }),
    controller.createSupplierBill,
  );
  router.post(
    '/supplier-bills/:id/post',
    authorize(ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.MANAGER),
    validate({ params: financeIdParamsSchema }),
    controller.postSupplierBill,
  );
  router.post(
    '/supplier-payments',
    authorize(ROLES.ADMIN, ROLES.ACCOUNTING),
    validate({ body: createSupplierPaymentSchema }),
    controller.createSupplierPayment,
  );
  return router;
}
