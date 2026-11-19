import { QueryFailedError } from 'typeorm';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../core/exceptions/app-error';
import { ERROR_CODES } from '../../../shared/constants/error-codes';
import { toPaginatedResult } from '../../../shared/helpers/pagination';
import type { PaginatedResult } from '../../../shared/response/api-response';
import {
  toCustomerResponse,
  toCustomerTypeResponse,
  toItemCategoryResponse,
  toItemResponse,
  toSupplierResponse,
  toUnitResponse,
  toWarehouseResponse,
  type CustomerResponseDto,
  type CustomerTypeResponseDto,
  type ItemCategoryResponseDto,
  type ItemResponseDto,
  type ListMasterDataQueryDto,
  type SupplierResponseDto,
  type UnitResponseDto,
  type WarehouseResponseDto,
  type CreateCustomerDto,
  type CreateCustomerTypeDto,
  type CreateItemCategoryDto,
  type CreateItemDto,
  type CreateSupplierDto,
  type CreateUnitDto,
  type CreateWarehouseDto,
  type PatchCustomerDto,
  type PatchCustomerTypeDto,
  type PatchItemCategoryDto,
  type PatchItemDto,
  type PatchSupplierDto,
  type PatchUnitDto,
  type PatchWarehouseDto,
} from '../dto/master-data.dto';
import type {
  Customer,
  CustomerType,
} from '../entities/customer.entity';
import type { Item, ItemCategory, Unit } from '../entities/item.entity';
import type { Supplier } from '../entities/supplier.entity';
import type { Warehouse } from '../entities/warehouse.entity';
import type { MasterDataRepository } from '../repositories/master-data.repository';

function isDuplicateKeyError(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === 'ER_DUP_ENTRY'
  );
}

export class MasterDataService {
  constructor(private readonly repository: MasterDataRepository) {}

  async listCustomers(query: ListMasterDataQueryDto): Promise<PaginatedResult<CustomerResponseDto>> {
    const [rows, total] = await this.repository.findCustomers(query);
    return toPaginatedResult(rows.map(toCustomerResponse), total, query.page, query.limit);
  }

  async getCustomer(id: number): Promise<CustomerResponseDto> {
    return toCustomerResponse(
      await this.require(id, this.repository.findCustomer.bind(this.repository), 'Customer'),
    );
  }

  async createCustomer(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    await this.assertCustomerReferences(dto);
    this.assertUnique(
      await this.repository.customerCodeTaken(dto.customerCode),
      'Customer code',
    );
    const row = await this.saveUnique(() => this.repository.createCustomer(dto), 'Customer code');
    return toCustomerResponse(row);
  }

  async updateCustomer(id: number, dto: PatchCustomerDto): Promise<CustomerResponseDto> {
    await this.require(id, this.repository.findCustomer.bind(this.repository), 'Customer');
    await this.assertCustomerReferences(dto);
    if (dto.customerCode !== undefined) {
      this.assertUnique(
        await this.repository.customerCodeTaken(dto.customerCode, id),
        'Customer code',
      );
    }
    await this.saveUnique(() => this.repository.updateCustomer(id, dto), 'Customer code');
    return this.getCustomer(id);
  }

  async deleteCustomer(id: number): Promise<void> {
    await this.require(id, this.repository.findCustomer.bind(this.repository), 'Customer');
    await this.repository.deleteCustomer(id);
  }

  async listCustomerTypes(
    query: ListMasterDataQueryDto,
  ): Promise<PaginatedResult<CustomerTypeResponseDto>> {
    const [rows, total] = await this.repository.findCustomerTypes(query);
    return toPaginatedResult(rows.map(toCustomerTypeResponse), total, query.page, query.limit);
  }

  async getCustomerType(id: number): Promise<CustomerTypeResponseDto> {
    return toCustomerTypeResponse(
      await this.require(
        id,
        this.repository.findCustomerType.bind(this.repository),
        'Customer type',
      ),
    );
  }

  async createCustomerType(dto: CreateCustomerTypeDto): Promise<CustomerTypeResponseDto> {
    this.assertUnique(
      await this.repository.customerTypeCodeTaken(dto.code),
      'Customer type code',
    );
    const row = await this.saveUnique(
      () => this.repository.createCustomerType(dto),
      'Customer type code',
    );
    return toCustomerTypeResponse(row);
  }

