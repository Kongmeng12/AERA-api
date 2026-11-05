import { z } from 'zod';
import {
  bearerAuth,
  commonErrors,
  errorResponse,
  jsonBody,
  openApiRegistry,
  paginationMetaSchema,
  successResponse,
} from '../../../shared/openapi/registry';
import { userResponseSchema } from '../dto/user-response.dto';
import {
  createUserSchema,
  listUsersQuerySchema,
  patchUserSchema,
  replaceUserSchema,
  userIdParamsSchema,
} from '../validators/user.validator';

const security = [{ [bearerAuth.name]: [] }];
const tags = ['Users'];
const userExample = {
  id: 2,
  username: 'somchai',
  email: 'somchai@example.com',
  status: 'active',
  role: { id: 3, name: 'staff' },
  createdAt: '2026-01-15T08:30:00.000Z',
  updatedAt: '2026-01-15T08:30:00.000Z',
};
const updateResponses = {
  200: successResponse('Successfully updated user', userResponseSchema, userExample),
  ...commonErrors,
  404: errorResponse('User not found'),
  409: errorResponse('Username or email already exists'),
  422: errorResponse('Validation failed'),
};

openApiRegistry.registerPath({
  method: 'get',
  path: '/users',
  tags,
  security,
  summary: 'List users with search, filters, sorting and pagination',
  description: 'Requires role: admin or manager.',
  request: { query: listUsersQuerySchema },
  responses: {
    200: successResponse(
      'Successfully retrieved users',
      z.object({ items: z.array(userResponseSchema), pagination: paginationMetaSchema }),
      { items: [userExample], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
    ),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/users/{id}',
  tags,
  security,
  summary: 'Get a user by ID',
  description: 'Requires role: admin or manager.',
  request: { params: userIdParamsSchema },
  responses: {
    200: successResponse('Successfully retrieved user', userResponseSchema, userExample),
    ...commonErrors,
    404: errorResponse('User not found'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/users',
  tags,
  security,
  summary: 'Create a user',
  description: 'Requires role: admin.',
  request: {
    body: jsonBody(createUserSchema, {
      username: 'somchai',
      email: 'somchai@example.com',
      password: 'a-long-passphrase',
      roleId: 3,
    }),
  },
  responses: {
    201: successResponse('Successfully created user', userResponseSchema, userExample),
    ...commonErrors,
    409: errorResponse('Username or email already exists'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'put',
  path: '/users/{id}',
  tags,
  security,
  summary: 'Replace a user',
  description: 'Requires role: admin. You cannot change your own role or status.',
  request: {
    params: userIdParamsSchema,
    body: jsonBody(replaceUserSchema, {
      username: 'somchai',
      email: 'somchai@example.com',
      roleId: 2,
      status: 'active',
    }),
  },
  responses: updateResponses,
});

openApiRegistry.registerPath({
  method: 'patch',
  path: '/users/{id}',
  tags,
  security,
  summary: 'Partially update a user, including status management',
  description: 'Requires role: admin. You cannot change your own role or status.',
  request: {
    params: userIdParamsSchema,
    body: jsonBody(patchUserSchema, { status: 'suspended' }),
  },
  responses: updateResponses,
});

openApiRegistry.registerPath({
  method: 'delete',
  path: '/users/{id}',
  tags,
  security,
  summary: 'Soft-delete a user',
  description: 'Requires role: admin. You cannot delete your own account.',
  request: { params: userIdParamsSchema },
  responses: {
    204: { description: 'User deleted' },
    ...commonErrors,
    404: errorResponse('User not found'),
    422: errorResponse('Validation failed'),
  },
});
