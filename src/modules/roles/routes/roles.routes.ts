import { Router } from 'express';
import { ROLES } from '../../../shared/constants/roles';
import { authenticate } from '../../../shared/guards/authenticate.guard';
import { authorize } from '../../../shared/guards/authorize.guard';
import type { RolesController } from '../controllers/roles.controller';

export function createRolesRouter(controller: RolesController): Router {
  const router = Router();
  router.get('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), controller.list);
  return router;
}