  async updateCustomerType(
    id: number,
    dto: PatchCustomerTypeDto,
  ): Promise<CustomerTypeResponseDto> {
    await this.require(
      id,
      this.repository.findCustomerType.bind(this.repository),
      'Customer type',
    );
    if (dto.code !== undefined) {
      this.assertUnique(
        await this.repository.customerTypeCodeTaken(dto.code, id),
        'Customer type code',
      );
    }
    await this.saveUnique(() => this.repository.updateCustomerType(id, dto), 'Customer type code');
    return this.getCustomerType(id);
  }

  async deleteCustomerType(id: number): Promise<void> {
    await this.require(
      id,
      this.repository.findCustomerType.bind(this.repository),
      'Customer type',
    );
    if (await this.repository.hasCustomersOfType(id)) {
      throw new ConflictError(
        ERROR_CODES.RESOURCE_CONFLICT,
        'Customer type cannot be deleted while customers use it',
      );
    }
    await this.repository.deleteCustomerType(id);
  }

  async listSuppliers(query: ListMasterDataQueryDto): Promise<PaginatedResult<SupplierResponseDto>> {
    const [rows, total] = await this.repository.findSuppliers(query);
    return toPaginatedResult(rows.map(toSupplierResponse), total, query.page, query.limit);
  }

  async getSupplier(id: number): Promise<SupplierResponseDto> {
    return toSupplierResponse(
      await this.require(id, this.repository.findSupplier.bind(this.repository), 'Supplier'),
    );
  }

  async createSupplier(dto: CreateSupplierDto): Promise<SupplierResponseDto> {
    this.assertUnique(
      await this.repository.supplierCodeTaken(dto.supplierCode),
      'Supplier code',
    );
    const row = await this.saveUnique(() => this.repository.createSupplier(dto), 'Supplier code');
    return toSupplierResponse(row);
  }

  async updateSupplier(id: number, dto: PatchSupplierDto): Promise<SupplierResponseDto> {
    await this.require(id, this.repository.findSupplier.bind(this.repository), 'Supplier');
    if (dto.supplierCode !== undefined) {
      this.assertUnique(
        await this.repository.supplierCodeTaken(dto.supplierCode, id),
        'Supplier code',
      );
    }
    await this.saveUnique(() => this.repository.updateSupplier(id, dto), 'Supplier code');
    return this.getSupplier(id);
  }

  async deleteSupplier(id: number): Promise<void> {
    await this.require(id, this.repository.findSupplier.bind(this.repository), 'Supplier');
    await this.repository.deleteSupplier(id);
  }

  async listUnits(query: ListMasterDataQueryDto): Promise<PaginatedResult<UnitResponseDto>> {
    const [rows, total] = await this.repository.findUnits(query);
    return toPaginatedResult(rows.map(toUnitResponse), total, query.page, query.limit);
  }

  async getUnit(id: number): Promise<UnitResponseDto> {
    return toUnitResponse(
      await this.require(id, this.repository.findUnit.bind(this.repository), 'Unit'),
    );
  }

  async createUnit(dto: CreateUnitDto): Promise<UnitResponseDto> {
    this.assertUnique(await this.repository.unitCodeTaken(dto.code), 'Unit code');
    const row = await this.saveUnique(() => this.repository.createUnit(dto), 'Unit code');
    return toUnitResponse(row);
  }

  async updateUnit(id: number, dto: PatchUnitDto): Promise<UnitResponseDto> {
    await this.require(id, this.repository.findUnit.bind(this.repository), 'Unit');
    if (dto.code !== undefined) {
      this.assertUnique(await this.repository.unitCodeTaken(dto.code, id), 'Unit code');
    }
    await this.saveUnique(() => this.repository.updateUnit(id, dto), 'Unit code');
    return this.getUnit(id);
  }

  async deleteUnit(id: number): Promise<void> {
    await this.require(id, this.repository.findUnit.bind(this.repository), 'Unit');
    if (
      (await this.repository.hasItemsUsingUnit(id)) ||
      (await this.repository.hasConversionsUsingUnit(id))
    ) {
      throw new ConflictError(
        ERROR_CODES.RESOURCE_CONFLICT,
        'Unit cannot be deleted while items or conversions use it',
      );
    }
    await this.repository.deleteUnit(id);
  }

