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
import type { BomResponseDto, ProductionOrderResponseDto } from '../dto/production.dto';
import {
  createBomSchema,
  createProductionOrderSchema,
  issueMaterialsSchema,
  listBomsQuerySchema,
  listProductionOrdersQuerySchema,
  productionIdParamsSchema,
  recordOutputSchema,
} from '../validators/production.validator';

const security = [{ [bearerAuth.name]: [] }];
const bomSchema: z.ZodType<BomResponseDto> = z.object({
  id: z.number(),
  itemId: z.number(),
  revision: z.string(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  status: z.string(),
  lines: z.array(
    z.object({
      id: z.number(),
      lineNumber: z.number(),
      materialItemId: z.number(),
      unitId: z.number(),
      quantity: z.string(),
      scrapPercent: z.string(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const orderSchema: z.ZodType<ProductionOrderResponseDto> = z.object({
  id: z.number(),
  productionOrderNumber: z.string(),
  billOfMaterialsId: z.number(),
  itemId: z.number(),
  plannedQuantity: z.string(),
  actualQuantity: z.string(),
  outputUnitId: z.number(),
  plannedStartAt: z.string(),
  actualStartAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  startedById: z.number().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  issues: z.array(
    z.object({
      id: z.number(),
      materialItemId: z.number(),
      batchId: z.number(),
      unitId: z.number(),
      issuedQuantity: z.string(),
      returnedQuantity: z.string(),
    }),
  ),
  outputs: z.array(
    z.object({ id: z.number(), batchId: z.number(), unitId: z.number(), quantity: z.string() }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/production/bills-of-materials',
  tags: ['Production'],
  security,
  summary: 'List bills of materials',
  request: { query: listBomsQuerySchema },
  responses: {
    200: successResponse(
      'Successfully retrieved bills of materials',
      z.object({
        items: z.array(bomSchema),
        pagination: paginationMetaSchema,
      }),
    ),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});
openApiRegistry.registerPath({
  method: 'get',
  path: '/production/bills-of-materials/{id}',
  tags: ['Production'],
  security,
  summary: 'Get a bill of materials',
  request: { params: productionIdParamsSchema },
  responses: {
    200: successResponse('Successfully retrieved bill of materials', bomSchema),
    ...commonErrors,
    404: errorResponse('Bill of materials not found'),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/production/bills-of-materials',
  tags: ['Production'],
  security,
  summary: 'Create a draft bill of materials',
  request: { body: jsonBody(createBomSchema) },
  responses: {
    201: successResponse('Successfully created bill of materials', bomSchema),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/production/bills-of-materials/{id}/activate',
  tags: ['Production'],
  security,
  summary: 'Activate a bill of materials',
  request: { params: productionIdParamsSchema },
  responses: {
    200: successResponse('Successfully activated bill of materials', bomSchema),
    ...commonErrors,
    409: errorResponse('Only draft BOMs may be activated'),
  },
});
openApiRegistry.registerPath({
  method: 'get',
  path: '/production/orders',
  tags: ['Production'],
  security,
  summary: 'List production orders',
  request: { query: listProductionOrdersQuerySchema },
  responses: {
    200: successResponse(
      'Successfully retrieved production orders',
      z.object({
        items: z.array(orderSchema),
        pagination: paginationMetaSchema,
      }),
    ),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});
openApiRegistry.registerPath({
  method: 'get',
  path: '/production/orders/{id}',
  tags: ['Production'],
  security,
  summary: 'Get a production order',
  request: { params: productionIdParamsSchema },
  responses: {
    200: successResponse('Successfully retrieved production order', orderSchema),
    ...commonErrors,
    404: errorResponse('Production order not found'),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/production/orders',
  tags: ['Production'],
  security,
  summary: 'Create a production order',
  request: { body: jsonBody(createProductionOrderSchema) },
  responses: {
    201: successResponse('Successfully created production order', orderSchema),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/production/orders/{id}/material-issues',
  tags: ['Production'],
  security,
  summary: 'Issue QC-passed raw materials to a production order',
  description:
    'Available inventory is decremented and production issue movements are recorded atomically.',
  request: { params: productionIdParamsSchema, body: jsonBody(issueMaterialsSchema) },
  responses: {
    200: successResponse('Successfully issued raw materials', orderSchema),
    ...commonErrors,
    409: errorResponse('Insufficient eligible stock or order conflict'),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/production/orders/{id}/outputs',
  tags: ['Production'],
  security,
  summary: 'Record a production output in QC hold',
  description: 'Creates the output batch and QC-hold balance with a stock movement atomically.',
  request: { params: productionIdParamsSchema, body: jsonBody(recordOutputSchema) },
  responses: {
    201: successResponse('Successfully recorded production output in QC hold', orderSchema),
    ...commonErrors,
    409: errorResponse('Production order conflict'),
  },
});
