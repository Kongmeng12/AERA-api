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
import { salesReturnResponseSchema } from '../dto/returns.dto';
import {
  approveSalesReturnSchema,
  createSalesReturnSchema,
  listReturnsQuerySchema,
  rejectSalesReturnSchema,
  returnIdParamsSchema,
} from '../validators/returns.validator';

const security = [{ [bearerAuth.name]: [] }];
const page = z.object({
  items: z.array(salesReturnResponseSchema),
  pagination: paginationMetaSchema,
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/sales-returns',
  tags: ['Returns'],
  security,
  summary: 'List customer sales returns',
  request: { query: listReturnsQuerySchema },
  responses: {
    200: successResponse('Successfully retrieved sales returns', page),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/sales-returns/{id}',
  tags: ['Returns'],
  security,
  summary: 'Get customer sales return',
  request: { params: returnIdParamsSchema },
  responses: {
    200: successResponse('Successfully retrieved sales return', salesReturnResponseSchema),
    ...commonErrors,
    404: errorResponse('Sales return not found'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/sales-returns',
  tags: ['Returns'],
  security,
  summary: 'Create a customer return request',
  description:
    'Requires role: admin, manager or sales. Return quantities reserve invoice quantity.',
  request: { body: jsonBody(createSalesReturnSchema) },
  responses: {
    201: successResponse('Successfully created sales return request', salesReturnResponseSchema),
    ...commonErrors,
    409: errorResponse('Invoice is not returnable or quantities conflict'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/sales-returns/{id}/approve',
  tags: ['Returns'],
  security,
  summary: 'Approve a customer return and issue a credit note',
  description:
    'Requires role: admin or manager. Returned quantities are recorded as available stock; physical QC is handled outside this API.',
  request: {
    params: returnIdParamsSchema,
    body: jsonBody(approveSalesReturnSchema),
  },
  responses: {
    200: successResponse('Successfully approved sales return', salesReturnResponseSchema),
    ...commonErrors,
    404: errorResponse('Sales return not found'),
    409: errorResponse('Return state, invoice quantity or delivered stock conflicts'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/sales-returns/{id}/reject',
  tags: ['Returns'],
  security,
  summary: 'Reject a customer return request',
  description: 'Requires role: admin or manager.',
  request: {
    params: returnIdParamsSchema,
    body: jsonBody(rejectSalesReturnSchema),
  },
  responses: {
    200: successResponse('Successfully rejected sales return request', salesReturnResponseSchema),
    ...commonErrors,
    404: errorResponse('Sales return not found'),
    409: errorResponse('Only draft returns can be rejected'),
  },
});