  async listItemCategories(
    query: ListMasterDataQueryDto,
  ): Promise<PaginatedResult<ItemCategoryResponseDto>> {
    const [rows, total] = await this.repository.findItemCategories(query);
    return toPaginatedResult(rows.map(toItemCategoryResponse), total, query.page, query.limit);
  }

  async getItemCategory(id: number): Promise<ItemCategoryResponseDto> {
    return toItemCategoryResponse(
      await this.require(
        id,
        this.repository.findItemCategory.bind(this.repository),
        'Item category',
      ),
    );
  }

  async createItemCategory(dto: CreateItemCategoryDto): Promise<ItemCategoryResponseDto> {
    await this.assertCategoryParent(dto.parentId ?? null);
    this.assertUnique(
      await this.repository.itemCategoryCodeTaken(dto.code),
      'Item category code',
    );
    const row = await this.saveUnique(
      () => this.repository.createItemCategory(dto),
      'Item category code',
    );
    return toItemCategoryResponse(row);
  }

  async updateItemCategory(
    id: number,
    dto: PatchItemCategoryDto,
  ): Promise<ItemCategoryResponseDto> {
    await this.require(
      id,
      this.repository.findItemCategory.bind(this.repository),
      'Item category',
    );
    if (dto.parentId !== undefined) {
      await this.assertCategoryParent(dto.parentId, id);
    }
    if (dto.code !== undefined) {
      this.assertUnique(
        await this.repository.itemCategoryCodeTaken(dto.code, id),
        'Item category code',
      );
    }
    await this.saveUnique(() => this.repository.updateItemCategory(id, dto), 'Item category code');
    return this.getItemCategory(id);
  }

  async deleteItemCategory(id: number): Promise<void> {
    await this.require(
      id,
      this.repository.findItemCategory.bind(this.repository),
      'Item category',
    );
    if (
      (await this.repository.hasItemsInCategory(id)) ||
      (await this.repository.hasChildCategories(id))
    ) {
      throw new ConflictError(
        ERROR_CODES.RESOURCE_CONFLICT,
        'Item category cannot be deleted while items or subcategories use it',
      );
    }
    await this.repository.deleteItemCategory(id);
  }

  async listItems(query: ListMasterDataQueryDto): Promise<PaginatedResult<ItemResponseDto>> {
    const [rows, total] = await this.repository.findItems(query);
    return toPaginatedResult(rows.map(toItemResponse), total, query.page, query.limit);
  }

  async getItem(id: number): Promise<ItemResponseDto> {
    return toItemResponse(
      await this.require(id, this.repository.findItem.bind(this.repository), 'Item'),
    );
  }

  async createItem(dto: CreateItemDto): Promise<ItemResponseDto> {
    await this.assertItemReferences(dto);
    this.assertUnique(await this.repository.itemSkuTaken(dto.sku), 'Item SKU');
    const row = await this.saveUnique(() => this.repository.createItem(dto), 'Item SKU');
    return toItemResponse(row);
  }

  async updateItem(id: number, dto: PatchItemDto): Promise<ItemResponseDto> {
    await this.require(id, this.repository.findItem.bind(this.repository), 'Item');
    await this.assertItemReferences(dto);
    if (dto.sku !== undefined) {
      this.assertUnique(await this.repository.itemSkuTaken(dto.sku, id), 'Item SKU');
    }
    await this.saveUnique(() => this.repository.updateItem(id, dto), 'Item SKU');
    return this.getItem(id);
  }

  async deleteItem(id: number): Promise<void> {
    await this.require(id, this.repository.findItem.bind(this.repository), 'Item');
    await this.repository.deleteItem(id);
  }

  async listWarehouses(
    query: ListMasterDataQueryDto,
  ): Promise<PaginatedResult<WarehouseResponseDto>> {
    const [rows, total] = await this.repository.findWarehouses(query);
    return toPaginatedResult(rows.map(toWarehouseResponse), total, query.page, query.limit);
  }

