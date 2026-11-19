import { z } from 'zod';
import { paginationQueryShape } from '../../../shared/helpers/pagination';

const idSchema = z.coerce.number().int().min(1).max(4_294_967_295);
const codeSchema = z.string().trim().min(1).max(50);
const decimal4Schema = z.string().regex(/^\d{1,15}(\.\d{1,4})?$/);
const positiveDecimal4Schema = decimal4Schema.refine(
  (value) => BigInt(value.replace('.', '')) > 0n,
  'Value must be greater than zero',
);
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();

export const purchaseOrderIdParamsSchema = z.object({ id: idSchema });

export const listPurchaseOrdersQuerySchema = z.object({
  ...paginationQueryShape,
  search: z.string().trim().min(1).max(100).optional(),
  status: z.string().trim().min(1).max(20).optional(),
  supplierId: idSchema.optional(),
});

export const createPurchaseOrderSchema = z.strictObject({
  purchaseOrderNumber: codeSchema,
  supplierId: idSchema,
  currencyId: idSchema,
  requisitionId: idSchema.nullable().optional(),
  expectedAt: z.iso.datetime().nullable().optional(),
  deliveryAddressSnapshot: nullableText(500),
  notes: z.string().max(16_000).nullable().optional(),
  lines: z
    .array(
      z.strictObject({
        itemId: idSchema,
        unitId: idSchema,
        quantity: positiveDecimal4Schema,
        unitPrice: decimal4Schema,
      }),
    )
    .min(1)
    .max(100),
});

export const listGoodsReceiptsQuerySchema = z.object({
  ...paginationQueryShape,
  search: z.string().trim().min(1).max(100).optional(),
  purchaseOrderId: idSchema.optional(),
  supplierId: idSchema.optional(),
  warehouseId: idSchema.optional(),
});

const goodsReceiptLineSchema = z
  .strictObject({
    purchaseOrderLineId: idSchema,
    receivedQuantity: decimal4Schema,
    rejectedQuantity: decimal4Schema.default('0.0000'),
    batchNumber: z.string().trim().min(1).max(80).nullable().optional(),
    warehouseZoneId: idSchema.nullable().optional(),
    manufacturedAt: z.iso.date().nullable().optional(),
    expiresAt: z.iso.date().nullable().optional(),
  })
  .refine(
    (line) => !line.manufacturedAt || !line.expiresAt || line.expiresAt >= line.manufacturedAt,
    {
      path: ['expiresAt'],
      message: 'Expiration date must be on or after the manufacturing date',
    },
  )
  .refine(
    (line) =>
      BigInt(line.receivedQuantity.replace('.', '')) +
        BigInt((line.rejectedQuantity ?? '0.0000').replace('.', '')) >
      0n,
    'At least one received or rejected quantity is required',
  )
  .refine(
    (line) =>
      BigInt(line.receivedQuantity.replace('.', '')) === 0n ||
      Boolean(line.batchNumber && line.warehouseZoneId),
    'Accepted stock requires a batch number and warehouse zone',
  );

export const createGoodsReceiptSchema = z.strictObject({
  receiptNumber: codeSchema,
  purchaseOrderId: idSchema,
  warehouseId: idSchema,
  receivedAt: z.iso.datetime().optional(),
  notes: z.string().max(16_000).nullable().optional(),
  lines: z.array(goodsReceiptLineSchema).min(1).max(100),
});
