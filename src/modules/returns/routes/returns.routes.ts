import { Router } from 'express';
import { ROLES } from '../../../shared/constants/roles';
import { authenticate } from '../../../shared/guards/authenticate.guard';
import { authorize } from '../../../shared/guards/authorize.guard';
import { validate } from '../../../shared/middlewares/validate.middleware';
import type { ReturnsController } from '../controllers/returns.controller';
import {
  approveSalesReturnSchema,
  createSalesReturnSchema,
  listReturnsQuerySchema,
  rejectSalesReturnSchema,
  returnIdParamsSchema,
} from '../validators/returns.validator';

export function createReturnsRouter(controller: ReturnsController): Router {
  const router = Router();
  router.use(authenticate);
  router.get(
    '/sales-returns',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.ACCOUNTING),
    validate({ query: listReturnsQuerySchema }),
    controller.list,
  );
  router.get(
    '/sales-returns/:id',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.ACCOUNTING),
    validate({ params: returnIdParamsSchema }),
    controller.get,
  );
  router.post(
    '/sales-returns',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES),
    validate({ body: createSalesReturnSchema }),
    controller.create,
  );
  router.post(
    '/sales-returns/:id/approve',
    authorize(ROLES.ADMIN, ROLES.MANAGER),
    validate({ params: returnIdParamsSchema, body: approveSalesReturnSchema }),
    controller.approve,
  );
  router.post(
    '/sales-returns/:id/reject',
    authorize(ROLES.ADMIN, ROLES.MANAGER),
    validate({ params: returnIdParamsSchema, body: rejectSalesReturnSchema }),
    controller.reject,
  );
  return router;
}
