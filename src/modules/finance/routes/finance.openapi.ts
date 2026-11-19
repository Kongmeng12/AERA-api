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
import { supplierBillResponseSchema, supplierPaymentResponseSchema } from '../dto/finance.dto';
import {
  createSupplierBillSchema,
  createSupplierPaymentSchema,
  financeIdParamsSchema,
  listSupplierBillsQuerySchema,
} from '../validators/finance.validator';

const security = [{ [bearerAuth.name]: [] }];
const billPageSchema = z.object({
  items: z.array(supplierBillResponseSchema),
  pagination: paginationMetaSchema,
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/supplier-bills',
  tags: ['Finance'],
  security,
  summary: 'List supplier bills',
  request: { query: listSupplierBillsQuerySchema },
  responses: {
    200: successResponse('Successfully retrieved supplier bills', billPageSchema),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/supplier-bills/{id}',
  tags: ['Finance'],
  security,
  summary: 'Get supplier bill by ID',
  request: { params: financeIdParamsSchema },
  responses: {
    200: successResponse('Successfully retrieved supplier bill', supplierBillResponseSchema),
    ...commonErrors,
    404: errorResponse('Supplier bill not found'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/supplier-bills',
  tags: ['Finance'],
  security,
  summary: 'Create a matched supplier bill draft',
  description:
    'Requires role: admin or accounting. Every bill line is matched to accepted PO receipt quantities.',
  request: { body: jsonBody(createSupplierBillSchema) },
  responses: {
    201: successResponse('Successfully created supplier bill draft', supplierBillResponseSchema),
    ...commonErrors,
    409: errorResponse('Bill number conflict or receipt/PO quantity conflict'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/supplier-bills/{id}/post',
  tags: ['Finance'],
  security,
  summary: 'Post a matched supplier bill',
  description:
    'Requires role: admin, accounting or manager. Each bill line must be fully matched to accepted receipt quantities.',
  request: { params: financeIdParamsSchema },
  responses: {
    200: successResponse('Successfully posted supplier bill', supplierBillResponseSchema),
    ...commonErrors,
    404: errorResponse('Supplier bill not found'),
    409: errorResponse('Bill is not a draft or its receipt matches are invalid'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/supplier-payments',
  tags: ['Finance'],
  security,
  summary: 'Record a supplier payment receipt and allocate it to bills',
  description:
    'Requires role: admin or accounting. Allocations must equal the payment; partial bill allocations are allowed and cannot exceed bill balances.',
  request: { body: jsonBody(createSupplierPaymentSchema) },
  responses: {
    201: successResponse(
      'Successfully recorded supplier payment receipt',
      supplierPaymentResponseSchema,
    ),
    ...commonErrors,
    409: errorResponse('Payment number conflict or allocation exceeds a supplier bill balance'),
    422: errorResponse('Validation failed'),
  },
});
