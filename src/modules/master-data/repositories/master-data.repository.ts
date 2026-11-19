import type { DataSource, DeepPartial, Repository } from 'typeorm';
import type { SoftDeletableEntity } from '../../../core/database/entities/base.entity';
import type { ListMasterDataQueryDto } from '../dto/master-data.dto';
import { Customer, CustomerType } from '../entities/customer.entity';
import { Currency } from '../entities/currency.entity';
import { Employee } from '../entities/employee.entity';
import { Item, ItemCategory, ItemUnitConversion, Unit } from '../entities/item.entity';
import { Supplier } from '../entities/supplier.entity';
import { Warehouse } from '../entities/warehouse.entity';

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

export class MasterDataRepository {
  private readonly customers: Repository<Customer>;
  private readonly customerTypes: Repository<CustomerType>;
  private readonly suppliers: Repository<Supplier>;
  private readonly units: Repository<Unit>;
  private readonly itemCategories: Repository<ItemCategory>;
  private readonly items: Repository<Item>;
  private readonly warehouses: Repository<Warehouse>;
  private readonly currencies: Repository<Currency>;
  private readonly employees: Repository<Employee>;
  private readonly itemConversions: Repository<ItemUnitConversion>;

  constructor(dataSource: DataSource) {
    this.customers = dataSource.getRepository(Customer);
    this.customerTypes = dataSource.getRepository(CustomerType);
    this.suppliers = dataSource.getRepository(Supplier);
    this.units = dataSource.getRepository(Unit);
    this.itemCategories = dataSource.getRepository(ItemCategory);
    this.items = dataSource.getRepository(Item);
    this.warehouses = dataSource.getRepository(Warehouse);
    this.currencies = dataSource.getRepository(Currency);
    this.employees = dataSource.getRepository(Employee);
    this.itemConversions = dataSource.getRepository(ItemUnitConversion);
  }

  findCustomers(query: ListMasterDataQueryDto) {
    return this.findPage(this.customers, 'customer', ['customerCode', 'name'], query);
  }

  findCustomer(id: number) {
    return this.findById(this.customers, 'customer', id);
  }

  customerCodeTaken(code: string, excludeId?: number) {
    return this.codeTaken(this.customers, 'customer', 'customerCode', code, excludeId);
  }

  createCustomer(data: DeepPartial<Customer>) {
    return this.customers.save(this.customers.create(data));
  }

  updateCustomer(id: number, data: DeepPartial<Customer>) {
    return this.customers.update({ id }, data);
  }

  deleteCustomer(id: number) {
    return this.customers.softDelete({ id });
  }

  findCustomerTypes(query: ListMasterDataQueryDto) {
    return this.findPage(this.customerTypes, 'customerType', ['code', 'name'], query);
  }

  findCustomerType(id: number) {
    return this.findById(this.customerTypes, 'customerType', id);
  }

  customerTypeCodeTaken(code: string, excludeId?: number) {
    return this.codeTaken(this.customerTypes, 'customerType', 'code', code, excludeId);
  }

  createCustomerType(data: DeepPartial<CustomerType>) {
    return this.customerTypes.save(this.customerTypes.create(data));
  }

  updateCustomerType(id: number, data: DeepPartial<CustomerType>) {
    return this.customerTypes.update({ id }, data);
  }

  deleteCustomerType(id: number) {
    return this.customerTypes.softDelete({ id });
  }

  hasCustomersOfType(id: number) {
    return this.customers.countBy({ customerTypeId: id }).then((count) => count > 0);
  }

  customerTypeExists(id: number) {
    return this.customerTypes.countBy({ id }).then((count) => count > 0);
  }

  currencyExists(id: number) {
    return this.currencies.countBy({ id }).then((count) => count > 0);
  }

  employeeExists(id: number) {
    return this.employees.countBy({ id }).then((count) => count > 0);
  }

  findSuppliers(query: ListMasterDataQueryDto) {
    return this.findPage(this.suppliers, 'supplier', ['supplierCode', 'name'], query);
  }

  findSupplier(id: number) {
    return this.findById(this.suppliers, 'supplier', id);
  }

  supplierCodeTaken(code: string, excludeId?: number) {
    return this.codeTaken(this.suppliers, 'supplier', 'supplierCode', code, excludeId);
  }

  createSupplier(data: DeepPartial<Supplier>) {
    return this.suppliers.save(this.suppliers.create(data));
  }

  updateSupplier(id: number, data: DeepPartial<Supplier>) {
    return this.suppliers.update({ id }, data);
  }

  deleteSupplier(id: number) {
    return this.suppliers.softDelete({ id });
  }

  findUnits(query: ListMasterDataQueryDto) {
    return this.findPage(this.units, 'unit', ['code', 'name', 'symbol'], query);
  }

  findUnit(id: number) {
    return this.findById(this.units, 'unit', id);
  }

