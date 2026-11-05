import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { jwtConfig } from '../../config/jwt.config';
import { UnauthorizedError } from '../../core/exceptions/app-error';
import { ERROR_CODES } from '../constants/error-codes';
import { ROLE_NAMES, type RoleName } from '../constants/roles';

export interface AccessIdentity {
  userId: number;
  role: RoleName;
}

const claimsSchema = z.object({
  sub: z.string().regex(/^[1-9]\d*$/),
  role: z.enum(ROLE_NAMES),
});

export function signAccessToken(identity: AccessIdentity): string {
  return jwt.sign({ role: identity.role }, jwtConfig.access.secret, {
    algorithm: jwtConfig.algorithm,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    subject: String(identity.userId),
    expiresIn: jwtConfig.access.expiresIn,
  });
}

export function verifyAccessToken(token: string): AccessIdentity {
  let payload: unknown;
  try {
    payload = jwt.verify(token, jwtConfig.access.secret, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError(ERROR_CODES.AUTH_TOKEN_EXPIRED, 'Access token has expired');
    }
    throw new UnauthorizedError(ERROR_CODES.AUTH_UNAUTHORIZED, 'Invalid access token');
  }

  const claims = claimsSchema.safeParse(payload);
  if (!claims.success) {
    throw new UnauthorizedError(ERROR_CODES.AUTH_UNAUTHORIZED, 'Invalid access token');
  }
  return { userId: Number(claims.data.sub), role: claims.data.role };
}
