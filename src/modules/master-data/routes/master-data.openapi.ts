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
  customerResponseSchema,
  customerTypeResponseSchema,
  itemCategoryResponseSchema,
  itemResponseSchema,
  supplierResponseSchema,
  unitResponseSchema,
  warehouseResponseSchema,
} from '../dto/master-data.dto';
import {
  createCustomerSchema,
  createCustomerTypeSchema,
  createItemCategorySchema,
  createItemSchema,
  createSupplierSchema,
  createUnitSchema,
  createWarehouseSchema,
  listMasterDataQuerySchema,
  masterDataIdParamsSchema,
  patchCustomerSchema,
  patchCustomerTypeSchema,
  patchItemCategorySchema,
  patchItemSchema,
  patchSupplierSchema,
  patchUnitSchema,
  patchWarehouseSchema,
} from '../validators/master-data.validator';

interface ResourceDocumentation {
  path: string;
  name: string;
  responseSchema: z.ZodType;
  createSchema: z.ZodType;
  patchSchema: z.ZodType;
  example: Record<string, unknown>;
}

const security = [{ [bearerAuth.name]: [] }];
const tags = ['Master Data'];

function registerResource(resource: ResourceDocumentation): void {
  const { path, name, responseSchema, createSchema, patchSchema, example } = resource;
  const itemPath = `${path}/{id}`;
  const pageSchema = z.object({
    items: z.array(responseSchema),
    pagination: paginationMetaSchema,
  });
  const success = `Successfully retrieved ${name}`;
  const created = `Successfully created ${name}`;
  const updated = `Successfully updated ${name}`;

  openApiRegistry.registerPath({
    method: 'get',
    path,
    tags,
    security,
    summary: `List ${name}`,
    description: 'Requires role: admin or manager.',
    request: { query: listMasterDataQuerySchema },
    responses: {
      200: successResponse(success, pageSchema, {
        items: [example],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
      ...commonErrors,
      422: errorResponse('Validation failed'),
    },
  });

  openApiRegistry.registerPath({
    method: 'get',
    path: itemPath,
    tags,
    security,
    summary: `Get ${name} by ID`,
    description: 'Requires role: admin or manager.',
    request: { params: masterDataIdParamsSchema },
    responses: {
      200: successResponse(success, responseSchema, example),
      ...commonErrors,
      404: errorResponse(`${name} not found`),
      422: errorResponse('Validation failed'),
    },
  });

  openApiRegistry.registerPath({
    method: 'post',
    path,
    tags,
    security,
    summary: `Create ${name}`,
    description: 'Requires role: admin.',
    request: { body: jsonBody(createSchema) },
    responses: {
      201: successResponse(created, responseSchema, example),
      ...commonErrors,
      409: errorResponse('A record with the same code already exists'),
      422: errorResponse('Validation failed'),
    },
  });

  openApiRegistry.registerPath({
    method: 'patch',
    path: itemPath,
    tags,
    security,
    summary: `Update ${name}`,
    description: 'Requires role: admin.',
    request: {
      params: masterDataIdParamsSchema,
      body: jsonBody(patchSchema),
    },
    responses: {
      200: successResponse(updated, responseSchema, example),
      ...commonErrors,
      404: errorResponse(`${name} not found`),
      409: errorResponse('A record with the same code already exists'),
      422: errorResponse('Validation failed'),
    },
  });

  openApiRegistry.registerPath({
    method: 'delete',
    path: itemPath,
    tags,
    security,
    summary: `Soft-delete ${name}`,
    description: 'Requires role: admin.',
    request: { params: masterDataIdParamsSchema },
    responses: {
      204: { description: `${name} deleted` },
      ...commonErrors,
      404: errorResponse(`${name} not found`),
      409: errorResponse('The record is referenced by other master data'),
      422: errorResponse('Validation failed'),
    },
  });
}

registerResource({
  path: '/customer-types',
  name: 'customer type',
  responseSchema: customerTypeResponseSchema,
  createSchema: createCustomerTypeSchema,
  patchSchema: patchCustomerTypeSchema,
  example: {
    id: 1,
    code: 'RETAIL',
    name: 'Retail',
    description: null,
    createdAt: '2026-01-15T08:30:00.000Z',
    updatedAt: '2026-01-15T08:30:00.000Z',
  },
});

registerResource({
  path: '/customers',
  name: 'customer',
  responseSchema: customerResponseSchema,
  createSchema: createCustomerSchema,
  patchSchema: patchCustomerSchema,
  example: {
    id: 1,
    customerCode: 'CUS-001',
    customerTypeId: 1,
    name: 'Example Shop',
    contactName: null,
    phoneNumber: null,
    email: null,
    taxNumber: null,
    creditLimit: '0.0000',
    creditCurrencyId: null,
    creditTermDays: 0,
    salesEmployeeId: null,
    status: 'active',
    notes: null,
    createdAt: '2026-01-15T08:30:00.000Z',
    updatedAt: '2026-01-15T08:30:00.000Z',
  },
});

registerResource({
  path: '/suppliers',
  name: 'supplier',
  responseSchema: supplierResponseSchema,
  createSchema: createSupplierSchema,
  patchSchema: patchSupplierSchema,
  example: {
    id: 1,
    supplierCode: 'SUP-001',
    name: 'Example Supplier',
    contactName: null,
    phoneNumber: null,
    email: null,
    taxNumber: null,
    addressText: null,
    paymentTermDays: 0,
    status: 'active',
    notes: null,
    createdAt: '2026-01-15T08:30:00.000Z',
    updatedAt: '2026-01-15T08:30:00.000Z',
  },
});

registerResource({
  path: '/units',
  name: 'unit',
  responseSchema: unitResponseSchema,
  createSchema: createUnitSchema,
  patchSchema: patchUnitSchema,
  example: {
    id: 1,
    code: 'KG',
    name: 'Kilogram',
    symbol: 'kg',
    decimalPlaces: 3,
    createdAt: '2026-01-15T08:30:00.000Z',
    updatedAt: '2026-01-15T08:30:00.000Z',
  },
});

registerResource({
  path: '/item-categories',
  name: 'item category',
  responseSchema: itemCategoryResponseSchema,
  createSchema: createItemCategorySchema,
  patchSchema: patchItemCategorySchema,
  example: {
    id: 1,
    code: 'MINERAL',
    name: 'Mineral products',
    parentId: null,
    description: null,
    createdAt: '2026-01-15T08:30:00.000Z',
    updatedAt: '2026-01-15T08:30:00.000Z',
  },
});

registerResource({
  path: '/items',
  name: 'item',
  responseSchema: itemResponseSchema,
  createSchema: createItemSchema,
  patchSchema: patchItemSchema,
  example: {
    id: 1,
    sku: 'ITEM-001',
    categoryId: 1,
    baseUnitId: 1,
    name: 'Example Mineral',
    itemType: 'finished_good',
    description: null,
    shelfLifeDays: null,
    dailyProductionCapacity: null,
    reorderPoint: '0.0000',
    status: 'active',
    createdAt: '2026-01-15T08:30:00.000Z',
    updatedAt: '2026-01-15T08:30:00.000Z',
  },
});

registerResource({
  path: '/warehouses',
  name: 'warehouse',
  responseSchema: warehouseResponseSchema,
  createSchema: createWarehouseSchema,
  patchSchema: patchWarehouseSchema,
  example: {
    id: 1,
    code: 'WH-001',
    name: 'Main Warehouse',
    addressText: null,
    status: 'active',
    createdAt: '2026-01-15T08:30:00.000Z',
    updatedAt: '2026-01-15T08:30:00.000Z',
  },
});
