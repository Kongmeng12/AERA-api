import { Router } from 'express';
import { ROLES } from '../../../shared/constants/roles';
import { authenticate } from '../../../shared/guards/authenticate.guard';
import { authorize } from '../../../shared/guards/authorize.guard';
import { validate } from '../../../shared/middlewares/validate.middleware';
import type { ProductionController } from '../controllers/production.controller';
import {
  createBomSchema,
  createProductionOrderSchema,
  issueMaterialsSchema,
  listBomsQuerySchema,
  listProductionOrdersQuerySchema,
  productionIdParamsSchema,
  recordOutputSchema,
} from '../validators/production.validator';

export function createProductionRouter(controller: ProductionController): Router {
  const router = Router();
  router.use(authenticate);
  router.get(
    '/bills-of-materials',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE, ROLES.QC),
    validate({ query: listBomsQuerySchema }),
    controller.listBoms,
  );
  router.get(
    '/bills-of-materials/:id',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE, ROLES.QC),
    validate({ params: productionIdParamsSchema }),
    controller.getBom,
  );
  router.post(
    '/bills-of-materials',
    authorize(ROLES.ADMIN, ROLES.MANAGER),
    validate({ body: createBomSchema }),
    controller.createBom,
  );
  router.post(
    '/bills-of-materials/:id/activate',
    authorize(ROLES.ADMIN, ROLES.MANAGER),
    validate({ params: productionIdParamsSchema }),
    controller.activateBom,
  );
  router.get(
    '/orders',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE, ROLES.QC),
    validate({ query: listProductionOrdersQuerySchema }),
    controller.listOrders,
  );
  router.get(
    '/orders/:id',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE, ROLES.QC),
    validate({ params: productionIdParamsSchema }),
    controller.getOrder,
  );
  router.post(
    '/orders',
    authorize(ROLES.ADMIN, ROLES.MANAGER),
    validate({ body: createProductionOrderSchema }),
    controller.createOrder,
  );
  router.post(
    '/orders/:id/material-issues',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE),
    validate({ params: productionIdParamsSchema, body: issueMaterialsSchema }),
    controller.issueMaterials,
  );
  router.post(
    '/orders/:id/outputs',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE),
    validate({ params: productionIdParamsSchema, body: recordOutputSchema }),
    controller.recordOutput,
  );
  return router;
}
