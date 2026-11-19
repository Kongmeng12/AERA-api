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
  createStockCountSchema,
  createStockTransferSchema,
  createStockWriteoffSchema,
  listStockCountsQuerySchema,
  listStockTransfersQuerySchema,
  listStockWriteoffsQuerySchema,
  receiveStockTransferSchema,
  rejectStockWriteoffSchema,
  stockOperationIdParamsSchema,
} from '../validators/stock-operations.validator';

const security = [{ [bearerAuth.name]: [] }];
const transferSchema = z.object({
  id: z.number(),
  transferNumber: z.string(),
  fromWarehouseId: z.number(),
  fromZoneId: z.number().nullable(),
  toWarehouseId: z.number(),
  toZoneId: z.number().nullable(),
  requestedById: z.number(),
  requestedAt: z.string(),
  completedAt: z.string().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  lines: z.array(
    z.object({
      id: z.number(),
      lineNumber: z.number(),
      itemId: z.number(),
      batchId: z.number().nullable(),
      unitId: z.number(),
      quantity: z.string(),
      receivedQuantity: z.string(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const countSchema = z.object({
  id: z.number(),
  countNumber: z.string(),
  warehouseId: z.number(),
  zoneId: z.number().nullable(),
  startedById: z.number(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  approvedById: z.number().nullable(),
  status: z.string(),
  lines: z.array(
    z.object({
      id: z.number(),
      lineNumber: z.number(),
      itemId: z.number(),
      batchId: z.number().nullable(),
      unitId: z.number(),
      expectedQuantity: z.string(),
      countedQuantity: z.string(),
      discrepancyReason: z.string().nullable(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const writeoffSchema = z.object({
  id: z.number(),
  writeoffNumber: z.string(),
  requestedById: z.number(),
  approvedById: z.number().nullable(),
  requestedAt: z.string(),
  status: z.string(),
  reason: z.string(),
  lines: z.array(
    z.object({
      id: z.number(),
      lineNumber: z.number(),
      itemId: z.number(),
      batchId: z.number().nullable(),
      unitId: z.number(),
      quantity: z.string(),
      reason: z.string(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function registerList(
  path: string,
  summary: string,
  query: z.ZodObject<z.ZodRawShape>,
  schema: z.ZodType,
): void {
  openApiRegistry.registerPath({
    method: 'get',
    path,
    tags: ['Inventory Operations'],
    security,
    summary,
    request: { query },
    responses: {
      200: successResponse(
        `Successfully retrieved ${summary.toLowerCase()}`,
        z.object({ items: z.array(schema), pagination: paginationMetaSchema }),
      ),
      ...commonErrors,
      422: errorResponse('Validation failed'),
    },
  });
}

registerList(
  '/inventory/transfers',
  'List stock transfers',
  listStockTransfersQuerySchema,
  transferSchema,
);
registerList('/inventory/counts', 'List stock counts', listStockCountsQuerySchema, countSchema);
registerList(
  '/inventory/writeoffs',
  'List stock write-offs',
  listStockWriteoffsQuerySchema,
  writeoffSchema,
);

for (const resource of [
  { path: '/inventory/transfers/{id}', name: 'stock transfer', schema: transferSchema },
  { path: '/inventory/counts/{id}', name: 'stock count', schema: countSchema },
  { path: '/inventory/writeoffs/{id}', name: 'stock write-off', schema: writeoffSchema },
]) {
  openApiRegistry.registerPath({
    method: 'get',
    path: resource.path,
    tags: ['Inventory Operations'],
    security,
    summary: `Get ${resource.name}`,
    request: { params: stockOperationIdParamsSchema },
    responses: {
      200: successResponse(`Successfully retrieved ${resource.name}`, resource.schema),
      ...commonErrors,
      404: errorResponse(`${resource.name} not found`),
    },
  });
}

openApiRegistry.registerPath({
  method: 'post',
  path: '/inventory/transfers',
  tags: ['Inventory Operations'],
  security,
  summary: 'Create a stock transfer draft',
  description: 'Stock is moved out of the source location only when the transfer is dispatched.',
  request: { body: jsonBody(createStockTransferSchema) },
  responses: {
    201: successResponse('Successfully created stock transfer', transferSchema),
    ...commonErrors,
    409: errorResponse('Transfer number or warehouse conflict'),
    422: errorResponse('Validation failed'),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/inventory/transfers/{id}/dispatch',
  tags: ['Inventory Operations'],
  security,
  summary: 'Dispatch a stock transfer',
  description: 'Decrements available source stock and records dispatch movements atomically.',
  request: { params: stockOperationIdParamsSchema },
  responses: {
    200: successResponse('Successfully dispatched stock transfer', transferSchema),
    ...commonErrors,
    409: errorResponse('Transfer state or source stock conflict'),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/inventory/transfers/{id}/receive',
  tags: ['Inventory Operations'],
  security,
  summary: 'Receive stock transfer quantities',
  description: 'Partial receipts are allowed; received stock is added to the destination zone.',
  request: {
    params: stockOperationIdParamsSchema,
    body: jsonBody(receiveStockTransferSchema),
  },
  responses: {
    200: successResponse('Successfully received stock transfer quantities', transferSchema),
    ...commonErrors,
    409: errorResponse('Transfer state or received quantity conflict'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/inventory/counts',
  tags: ['Inventory Operations'],
  security,
  summary: 'Record a stock count snapshot',
  description:
    'Captures expected and counted quantities for available stock in a zone. A manager or admin must approve any adjustment.',
  request: { body: jsonBody(createStockCountSchema) },
  responses: {
    201: successResponse('Successfully recorded stock count for approval', countSchema),
    ...commonErrors,
    409: errorResponse('Count number or stock snapshot conflict'),
    422: errorResponse('Validation failed'),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/inventory/counts/{id}/approve',
  tags: ['Inventory Operations'],
  security,
  summary: 'Approve a stock count and apply adjustments',
  description:
    'Approval fails if stock moved after the snapshot, requiring the count to be repeated.',
  request: { params: stockOperationIdParamsSchema },
  responses: {
    200: successResponse('Successfully approved stock count', countSchema),
    ...commonErrors,
    409: errorResponse('Stock count is stale or no longer pending approval'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/inventory/writeoffs',
  tags: ['Inventory Operations'],
  security,
  summary: 'Request a stock write-off',
  description: 'Requests must be approved by an admin or manager before stock is deducted.',
  request: { body: jsonBody(createStockWriteoffSchema) },
  responses: {
    201: successResponse('Successfully submitted stock write-off for approval', writeoffSchema),
    ...commonErrors,
    409: errorResponse('Write-off number or available stock conflict'),
    422: errorResponse('Validation failed'),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/inventory/writeoffs/{id}/approve',
  tags: ['Inventory Operations'],
  security,
  summary: 'Approve a stock write-off',
  description:
    'The requester cannot approve their own request. Available stock is revalidated and deducted atomically.',
  request: { params: stockOperationIdParamsSchema },
  responses: {
    200: successResponse('Successfully approved stock write-off', writeoffSchema),
    ...commonErrors,
    409: errorResponse('Write-off state or available stock conflict'),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/inventory/writeoffs/{id}/reject',
  tags: ['Inventory Operations'],
  security,
  summary: 'Reject a stock write-off',
  request: {
    params: stockOperationIdParamsSchema,
    body: jsonBody(rejectStockWriteoffSchema),
  },
  responses: {
    200: successResponse('Successfully rejected stock write-off', writeoffSchema),
    ...commonErrors,
    409: errorResponse('Only pending write-offs can be rejected'),
    422: errorResponse('Validation failed'),
  },
});
