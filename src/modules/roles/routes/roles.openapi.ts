import { z } from 'zod';
import {
  bearerAuth,
  commonErrors,
  openApiRegistry,
  successResponse,
} from '../../../shared/openapi/registry';
import { roleResponseSchema } from '../dto/role-response.dto';

openApiRegistry.registerPath({
  method: 'get',
  path: '/roles',
  tags: ['Roles'],
  summary: 'List roles',
  description: 'Requires role: admin or manager.',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: successResponse('Successfully retrieved roles', z.array(roleResponseSchema), [
      { id: 1, name: 'admin', description: 'Full access' },
    ]),
    ...commonErrors,
  },
});