  async getWarehouse(id: number): Promise<WarehouseResponseDto> {
    return toWarehouseResponse(
      await this.require(id, this.repository.findWarehouse.bind(this.repository), 'Warehouse'),
    );
  }

  async createWarehouse(dto: CreateWarehouseDto): Promise<WarehouseResponseDto> {
    this.assertUnique(
      await this.repository.warehouseCodeTaken(dto.code),
      'Warehouse code',
    );
    const row = await this.saveUnique(() => this.repository.createWarehouse(dto), 'Warehouse code');
    return toWarehouseResponse(row);
  }

  async updateWarehouse(id: number, dto: PatchWarehouseDto): Promise<WarehouseResponseDto> {
    await this.require(id, this.repository.findWarehouse.bind(this.repository), 'Warehouse');
    if (dto.code !== undefined) {
      this.assertUnique(
        await this.repository.warehouseCodeTaken(dto.code, id),
        'Warehouse code',
      );
    }
    await this.saveUnique(() => this.repository.updateWarehouse(id, dto), 'Warehouse code');
    return this.getWarehouse(id);
  }

  async deleteWarehouse(id: number): Promise<void> {
    await this.require(id, this.repository.findWarehouse.bind(this.repository), 'Warehouse');
    await this.repository.deleteWarehouse(id);
  }

  private async assertCustomerReferences(
    dto: Partial<CreateCustomerDto | PatchCustomerDto>,
  ): Promise<void> {
    if (dto.customerTypeId !== undefined) {
      await this.assertReference(
        this.repository.customerTypeExists(dto.customerTypeId),
        'customerTypeId',
        'Customer type does not exist',
      );
    }
    if (dto.creditCurrencyId) {
      await this.assertReference(
        this.repository.currencyExists(dto.creditCurrencyId),
        'creditCurrencyId',
        'Currency does not exist',
      );
    }
    if (dto.salesEmployeeId) {
      await this.assertReference(
        this.repository.employeeExists(dto.salesEmployeeId),
        'salesEmployeeId',
        'Sales employee does not exist',
      );
    }
  }

  private async assertItemReferences(dto: Partial<CreateItemDto | PatchItemDto>): Promise<void> {
    if (dto.categoryId !== undefined) {
      await this.assertReference(
        this.repository.itemCategoryExists(dto.categoryId),
        'categoryId',
        'Item category does not exist',
      );
    }
    if (dto.baseUnitId !== undefined) {
      await this.assertReference(
        this.repository.unitExists(dto.baseUnitId),
        'baseUnitId',
        'Base unit does not exist',
      );
    }
  }

  private async assertCategoryParent(parentId: number | null, categoryId?: number): Promise<void> {
    const visited = new Set<number>();
    let currentId = parentId;
    while (currentId !== null) {
      if (currentId === categoryId || visited.has(currentId)) {
        throw new ValidationError(ERROR_CODES.VALIDATION_ERROR, 'Invalid category parent', [
          { field: 'parentId', message: 'Category hierarchy cannot contain a cycle' },
        ]);
      }
      visited.add(currentId);
      await this.assertReference(
        this.repository.itemCategoryExists(currentId),
        'parentId',
        'Parent category does not exist',
      );
      currentId = await this.repository.itemCategoryParentId(currentId);
    }
  }

  private async assertReference(
    exists: Promise<boolean>,
    field: string,
    message: string,
  ): Promise<void> {
    if (!(await exists)) {
      throw new ValidationError(ERROR_CODES.VALIDATION_ERROR, 'Validation failed', [
        { field, message },
      ]);
    }
  }

  private assertUnique(isTaken: boolean, field: string): void {
    if (isTaken) {
      throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, `${field} already exists`);
    }
  }

  private async saveUnique<T>(save: () => Promise<T>, field: string): Promise<T> {
    try {
      return await save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, `${field} already exists`);
      }
      throw error;
    }
  }

  private async require<T extends Customer | CustomerType | Supplier | Unit | ItemCategory | Item | Warehouse>(
    id: number,
    find: (id: number) => Promise<T | null>,
    resource: string,
  ): Promise<T> {
    const entity = await find(id);
    if (!entity) {
      throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, `${resource} not found`);
    }
    return entity;
  }
}
