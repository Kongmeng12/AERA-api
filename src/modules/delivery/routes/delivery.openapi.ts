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
import { salesInvoiceResponseSchema } from '../../sales/dto/sales.dto';
import { deliveryResponseSchema } from '../dto/delivery.dto';
import {
  completeDeliverySchema,
  createDeliverySchema,
  deliveryIdParamsSchema,
  listDeliveriesQuerySchema,
} from '../validators/delivery.validator';

const security = [{ [bearerAuth.name]: [] }];
const pageSchema = z.object({
  items: z.array(deliveryResponseSchema),
  pagination: paginationMetaSchema,
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/deliveries',
  tags: ['Delivery'],
  security,
  summary: 'List deliveries',
  request: { query: listDeliveriesQuerySchema },
  responses: {
    200: successResponse('Successfully retrieved deliveries', pageSchema),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/deliveries/{id}',
  tags: ['Delivery'],
  security,
  summary: 'Get delivery by ID',
  request: { params: deliveryIdParamsSchema },
  responses: {
    200: successResponse('Successfully retrieved delivery', deliveryResponseSchema),
    ...commonErrors,
    404: errorResponse('Delivery not found'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/deliveries',
  tags: ['Delivery'],
  security,
  summary: 'Plan a delivery',
  description:
    'Requires role: admin, manager or warehouse. Planned lines must be covered by reserved stock.',
  request: { body: jsonBody(createDeliverySchema) },
  responses: {
    201: successResponse('Successfully planned delivery', deliveryResponseSchema),
    ...commonErrors,
    409: errorResponse('Order is not approved or stock is already assigned'),
    422: errorResponse('Validation failed'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/deliveries/{id}/dispatch',
  tags: ['Delivery'],
  security,
  summary: 'Dispatch a planned delivery',
  description:
    'Requires role: admin, manager, warehouse or driver. Reduces on-hand and reserved stock atomically.',
  request: { params: deliveryIdParamsSchema },
  responses: {
    200: successResponse('Successfully dispatched delivery', deliveryResponseSchema),
    ...commonErrors,
    404: errorResponse('Delivery not found'),
    409: errorResponse('Delivery is not planned or reserved stock is insufficient'),
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/deliveries/{id}/complete',
  tags: ['Delivery'],
  security,
  summary: 'Complete a delivery and issue an invoice',
  description:
    'Requires role: admin, manager, warehouse or driver. Returned quantities restore the dispatched available stock.',
  request: {
    params: deliveryIdParamsSchema,
    body: jsonBody(completeDeliverySchema),
  },
  responses: {
    200: successResponse(
      'Successfully completed delivery and issued invoice',
      z.object({
        delivery: deliveryResponseSchema,
        invoice: salesInvoiceResponseSchema.nullable(),
      }),
    ),
    ...commonErrors,
    404: errorResponse('Delivery not found'),
    409: errorResponse('Delivery state, stock, invoice, or quantities conflict'),
    422: errorResponse('Validation failed'),
  },
});
