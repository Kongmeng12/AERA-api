import type { Request, RequestHandler } from 'express';
import { UnauthorizedError } from '../../core/exceptions/app-error';
import { ERROR_CODES } from '../constants/error-codes';
import { verifyAccessToken, type AccessIdentity } from '../helpers/access-token';

export const authenticate: RequestHandler = (req, _res, next) => {
  const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization ?? '');
  if (!match) {
    throw new UnauthorizedError(ERROR_CODES.AUTH_UNAUTHORIZED, 'Missing or malformed bearer token');
  }
  req.auth = verifyAccessToken(match[1]);
  next();
};

/** Returns the verified identity for a route protected by `authenticate`. */
export function requireIdentity(req: Request): AccessIdentity {
  if (!req.auth) {
    throw new UnauthorizedError(ERROR_CODES.AUTH_UNAUTHORIZED, 'Authentication required');
  }
  return req.auth;
}
