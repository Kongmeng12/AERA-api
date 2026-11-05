import { Router } from 'express';
import { ROLES } from '../../../shared/constants/roles';
import { authenticate } from '../../../shared/guards/authenticate.guard';
import { authorize } from '../../../shared/guards/authorize.guard';
import { validate } from '../../../shared/middlewares/validate.middleware';
import type { UsersController } from '../controllers/users.controller';
import {
  createUserSchema,
  listUsersQuerySchema,
  patchUserSchema,
  replaceUserSchema,
  userIdParamsSchema,
} from '../validators/user.validator';

export function createUsersRouter(controller: UsersController): Router {
  const router = Router();
  const canRead = authorize(ROLES.ADMIN, ROLES.MANAGER);
  const canWrite = authorize(ROLES.ADMIN);
  const params = userIdParamsSchema;

  router.use(authenticate);
  router.get('/', canRead, validate({ query: listUsersQuerySchema }), controller.list);
  router.get('/:id', canRead, validate({ params }), controller.getById);
  router.post('/', canWrite, validate({ body: createUserSchema }), controller.create);
  router.put('/:id', canWrite, validate({ params, body: replaceUserSchema }), controller.update);
  router.patch('/:id', canWrite, validate({ params, body: patchUserSchema }), controller.update);
  router.delete('/:id', canWrite, validate({ params }), controller.remove);
  return router;
}
