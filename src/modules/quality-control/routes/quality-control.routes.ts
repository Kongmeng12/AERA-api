import { Router } from 'express';
import { ROLES } from '../../../shared/constants/roles';
import { authenticate } from '../../../shared/guards/authenticate.guard';
import { authorize } from '../../../shared/guards/authorize.guard';
import { validate } from '../../../shared/middlewares/validate.middleware';
import type { QualityControlController } from '../controllers/quality-control.controller';
import {
  createInspectionSchema,
  createTestDefinitionSchema,
  listInspectionsQuerySchema,
  listTestDefinitionsQuerySchema,
  qcIdParamsSchema,
} from '../validators/quality-control.validator';

export function createQualityControlRouter(controller: QualityControlController): Router {
  const router = Router();
  router.use(authenticate);
  router.get(
    '/test-definitions',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.QC, ROLES.WAREHOUSE),
    validate({ query: listTestDefinitionsQuerySchema }),
    controller.listTestDefinitions,
  );
  router.post(
    '/test-definitions',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.QC),
    validate({ body: createTestDefinitionSchema }),
    controller.createTestDefinition,
  );
  router.get(
    '/inspections',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.QC, ROLES.WAREHOUSE),
    validate({ query: listInspectionsQuerySchema }),
    controller.listInspections,
  );
  router.get(
    '/inspections/:id',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.QC, ROLES.WAREHOUSE),
    validate({ params: qcIdParamsSchema }),
    controller.getInspection,
  );
  router.post(
    '/inspections',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.QC),
    validate({ body: createInspectionSchema }),
    controller.createInspection,
  );
  router.post(
    '/inspections/:id/release',
    authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.QC),
    validate({ params: qcIdParamsSchema }),
    controller.releaseInspection,
  );
  return router;
}
