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
import { goodsReceiptResponseSchema, purchaseOrderResponseSchema } from '../dto/purchasing.dto';
import {
  createGoodsReceiptSchema,
  createPurchaseOrderSchema,
  listGoodsReceiptsQuerySchema,
  listPurchaseOrdersQuerySchema,
  purchaseOrderIdParamsSchema,
} from '../validators/purchasing.validator';

const security = [{ [bearerAuth.name]: [] }];
const idParams = purchaseOrderIdParamsSchema;

openApiRegistry.registerPath({
  method: 'get',
  path: '/purchase-orders',
  tags: ['Purchasing'],
  security,
  summary: 'List purchase orders',
  request: { query: listPurchaseOrdersQuerySchema },
  responses: {
    200: successResponse(
      'Successfully retrieved purchase orders',
      z.object({
        items: z.array(purchaseOrderResponseSchema),
        pagination: paginationMetaSchema,
      }),
    ),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/purchase-orders/{id}',
  tags: ['Purchasing'],
  security,
  summary: 'Get purchase order by ID',
  request: { params: idParams },
  responses: {
    200: successResponse('Successfully retrieved purchase order', purchaseOrderResponseSchema),
    ...commonErrors,
    404: errorResponse('Purchase order not found'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/purchase-orders',
  tags: ['Purchasing'],
  security,
  summary: 'Create a draft purchase order',
  description: 'Requires role: admin or purchasing.',
  request: { body: jsonBody(createPurchaseOrderSchema) },
  responses: {
    201: successResponse('Successfully created purchase order', purchaseOrderResponseSchema),
    ...commonErrors,
    409: errorResponse('Purchase order number already exists'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/purchase-orders/{id}/issue',
  tags: ['Purchasing'],
  security,
  summary: 'Issue a draft purchase order',
  description: 'Requires role: admin, manager or purchasing.',
  request: { params: idParams },
  responses: {
    200: successResponse('Successfully issued purchase order', purchaseOrderResponseSchema),
    ...commonErrors,
    404: errorResponse('Purchase order not found'),
    409: errorResponse('Only draft purchase orders can be issued'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/goods-receipts',
  tags: ['Purchasing'],
  security,
  summary: 'List goods receipts',
  request: { query: listGoodsReceiptsQuerySchema },
  responses: {
    200: successResponse(
      'Successfully retrieved goods receipts',
      z.object({
        items: z.array(goodsReceiptResponseSchema),
        pagination: paginationMetaSchema,
      }),
    ),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/goods-receipts/{id}',
  tags: ['Purchasing'],
  security,
  summary: 'Get goods receipt by ID',
  request: { params: idParams },
  responses: {
    200: successResponse('Successfully retrieved goods receipt', goodsReceiptResponseSchema),
    ...commonErrors,
    404: errorResponse('Goods receipt not found'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/goods-receipts',
  tags: ['Purchasing'],
  security,
  summary: 'Post a goods receipt',
  description:
    'Requires role: admin, purchasing or warehouse. Accepted quantities are posted as available stock; physical QC is handled outside this API.',
  request: { body: jsonBody(createGoodsReceiptSchema) },
  responses: {
    201: successResponse('Successfully created goods receipt', goodsReceiptResponseSchema),
    ...commonErrors,
    409: errorResponse('Receipt or batch conflicts with existing data'),
    422: errorResponse('Validation failed'),
  },
});
