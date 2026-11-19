import { Router } from 'express';
import { ROLES } from '../../../shared/constants/roles';
import { authenticate } from '../../../shared/guards/authenticate.guard';
import { authorize } from '../../../shared/guards/authorize.guard';
import { validate } from '../../../shared/middlewares/validate.middleware';
import type { DeliveryController } from '../controllers/delivery.controller';
import {
  completeDeliverySchema,
  createDeliverySchema,
  deliveryIdParamsSchema,
  listDeliveriesQuerySchema,
} from '../validators/delivery.validator';

export function createDeliveryRouter(controller: DeliveryController): Router {
  const router = Router();
  const canRead = authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.WAREHOUSE, ROLES.DRIVER);
  router.use(authenticate);
  router.get(
    '/deliveries',
    canRead,
    validate({ query: listDeliveriesQuerySchema }),
    controller.list,
  );
  router.get(
    '/deliveries/:id',
    canRead,
    validate({ params: deliveryIdParamsSchema }),
    controller.get,
  );
  router.post(
    '/deliveries',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE),
    validate({ body: createDeliverySchema }),
    controller.create,
  );
  router.post(
    '/deliveries/:id/dispatch',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE, ROLES.DRIVER),
    validate({ params: deliveryIdParamsSchema }),
    controller.dispatch,
  );
  router.post(
    '/deliveries/:id/complete',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE, ROLES.DRIVER),
    validate({ params: deliveryIdParamsSchema, body: completeDeliverySchema }),
    controller.complete,
  );
  return router;
}
