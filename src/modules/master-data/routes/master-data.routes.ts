import { Router, type RequestHandler } from 'express';
import type { z } from 'zod';
import { ROLES } from '../../../shared/constants/roles';
import { authenticate } from '../../../shared/guards/authenticate.guard';
import { authorize } from '../../../shared/guards/authorize.guard';
import { validate } from '../../../shared/middlewares/validate.middleware';
import type { MasterDataController } from '../controllers/master-data.controller';
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

interface ResourceHandlers {
  list: RequestHandler;
  get: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
}

function registerResource(
  router: Router,
  path: string,
  handlers: ResourceHandlers,
  createSchema: z.ZodType,
  patchSchema: z.ZodType,
): void {
  const canRead = authorize(ROLES.ADMIN, ROLES.MANAGER);
  const canWrite = authorize(ROLES.ADMIN);

  router.get(path, canRead, validate({ query: listMasterDataQuerySchema }), handlers.list);
  router.get(`${path}/:id`, canRead, validate({ params: masterDataIdParamsSchema }), handlers.get);
  router.post(
    path,
    canWrite,
    validate({ body: createSchema }),
    handlers.create,
  );
  router.patch(
    `${path}/:id`,
    canWrite,
    validate({ params: masterDataIdParamsSchema, body: patchSchema }),
    handlers.update,
  );
  router.delete(
    `${path}/:id`,
    canWrite,
    validate({ params: masterDataIdParamsSchema }),
    handlers.remove,
  );
}

export function createMasterDataRouter(controller: MasterDataController): Router {
  const router = Router();
  router.use(authenticate);

  registerResource(
    router,
    '/customer-types',
    {
      list: controller.listCustomerTypes,
      get: controller.getCustomerType,
      create: controller.createCustomerType,
      update: controller.updateCustomerType,
      remove: controller.deleteCustomerType,
    },
    createCustomerTypeSchema,
    patchCustomerTypeSchema,
  );
  registerResource(
    router,
    '/customers',
    {
      list: controller.listCustomers,
      get: controller.getCustomer,
      create: controller.createCustomer,
      update: controller.updateCustomer,
      remove: controller.deleteCustomer,
    },
    createCustomerSchema,
    patchCustomerSchema,
  );
  registerResource(
    router,
    '/suppliers',
    {
      list: controller.listSuppliers,
      get: controller.getSupplier,
      create: controller.createSupplier,
      update: controller.updateSupplier,
      remove: controller.deleteSupplier,
    },
    createSupplierSchema,
    patchSupplierSchema,
  );
  registerResource(
    router,
    '/units',
    {
      list: controller.listUnits,
      get: controller.getUnit,
      create: controller.createUnit,
      update: controller.updateUnit,
      remove: controller.deleteUnit,
    },
    createUnitSchema,
    patchUnitSchema,
  );
  registerResource(
    router,
    '/item-categories',
    {
      list: controller.listItemCategories,
      get: controller.getItemCategory,
      create: controller.createItemCategory,
      update: controller.updateItemCategory,
      remove: controller.deleteItemCategory,
    },
    createItemCategorySchema,
    patchItemCategorySchema,
  );
  registerResource(
    router,
    '/items',
    {
      list: controller.listItems,
      get: controller.getItem,
      create: controller.createItem,
      update: controller.updateItem,
      remove: controller.deleteItem,
    },
    createItemSchema,
    patchItemSchema,
  );
  registerResource(
    router,
    '/warehouses',
    {
      list: controller.listWarehouses,
      get: controller.getWarehouse,
      create: controller.createWarehouse,
      update: controller.updateWarehouse,
      remove: controller.deleteWarehouse,
    },
    createWarehouseSchema,
    patchWarehouseSchema,
  );
  return router;
}
