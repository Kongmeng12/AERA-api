import type { RequestHandler } from 'express';
import { ForbiddenError } from '../../core/exceptions/app-error';
import { ERROR_CODES } from '../constants/error-codes';
import type { RoleName } from '../constants/roles';
import { requireIdentity } from './authenticate.guard';

export function authorize(...allowedRoles: RoleName[]): RequestHandler {
  return (req, _res, next) => {
    if (!allowedRoles.includes(requireIdentity(req).role)) {
      throw new ForbiddenError(
        ERROR_CODES.AUTH_FORBIDDEN,
        'You do not have permission for this action',
      );
    }
    next();
  };
}
