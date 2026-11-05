import { Router } from 'express';
import { appConfig } from '../../../config/app.config';
import { authenticate } from '../../../shared/guards/authenticate.guard';
import { createRateLimiter } from '../../../shared/middlewares/rate-limit.middleware';
import { validate } from '../../../shared/middlewares/validate.middleware';
import type { AuthController } from '../controllers/auth.controller';
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
} from '../validators/auth.validator';

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();
  const credentialLimiter = createRateLimiter(appConfig.rateLimit.authMax);
  const tokenLimiter = createRateLimiter(appConfig.rateLimit.authMax);

  router.post('/login', credentialLimiter, validate({ body: loginSchema }), controller.login);
  router.post('/refresh', tokenLimiter, validate({ body: refreshSchema }), controller.refresh);
  router.post('/logout', validate({ body: logoutSchema }), controller.logout);
  router.get('/me', authenticate, controller.me);
  router.post(
    '/change-password',
    credentialLimiter,
    authenticate,
    validate({ body: changePasswordSchema }),
    controller.changePassword,
  );
  return router;
}
