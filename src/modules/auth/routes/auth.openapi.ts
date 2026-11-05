import { z } from 'zod';
import {
  bearerAuth,
  errorResponse,
  jsonBody,
  openApiRegistry,
  successResponse,
} from '../../../shared/openapi/registry';
import { userResponseSchema } from '../../users/dto/user-response.dto';
import { tokenPairSchema } from '../dto/auth-response.dto';
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
} from '../validators/auth.validator';

const tags = ['Auth'];
const tokenExample = {
  tokenType: 'Bearer',
  accessToken: 'eyJhbGciOi...',
  refreshToken: 'eyJhbGciOi...',
};

openApiRegistry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags,
  summary: 'Log in with email and password',
  description:
    'Public. Rate limited. An account locks for 15 minutes after 5 wrong passwords; every failure returns the same 401.',
  request: {
    body: jsonBody(loginSchema, { email: 'somchai@example.com', password: 'a-long-passphrase' }),
  },
  responses: {
    200: successResponse('Successfully logged in', tokenPairSchema, tokenExample),
    401: errorResponse('Invalid email or password'),
    422: errorResponse('Validation failed'),
    429: errorResponse('Too many requests'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/auth/refresh',
  tags,
  summary: 'Rotate a refresh token and get a new token pair',
  description:
    'Public. Rate limited. Each refresh token works once; reusing one revokes the whole session.',
  request: { body: jsonBody(refreshSchema, { refreshToken: 'eyJhbGciOi...' }) },
  responses: {
    200: successResponse('Successfully refreshed tokens', tokenPairSchema, tokenExample),
    401: errorResponse('Refresh token is invalid, expired or reused'),
    422: errorResponse('Validation failed'),
    429: errorResponse('Too many requests'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/auth/logout',
  tags,
  summary: 'Revoke the session that owns a refresh token',
  description:
    'Public, so that a client with an expired access token can still log out. Idempotent.',
  request: { body: jsonBody(logoutSchema, { refreshToken: 'eyJhbGciOi...' }) },
  responses: {
    200: successResponse('Successfully logged out', z.null(), null),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/auth/me',
  tags,
  summary: 'Get the current user',
  description: 'Requires any authenticated user.',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: successResponse('Successfully retrieved current user', userResponseSchema),
    401: errorResponse('Missing, invalid or expired access token'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/auth/change-password',
  tags,
  summary: 'Change your password',
  description: 'Requires any authenticated user. Rate limited. Revokes all of your refresh tokens.',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: jsonBody(changePasswordSchema, {
      currentPassword: 'a-long-passphrase',
      newPassword: 'a-new-long-passphrase',
    }),
  },
  responses: {
    200: successResponse('Successfully changed password', z.null(), null),
    401: errorResponse('Missing or invalid token, or wrong current password'),
    422: errorResponse('Validation failed'),
    429: errorResponse('Too many requests'),
  },
});
