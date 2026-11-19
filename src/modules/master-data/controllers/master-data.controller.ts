import type { Request, RequestHandler, Response } from 'express';
import { sendNoContent, sendSuccess } from '../../../shared/response/api-response';
import type { PaginatedResult } from '../../../shared/response/api-response';
import type {
  CreateCustomerDto,
  CreateCustomerTypeDto,
  CreateItemCategoryDto,
  CreateItemDto,
  CreateSupplierDto,
  CreateUnitDto,
  CreateWarehouseDto,
  ListMasterDataQueryDto,
  PatchCustomerDto,
  PatchCustomerTypeDto,
  PatchItemCategoryDto,
  PatchItemDto,
  PatchSupplierDto,
  PatchUnitDto,
  PatchWarehouseDto,
} from '../dto/master-data.dto';
import type { MasterDataService } from '../services/master-data.service';

function requestId(req: Request): number {
  return (req.validated.params as { id: number }).id;
}

export class MasterDataController {
  constructor(private readonly masterData: MasterDataService) {}

  readonly listCustomers = this.list(
    (query) => this.masterData.listCustomers(query),
    'Successfully retrieved customers',
  );
  readonly getCustomer = this.get(
    (id) => this.masterData.getCustomer(id),
    'Successfully retrieved customer',
  );
  readonly createCustomer = this.create<CreateCustomerDto>(
    (dto) => this.masterData.createCustomer(dto),
    'Successfully created customer',
  );
  readonly updateCustomer = this.update<PatchCustomerDto>(
    (id, dto) => this.masterData.updateCustomer(id, dto),
    'Successfully updated customer',
  );
  readonly deleteCustomer = this.remove((id) => this.masterData.deleteCustomer(id));

  readonly listCustomerTypes = this.list(
    (query) => this.masterData.listCustomerTypes(query),
    'Successfully retrieved customer types',
  );
  readonly getCustomerType = this.get(
    (id) => this.masterData.getCustomerType(id),
    'Successfully retrieved customer type',
  );
  readonly createCustomerType = this.create<CreateCustomerTypeDto>(
    (dto) => this.masterData.createCustomerType(dto),
    'Successfully created customer type',
  );
  readonly updateCustomerType = this.update<PatchCustomerTypeDto>(
    (id, dto) => this.masterData.updateCustomerType(id, dto),
    'Successfully updated customer type',
  );
  readonly deleteCustomerType = this.remove((id) => this.masterData.deleteCustomerType(id));

  readonly listSuppliers = this.list(
    (query) => this.masterData.listSuppliers(query),
    'Successfully retrieved suppliers',
  );
  readonly getSupplier = this.get(
    (id) => this.masterData.getSupplier(id),
    'Successfully retrieved supplier',
  );
  readonly createSupplier = this.create<CreateSupplierDto>(
    (dto) => this.masterData.createSupplier(dto),
    'Successfully created supplier',
  );
  readonly updateSupplier = this.update<PatchSupplierDto>(
    (id, dto) => this.masterData.updateSupplier(id, dto),
    'Successfully updated supplier',
  );
  readonly deleteSupplier = this.remove((id) => this.masterData.deleteSupplier(id));

  readonly listUnits = this.list(
    (query) => this.masterData.listUnits(query),
    'Successfully retrieved units',
  );
  readonly getUnit = this.get((id) => this.masterData.getUnit(id), 'Successfully retrieved unit');
  readonly createUnit = this.create<CreateUnitDto>(
    (dto) => this.masterData.createUnit(dto),
    'Successfully created unit',
  );
  readonly updateUnit = this.update<PatchUnitDto>(
    (id, dto) => this.masterData.updateUnit(id, dto),
    'Successfully updated unit',
  );
  readonly deleteUnit = this.remove((id) => this.masterData.deleteUnit(id));

  readonly listItemCategories = this.list(
    (query) => this.masterData.listItemCategories(query),
    'Successfully retrieved item categories',
  );
  readonly getItemCategory = this.get(
    (id) => this.masterData.getItemCategory(id),
    'Successfully retrieved item category',
  );
  readonly createItemCategory = this.create<CreateItemCategoryDto>(
    (dto) => this.masterData.createItemCategory(dto),
    'Successfully created item category',
  );
  readonly updateItemCategory = this.update<PatchItemCategoryDto>(
    (id, dto) => this.masterData.updateItemCategory(id, dto),
    'Successfully updated item category',
  );
  readonly deleteItemCategory = this.remove((id) => this.masterData.deleteItemCategory(id));

  readonly listItems = this.list(
    (query) => this.masterData.listItems(query),
    'Successfully retrieved items',
  );
  readonly getItem = this.get((id) => this.masterData.getItem(id), 'Successfully retrieved item');
  readonly createItem = this.create<CreateItemDto>(
    (dto) => this.masterData.createItem(dto),
    'Successfully created item',
  );
  readonly updateItem = this.update<PatchItemDto>(
    (id, dto) => this.masterData.updateItem(id, dto),
    'Successfully updated item',
  );
  readonly deleteItem = this.remove((id) => this.masterData.deleteItem(id));

  readonly listWarehouses = this.list(
    (query) => this.masterData.listWarehouses(query),
    'Successfully retrieved warehouses',
  );
  readonly getWarehouse = this.get(
    (id) => this.masterData.getWarehouse(id),
    'Successfully retrieved warehouse',
  );
  readonly createWarehouse = this.create<CreateWarehouseDto>(
    (dto) => this.masterData.createWarehouse(dto),
    'Successfully created warehouse',
  );
  readonly updateWarehouse = this.update<PatchWarehouseDto>(
    (id, dto) => this.masterData.updateWarehouse(id, dto),
    'Successfully updated warehouse',
  );
  readonly deleteWarehouse = this.remove((id) => this.masterData.deleteWarehouse(id));

  private list<T>(
    action: (query: ListMasterDataQueryDto) => Promise<PaginatedResult<T>>,
    message: string,
  ): RequestHandler {
    return async (req: Request, res: Response): Promise<void> => {
      sendSuccess(res, await action(req.validated.query as ListMasterDataQueryDto), message);
    };
  }

  private get<T>(action: (id: number) => Promise<T>, message: string): RequestHandler {
    return async (req: Request, res: Response): Promise<void> => {
      sendSuccess(res, await action(requestId(req)), message);
    };
  }

  private create<TInput>(
    action: (dto: TInput) => Promise<unknown>,
    message: string,
  ): RequestHandler {
    return async (req: Request, res: Response): Promise<void> => {
      const result = await action(req.validated.body as TInput);
      sendSuccess(res, result, message, 201);
    };
  }

  private update<TInput>(
    action: (id: number, dto: TInput) => Promise<unknown>,
    message: string,
  ): RequestHandler {
    return async (req: Request, res: Response): Promise<void> => {
      const result = await action(requestId(req), req.validated.body as TInput);
      sendSuccess(res, result, message);
    };
  }

  private remove(action: (id: number) => Promise<void>): RequestHandler {
    return async (req: Request, res: Response): Promise<void> => {
      await action(requestId(req));
      sendNoContent(res);
    };
  }
}