  unitCodeTaken(code: string, excludeId?: number) {
    return this.codeTaken(this.units, 'unit', 'code', code, excludeId);
  }

  createUnit(data: DeepPartial<Unit>) {
    return this.units.save(this.units.create(data));
  }

  updateUnit(id: number, data: DeepPartial<Unit>) {
    return this.units.update({ id }, data);
  }

  deleteUnit(id: number) {
    return this.units.softDelete({ id });
  }

  hasItemsUsingUnit(id: number) {
    return this.items.countBy({ baseUnitId: id }).then((count) => count > 0);
  }

  hasConversionsUsingUnit(id: number) {
    return this.itemConversions.countBy({ unitId: id }).then((count) => count > 0);
  }

  unitExists(id: number) {
    return this.units.countBy({ id }).then((count) => count > 0);
  }

  findItemCategories(query: ListMasterDataQueryDto) {
    return this.findPage(this.itemCategories, 'itemCategory', ['code', 'name'], query);
  }

  findItemCategory(id: number) {
    return this.findById(this.itemCategories, 'itemCategory', id);
  }

  itemCategoryParentId(id: number) {
    return this.itemCategories
      .findOne({ where: { id }, select: { parentId: true } })
      .then((category) => category?.parentId ?? null);
  }

  itemCategoryCodeTaken(code: string, excludeId?: number) {
    return this.codeTaken(this.itemCategories, 'itemCategory', 'code', code, excludeId);
  }

  createItemCategory(data: DeepPartial<ItemCategory>) {
    return this.itemCategories.save(this.itemCategories.create(data));
  }

  updateItemCategory(id: number, data: DeepPartial<ItemCategory>) {
    return this.itemCategories.update({ id }, data);
  }

  deleteItemCategory(id: number) {
    return this.itemCategories.softDelete({ id });
  }

  hasItemsInCategory(id: number) {
    return this.items.countBy({ categoryId: id }).then((count) => count > 0);
  }

  hasChildCategories(id: number) {
    return this.itemCategories.countBy({ parentId: id }).then((count) => count > 0);
  }

  itemCategoryExists(id: number) {
    return this.itemCategories.countBy({ id }).then((count) => count > 0);
  }

  findItems(query: ListMasterDataQueryDto) {
    return this.findPage(this.items, 'item', ['sku', 'name'], query);
  }

  findItem(id: number) {
    return this.findById(this.items, 'item', id);
  }

  itemSkuTaken(sku: string, excludeId?: number) {
    return this.codeTaken(this.items, 'item', 'sku', sku, excludeId);
  }

  createItem(data: DeepPartial<Item>) {
    return this.items.save(this.items.create(data));
  }

  updateItem(id: number, data: DeepPartial<Item>) {
    return this.items.update({ id }, data);
  }

  deleteItem(id: number) {
    return this.items.softDelete({ id });
  }

  findWarehouses(query: ListMasterDataQueryDto) {
    return this.findPage(this.warehouses, 'warehouse', ['code', 'name'], query);
  }

  findWarehouse(id: number) {
    return this.findById(this.warehouses, 'warehouse', id);
  }

  warehouseCodeTaken(code: string, excludeId?: number) {
    return this.codeTaken(this.warehouses, 'warehouse', 'code', code, excludeId);
  }

  createWarehouse(data: DeepPartial<Warehouse>) {
    return this.warehouses.save(this.warehouses.create(data));
  }

  updateWarehouse(id: number, data: DeepPartial<Warehouse>) {
    return this.warehouses.update({ id }, data);
  }

  deleteWarehouse(id: number) {
    return this.warehouses.softDelete({ id });
  }

  private findPage<T extends SoftDeletableEntity>(
    repository: Repository<T>,
    alias: string,
    searchFields: string[],
    query: ListMasterDataQueryDto,
  ) {
    const builder = repository.createQueryBuilder(alias);
    if (query.search) {
      const predicate = searchFields.map((field) => `${alias}.${field} LIKE :search`).join(' OR ');
      builder.andWhere(`(${predicate})`, { search: `%${escapeLike(query.search)}%` });
    }
    return builder
      .orderBy(`${alias}.createdAt`, 'DESC')
      .addOrderBy(`${alias}.id`, 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  private findById<T extends SoftDeletableEntity>(
    repository: Repository<T>,
    alias: string,
    id: number,
  ) {
    return repository
      .createQueryBuilder(alias)
      .where(`${alias}.id = :id`, { id })
      .getOne();
  }

  private codeTaken<T extends SoftDeletableEntity>(
    repository: Repository<T>,
    alias: string,
    field: string,
    value: string,
    excludeId?: number,
  ) {
    const query = repository
      .createQueryBuilder(alias)
      .withDeleted()
      .where(`${alias}.${field} = :value`, { value });
    if (excludeId !== undefined) {
      query.andWhere(`${alias}.id <> :excludeId`, { excludeId });
    }
    return query.getCount().then((count) => count > 0);
  }

}
