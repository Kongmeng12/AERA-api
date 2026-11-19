import { z } from 'zod';
import {
  bearerAuth,
  commonErrors,
  errorResponse,
  openApiRegistry,
  paginationMetaSchema,
  successResponse,
} from '../../../shared/openapi/registry';
import {
  inventoryBalanceResponseSchema,
  stockBatchResponseSchema,
  stockMovementResponseSchema,
} from '../dto/inventory.dto';
import {
  listInventoryBalancesQuerySchema,
  listStockBatchesQuerySchema,
  listStockMovementsQuerySchema,
} from '../validators/inventory.validator';

const security = [{ [bearerAuth.name]: [] }];

for (const resource of [
  {
    path: '/inventory/balances',
    name: 'inventory balances',
    query: listInventoryBalancesQuerySchema,
    schema: inventoryBalanceResponseSchema,
  },
  {
    path: '/inventory/batches',
    name: 'stock batches',
    query: listStockBatchesQuerySchema,
    schema: stockBatchResponseSchema,
  },
  {
    path: '/inventory/movements',
    name: 'stock movements',
    query: listStockMovementsQuerySchema,
    schema: stockMovementResponseSchema,
  },
]) {
  openApiRegistry.registerPath({
    method: 'get',
    path: resource.path,
    tags: ['Inventory'],
    security,
    summary: `List ${resource.name}`,
    description: 'Requires role: admin, manager, warehouse, purchasing or qc.',
    request: { query: resource.query },
    responses: {
      200: successResponse(
        `Successfully retrieved ${resource.name}`,
        z.object({
          items: z.array(resource.schema),
          pagination: paginationMetaSchema,
        }),
      ),
      ...commonErrors,
      422: errorResponse('Validation failed'),
    },
  });
}
