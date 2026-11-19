import { z } from 'zod';
import { paginationQueryShape } from '../../../shared/helpers/pagination';

const idSchema = z.coerce.number().int().min(1).max(4_294_967_295);
const codeSchema = (max: number) => z.string().trim().min(1).max(max);
const nameSchema = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const decimal19Scale4 = z.string().regex(/^\d{1,15}(\.\d{1,4})?$/);
const statusSchema = z.enum(['active', 'inactive']);
const customerStatusSchema = z.enum(['active', 'inactive', 'blocked']);

export const masterDataIdParamsSchema = z.object({ id: idSchema });

export const listMasterDataQuerySchema = z.object({
  ...paginationQueryShape,
  search: z.string().trim().min(1).max(100).optional(),
});

export const createCustomerTypeSchema = z.strictObject({
  code: codeSchema(50),
  name: nameSchema(150),
  description: optionalText(255),
});

export const patchCustomerTypeSchema = createCustomerTypeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const createCustomerSchema = z.strictObject({
  customerCode: codeSchema(50),
  customerTypeId: idSchema,
  name: nameSchema(200),
  contactName: optionalText(150),
  phoneNumber: optionalText(30),
  email: z.email().trim().toLowerCase().max(255).nullable().optional(),
  taxNumber: optionalText(50),
  creditLimit: decimal19Scale4.default('0.0000'),
  creditCurrencyId: idSchema.nullable().optional(),
  creditTermDays: z.number().int().min(0).max(4_294_967_295).default(0),
  salesEmployeeId: idSchema.nullable().optional(),
  status: customerStatusSchema.default('active'),
  notes: z.string().max(16_000).nullable().optional(),
});

export const patchCustomerSchema = z
  .strictObject({
    customerCode: codeSchema(50).optional(),
    customerTypeId: idSchema.optional(),
    name: nameSchema(200).optional(),
    contactName: optionalText(150),
    phoneNumber: optionalText(30),
    email: z.email().trim().toLowerCase().max(255).nullable().optional(),
    taxNumber: optionalText(50),
    creditLimit: decimal19Scale4.optional(),
    creditCurrencyId: idSchema.nullable().optional(),
    creditTermDays: z.number().int().min(0).max(4_294_967_295).optional(),
    salesEmployeeId: idSchema.nullable().optional(),
    status: customerStatusSchema.optional(),
    notes: z.string().max(16_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const createSupplierSchema = z.strictObject({
  supplierCode: codeSchema(50),
  name: nameSchema(200),
  contactName: optionalText(150),
  phoneNumber: optionalText(30),
  email: z.email().trim().toLowerCase().max(255).nullable().optional(),
  taxNumber: optionalText(50),
  addressText: optionalText(500),
  paymentTermDays: z.number().int().min(0).max(4_294_967_295).default(0),
  status: statusSchema.default('active'),
  notes: z.string().max(16_000).nullable().optional(),
});

export const patchSupplierSchema = z
  .strictObject({
    supplierCode: codeSchema(50).optional(),
    name: nameSchema(200).optional(),
    contactName: optionalText(150),
    phoneNumber: optionalText(30),
    email: z.email().trim().toLowerCase().max(255).nullable().optional(),
    taxNumber: optionalText(50),
    addressText: optionalText(500),
    paymentTermDays: z.number().int().min(0).max(4_294_967_295).optional(),
    status: statusSchema.optional(),
    notes: z.string().max(16_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const createUnitSchema = z.strictObject({
  code: codeSchema(30),
  name: nameSchema(100),
  symbol: nameSchema(30),
  decimalPlaces: z.number().int().min(0).max(255).default(0),
});

export const patchUnitSchema = z
  .strictObject({
    code: codeSchema(30).optional(),
    name: nameSchema(100).optional(),
    symbol: nameSchema(30).optional(),
    decimalPlaces: z.number().int().min(0).max(255).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const createItemCategorySchema = z.strictObject({
  code: codeSchema(50),
  name: nameSchema(150),
  parentId: idSchema.nullable().optional(),
  description: optionalText(255),
});

export const patchItemCategorySchema = createItemCategorySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const createItemSchema = z.strictObject({
  sku: codeSchema(50),
  categoryId: idSchema,
  baseUnitId: idSchema,
  name: nameSchema(200),
  itemType: codeSchema(30),
  description: z.string().max(16_000).nullable().optional(),
  shelfLifeDays: z.number().int().min(0).max(4_294_967_295).nullable().optional(),
  dailyProductionCapacity: decimal19Scale4.nullable().optional(),
  reorderPoint: decimal19Scale4.default('0.0000'),
  status: statusSchema.default('active'),
});

export const patchItemSchema = z
  .strictObject({
    sku: codeSchema(50).optional(),
    categoryId: idSchema.optional(),
    baseUnitId: idSchema.optional(),
    name: nameSchema(200).optional(),
    itemType: codeSchema(30).optional(),
    description: z.string().max(16_000).nullable().optional(),
    shelfLifeDays: z.number().int().min(0).max(4_294_967_295).nullable().optional(),
    dailyProductionCapacity: decimal19Scale4.nullable().optional(),
    reorderPoint: decimal19Scale4.optional(),
    status: statusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const createWarehouseSchema = z.strictObject({
  code: codeSchema(50),
  name: nameSchema(150),
  addressText: optionalText(500),
  status: statusSchema.default('active'),
});

export const patchWarehouseSchema = z
  .strictObject({
    code: codeSchema(50).optional(),
    name: nameSchema(150).optional(),
    addressText: optionalText(500),
    status: statusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
