import { z } from 'zod';
import { paginationQueryShape } from '../../../shared/helpers/pagination';

const idSchema = z.coerce.number().int().min(1).max(4_294_967_295);
const numberSchema = z.string().trim().min(1).max(50);
const decimal4Schema = z.string().regex(/^\d{1,15}(\.\d{1,4})?$/);
const positiveDecimal4Schema = decimal4Schema.refine(
  (value) => BigInt(value.replace('.', '')) > 0n,
  'Value must be greater than zero',
);

export const financeIdParamsSchema = z.object({ id: idSchema });

export const listSupplierBillsQuerySchema = z.object({
  ...paginationQueryShape,
  search: z.string().trim().min(1).max(100).optional(),
  status: z.string().trim().min(1).max(20).optional(),
  supplierId: idSchema.optional(),
});

const receiptMatchSchema = z.strictObject({
  goodsReceiptLineId: idSchema,
  matchedQuantity: positiveDecimal4Schema,
});

const supplierBillLineSchema = z.strictObject({
  purchaseOrderLineId: idSchema,
  itemId: idSchema,
  unitId: idSchema,
  quantity: positiveDecimal4Schema,
  unitPrice: decimal4Schema,
  receiptMatches: z.array(receiptMatchSchema).min(1).max(100),
});

export const createSupplierBillSchema = z.strictObject({
  billNumber: numberSchema,
  supplierInvoiceNumber: z.string().trim().min(1).max(100),
  supplierId: idSchema,
  purchaseOrderId: idSchema,
  currencyId: idSchema,
  invoiceDate: z.iso.date(),
  dueAt: z.iso.date().nullable().optional(),
  taxTotal: decimal4Schema.default('0.0000'),
  lines: z.array(supplierBillLineSchema).min(1).max(100),
});

export const createSupplierPaymentSchema = z.strictObject({
  paymentNumber: numberSchema,
  supplierId: idSchema,
  currencyId: idSchema,
  amount: positiveDecimal4Schema,
  paymentMethod: z.string().trim().min(1).max(20),
  referenceNumber: z.string().trim().max(100).nullable().optional(),
  paidAt: z.iso.datetime().optional(),
  allocations: z
    .array(
      z.strictObject({
        supplierBillId: idSchema,
        amount: positiveDecimal4Schema,
      }),
    )
    .min(1)
    .max(100)
    .refine(
      (allocations) =>
        new Set(allocations.map((allocation) => allocation.supplierBillId)).size ===
        allocations.length,
      'A bill may appear only once in the allocations',
    ),
});
