import type { SignOptions } from 'jsonwebtoken';
import { env } from './env.config';

type JwtDuration = NonNullable<SignOptions['expiresIn']>;

export const jwtConfig = {
  algorithm: 'HS256',
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
  access: {
    secret: env.JWT_ACCESS_SECRET,
    // Format is enforced by the duration rule in env.config.ts.
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as JwtDuration,
  },
  refresh: {
    secret: env.JWT_REFRESH_SECRET,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as JwtDuration,
  },
} as const;
