import { z } from 'zod';
import { paginationQueryShape } from '../../../shared/helpers/pagination';

const id = z.coerce.number().int().min(1).max(4_294_967_295);
const documentNumber = z.string().trim().min(1).max(50);
const decimal4 = z.string().regex(/^\d{1,15}(\.\d{1,4})?$/);
const positive4 = decimal4.refine(
  (value) => BigInt(value.replace('.', '')) > 0n,
  'Value must be greater than zero',
);
const nonnegative4 = decimal4.refine(
  (value) => BigInt(value.replace('.', '')) >= 0n,
  'Value cannot be negative',
);

export const stockOperationIdParamsSchema = z.object({ id });

export const listStockTransfersQuerySchema = z.object({
  ...paginationQueryShape,
  status: z.enum(['draft', 'in_transit', 'completed']).optional(),
  fromWarehouseId: id.optional(),
  toWarehouseId: id.optional(),
});

export const createStockTransferSchema = z
  .strictObject({
    transferNumber: documentNumber,
    fromWarehouseId: id,
    fromZoneId: id.nullable().optional(),
    toWarehouseId: id,
    toZoneId: id,
    notes: z.string().max(16_000).nullable().optional(),
    lines: z
      .array(
        z.strictObject({
          itemId: id,
          batchId: id,
          unitId: id,
          quantity: positive4,
        }),
      )
      .min(1)
      .max(100)
      .refine(
        (lines) =>
          new Set(lines.map((line) => `${line.itemId}:${line.batchId}:${line.unitId}`)).size ===
          lines.length,
        'Each item, batch and unit combination may appear only once',
      ),
  })
  .refine(
    (value) =>
      value.fromWarehouseId !== value.toWarehouseId ||
      (value.fromZoneId !== null && value.fromZoneId !== undefined
        ? value.fromZoneId !== value.toZoneId
        : false),
    {
      path: ['toWarehouseId'],
      message: 'A transfer must move stock to a different warehouse or zone',
    },
  );

export const receiveStockTransferSchema = z.strictObject({
  lines: z
    .array(
      z.strictObject({
        transferLineId: id,
        receivedQuantity: positive4,
      }),
    )
    .min(1)
    .max(100)
    .refine(
      (lines) => new Set(lines.map((line) => line.transferLineId)).size === lines.length,
      'A transfer line may appear only once per receipt',
    ),
});

export const listStockCountsQuerySchema = z.object({
  ...paginationQueryShape,
  warehouseId: id.optional(),
  status: z.enum(['pending_approval', 'approved']).optional(),
});

export const createStockCountSchema = z.strictObject({
  countNumber: documentNumber,
  warehouseId: id,
  zoneId: id,
  lines: z
    .array(
      z.strictObject({
        itemId: id,
        batchId: id,
        unitId: id,
        countedQuantity: nonnegative4,
        discrepancyReason: z.string().trim().max(255).nullable().optional(),
      }),
    )
    .min(1)
    .max(500)
    .refine(
      (lines) =>
        new Set(lines.map((line) => `${line.itemId}:${line.batchId}:${line.unitId}`)).size ===
        lines.length,
      'Each item, batch and unit combination may appear only once',
    ),
});

export const listStockWriteoffsQuerySchema = z.object({
  ...paginationQueryShape,
  status: z.enum(['pending_approval', 'approved', 'rejected']).optional(),
});

export const createStockWriteoffSchema = z.strictObject({
  writeoffNumber: documentNumber,
  reason: z.string().trim().min(1).max(16_000),
  lines: z
    .array(
      z.strictObject({
        itemId: id,
        batchId: id,
        unitId: id,
        quantity: positive4,
        reason: z.string().trim().min(1).max(255),
      }),
    )
    .min(1)
    .max(100)
    .refine(
      (lines) =>
        new Set(lines.map((line) => `${line.itemId}:${line.batchId}:${line.unitId}`)).size ===
        lines.length,
      'Each item, batch and unit combination may appear only once',
    ),
});

export const rejectStockWriteoffSchema = z.strictObject({
  reason: z.string().trim().min(1).max(2_000),
});
