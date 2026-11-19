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
import {
  paymentReceiptResponseSchema,
  salesInvoiceResponseSchema,
  salesOrderResponseSchema,
  salesPriceResponseSchema,
} from '../dto/sales.dto';
import {
  createPaymentReceiptSchema,
  createSalesOrderSchema,
  createSalesPriceSchema,
  listSalesInvoicesQuerySchema,
  listSalesOrdersQuerySchema,
  listSalesPricesQuerySchema,
  salesIdParamsSchema,
  salesOrderCancellationSchema,
} from '../validators/sales.validator';

const security = [{ [bearerAuth.name]: [] }];
const page = (schema: z.ZodType) =>
  z.object({ items: z.array(schema), pagination: paginationMetaSchema });

openApiRegistry.registerPath({
  method: 'get',
  path: '/sales-orders',
  tags: ['Sales'],
  security,
  summary: 'List sales orders',
  request: { query: listSalesOrdersQuerySchema },
  responses: {
    200: successResponse('Successfully retrieved sales orders', page(salesOrderResponseSchema)),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/sales-orders/{id}',
  tags: ['Sales'],
  security,
  summary: 'Get sales order by ID',
  request: { params: salesIdParamsSchema },
  responses: {
    200: successResponse('Successfully retrieved sales order', salesOrderResponseSchema),
    ...commonErrors,
    404: errorResponse('Sales order not found'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/sales-orders',
  tags: ['Sales'],
  security,
  summary: 'Create a sales order',
  description: 'Requires role: admin or sales. Uses the active customer/item price list.',
  request: { body: jsonBody(createSalesOrderSchema) },
  responses: {
    201: successResponse('Successfully created sales order', salesOrderResponseSchema),
    ...commonErrors,
    409: errorResponse('Sales order number conflict or base stock unavailable'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/sales-orders/{id}/approve',
  tags: ['Sales'],
  security,
  summary: 'Approve a sales order and reserve stock',
  description:
    'Requires role: admin or manager. Reserves the full quantity from active available stock.',
  request: { params: salesIdParamsSchema },
  responses: {
    200: successResponse(
      'Successfully approved sales order and reserved inventory',
      salesOrderResponseSchema,
    ),
    ...commonErrors,
    404: errorResponse('Sales order not found'),
    409: errorResponse('Order is not pending or stock is insufficient'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/sales-orders/{id}/cancel',
  tags: ['Sales'],
  security,
  summary: 'Cancel a sales order awaiting approval',
  request: {
    params: salesIdParamsSchema,
    body: jsonBody(salesOrderCancellationSchema),
  },
  responses: {
    204: { description: 'Sales order cancelled' },
    ...commonErrors,
    404: errorResponse('Sales order not found'),
    409: errorResponse('Only orders awaiting approval can be cancelled'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/sales-prices',
  tags: ['Sales'],
  security,
  summary: 'List sales prices',
  request: { query: listSalesPricesQuerySchema },
  responses: {
    200: successResponse('Successfully retrieved sales prices', page(salesPriceResponseSchema)),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/sales-prices',
  tags: ['Sales'],
  security,
  summary: 'Create a sales price',
  description: 'Requires role: admin.',
  request: { body: jsonBody(createSalesPriceSchema) },
  responses: {
    201: successResponse('Successfully created sales price', salesPriceResponseSchema),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/sales-invoices',
  tags: ['Sales'],
  security,
  summary: 'List sales invoices',
  request: { query: listSalesInvoicesQuerySchema },
  responses: {
    200: successResponse('Successfully retrieved sales invoices', page(salesInvoiceResponseSchema)),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/sales-invoices/{id}',
  tags: ['Sales'],
  security,
  summary: 'Get sales invoice by ID',
  request: { params: salesIdParamsSchema },
  responses: {
    200: successResponse('Successfully retrieved sales invoice', salesInvoiceResponseSchema),
    ...commonErrors,
    404: errorResponse('Sales invoice not found'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/payment-receipts',
  tags: ['Sales'],
  security,
  summary: 'Record a customer payment and allocate it to invoices',
  description:
    'Requires role: admin or accounting. Allocations must equal the receipt and cannot exceed invoice balances.',
  request: { body: jsonBody(createPaymentReceiptSchema) },
  responses: {
    201: successResponse('Successfully recorded payment receipt', paymentReceiptResponseSchema),
    ...commonErrors,
    409: errorResponse('Invoice cannot receive payment or allocation exceeds balance'),
    422: errorResponse('Validation failed'),
  },
});
