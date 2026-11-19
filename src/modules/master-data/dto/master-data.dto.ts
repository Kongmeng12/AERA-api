import { z } from 'zod';
import type {
  createCustomerSchema,
  createCustomerTypeSchema,
  createItemCategorySchema,
  createItemSchema,
  createSupplierSchema,
  createUnitSchema,
  createWarehouseSchema,
  listMasterDataQuerySchema,
  patchCustomerSchema,
  patchCustomerTypeSchema,
  patchItemCategorySchema,
  patchItemSchema,
  patchSupplierSchema,
  patchUnitSchema,
  patchWarehouseSchema,
} from '../validators/master-data.validator';
import type { Customer, CustomerType } from '../entities/customer.entity';
import type { Item, ItemCategory, Unit } from '../entities/item.entity';
import type { Supplier } from '../entities/supplier.entity';
import type { Warehouse } from '../entities/warehouse.entity';

export type ListMasterDataQueryDto = z.infer<typeof listMasterDataQuerySchema>;
export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;
export type PatchCustomerDto = z.infer<typeof patchCustomerSchema>;
export type CreateCustomerTypeDto = z.infer<typeof createCustomerTypeSchema>;
export type PatchCustomerTypeDto = z.infer<typeof patchCustomerTypeSchema>;
export type CreateSupplierDto = z.infer<typeof createSupplierSchema>;
export type PatchSupplierDto = z.infer<typeof patchSupplierSchema>;
export type CreateUnitDto = z.infer<typeof createUnitSchema>;
export type PatchUnitDto = z.infer<typeof patchUnitSchema>;
export type CreateItemCategoryDto = z.infer<typeof createItemCategorySchema>;
export type PatchItemCategoryDto = z.infer<typeof patchItemCategorySchema>;
export type CreateItemDto = z.infer<typeof createItemSchema>;
export type PatchItemDto = z.infer<typeof patchItemSchema>;
export type CreateWarehouseDto = z.infer<typeof createWarehouseSchema>;
export type PatchWarehouseDto = z.infer<typeof patchWarehouseSchema>;

const timestamps = {
  id: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
};

export const customerTypeResponseSchema = z.object({
  ...timestamps,
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});
export type CustomerTypeResponseDto = z.infer<typeof customerTypeResponseSchema>;

export function toCustomerTypeResponse(entity: CustomerType): CustomerTypeResponseDto {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
    description: entity.description,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export const customerResponseSchema = z.object({
  ...timestamps,
  customerCode: z.string(),
  customerTypeId: z.number().int(),
  name: z.string(),
  contactName: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  email: z.string().nullable(),
  taxNumber: z.string().nullable(),
  creditLimit: z.string(),
  creditCurrencyId: z.number().int().nullable(),
  creditTermDays: z.number().int(),
  salesEmployeeId: z.number().int().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
});
export type CustomerResponseDto = z.infer<typeof customerResponseSchema>;

export function toCustomerResponse(entity: Customer): CustomerResponseDto {
  return {
    id: entity.id,
    customerCode: entity.customerCode,
    customerTypeId: entity.customerTypeId,
    name: entity.name,
    contactName: entity.contactName,
    phoneNumber: entity.phoneNumber,
    email: entity.email,
    taxNumber: entity.taxNumber,
    creditLimit: entity.creditLimit,
    creditCurrencyId: entity.creditCurrencyId,
    creditTermDays: entity.creditTermDays,
    salesEmployeeId: entity.salesEmployeeId,
    status: entity.status,
    notes: entity.notes,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export const supplierResponseSchema = z.object({
  ...timestamps,
  supplierCode: z.string(),
  name: z.string(),
  contactName: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  email: z.string().nullable(),
  taxNumber: z.string().nullable(),
  addressText: z.string().nullable(),
  paymentTermDays: z.number().int(),
  status: z.string(),
  notes: z.string().nullable(),
});
export type SupplierResponseDto = z.infer<typeof supplierResponseSchema>;

export function toSupplierResponse(entity: Supplier): SupplierResponseDto {
  return {
    id: entity.id,
    supplierCode: entity.supplierCode,
    name: entity.name,
    contactName: entity.contactName,
    phoneNumber: entity.phoneNumber,
    email: entity.email,
    taxNumber: entity.taxNumber,
    addressText: entity.addressText,
    paymentTermDays: entity.paymentTermDays,
    status: entity.status,
    notes: entity.notes,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export const unitResponseSchema = z.object({
  ...timestamps,
  code: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimalPlaces: z.number().int(),
});
export type UnitResponseDto = z.infer<typeof unitResponseSchema>;

export function toUnitResponse(entity: Unit): UnitResponseDto {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
    symbol: entity.symbol,
    decimalPlaces: entity.decimalPlaces,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export const itemCategoryResponseSchema = z.object({
  ...timestamps,
  code: z.string(),
  name: z.string(),
  parentId: z.number().int().nullable(),
  description: z.string().nullable(),
});
export type ItemCategoryResponseDto = z.infer<typeof itemCategoryResponseSchema>;

export function toItemCategoryResponse(entity: ItemCategory): ItemCategoryResponseDto {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
    parentId: entity.parentId,
    description: entity.description,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export const itemResponseSchema = z.object({
  ...timestamps,
  sku: z.string(),
  categoryId: z.number().int(),
  baseUnitId: z.number().int(),
  name: z.string(),
  itemType: z.string(),
  description: z.string().nullable(),
  shelfLifeDays: z.number().int().nullable(),
  dailyProductionCapacity: z.string().nullable(),
  reorderPoint: z.string(),
  status: z.string(),
});
export type ItemResponseDto = z.infer<typeof itemResponseSchema>;

export function toItemResponse(entity: Item): ItemResponseDto {
  return {
    id: entity.id,
    sku: entity.sku,
    categoryId: entity.categoryId,
    baseUnitId: entity.baseUnitId,
    name: entity.name,
    itemType: entity.itemType,
    description: entity.description,
    shelfLifeDays: entity.shelfLifeDays,
    dailyProductionCapacity: entity.dailyProductionCapacity,
    reorderPoint: entity.reorderPoint,
    status: entity.status,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export const warehouseResponseSchema = z.object({
  ...timestamps,
  code: z.string(),
  name: z.string(),
  addressText: z.string().nullable(),
  status: z.string(),
});
export type WarehouseResponseDto = z.infer<typeof warehouseResponseSchema>;

export function toWarehouseResponse(entity: Warehouse): WarehouseResponseDto {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
    addressText: entity.addressText,
    status: entity.status,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
