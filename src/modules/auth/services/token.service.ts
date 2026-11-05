import { createHash, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../../config/jwt.config';
import { UnauthorizedError } from '../../../core/exceptions/app-error';
import { ERROR_CODES } from '../../../shared/constants/error-codes';

export interface SignedRefreshToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export class TokenService {
  signRefreshToken(userId: number): SignedRefreshToken {
    const token = jwt.sign({}, jwtConfig.refresh.secret, {
      algorithm: jwtConfig.algorithm,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      subject: String(userId),
      jwtid: randomUUID(),
      expiresIn: jwtConfig.refresh.expiresIn,
    });
    const { exp } = jwt.decode(token) as { exp: number };
    return { token, tokenHash: this.hash(token), expiresAt: new Date(exp * 1000) };
  }

  /** Throws when the signature, claims or expiry are invalid. */
  verifyRefreshToken(token: string): void {
    try {
      jwt.verify(token, jwtConfig.refresh.secret, {
        algorithms: [jwtConfig.algorithm],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      });
    } catch {
      throw new UnauthorizedError(
        ERROR_CODES.AUTH_REFRESH_INVALID,
        'Refresh token is invalid or expired',
      );
    }
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
