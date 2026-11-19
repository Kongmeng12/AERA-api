import { z } from 'zod';
import { paginationQueryShape } from '../../../shared/helpers/pagination';

const id = z.coerce.number().int().min(1).max(4_294_967_295);
const code = z.string().trim().min(1).max(50);
const decimal4 = z.string().regex(/^\d{1,15}(\.\d{1,4})?$/);
const decimal6 = z.string().regex(/^\d{1,13}(\.\d{1,6})?$/);
const positive4 = decimal4.refine((value) => Number(value) > 0, 'Value must be greater than zero');
const positive6 = decimal6.refine((value) => Number(value) > 0, 'Value must be greater than zero');

export const productionIdParamsSchema = z.object({ id });
export const listProductionOrdersQuerySchema = z.object({
  ...paginationQueryShape,
  status: z.string().trim().min(1).max(20).optional(),
  itemId: id.optional(),
});
export const listBomsQuerySchema = z.object({
  ...paginationQueryShape,
  itemId: id.optional(),
  status: z.enum(['draft', 'active', 'inactive']).optional(),
});

export const createBomSchema = z
  .strictObject({
    itemId: id,
    revision: z.string().trim().min(1).max(30),
    effectiveFrom: z.iso.date(),
    effectiveTo: z.iso.date().nullable().optional(),
    lines: z
      .array(
        z.strictObject({
          materialItemId: id,
          unitId: id,
          quantity: positive6,
          scrapPercent: z
            .string()
            .regex(/^\d{1,4}(\.\d{1,4})?$/)
            .default('0'),
        }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    (value) => new Set(value.lines.map((line) => line.materialItemId)).size === value.lines.length,
    {
      path: ['lines'],
      message: 'A material may appear only once in a bill of materials',
    },
  )
  .refine((value) => !value.effectiveTo || value.effectiveTo >= value.effectiveFrom, {
    path: ['effectiveTo'],
    message: 'Effective end date must be on or after start date',
  });

export const createProductionOrderSchema = z.strictObject({
  productionOrderNumber: code,
  billOfMaterialsId: id,
  plannedQuantity: positive4,
  outputUnitId: id,
  plannedStartAt: z.iso.datetime(),
  notes: z.string().max(16_000).nullable().optional(),
});

export const issueMaterialsSchema = z.strictObject({
  lines: z
    .array(
      z.strictObject({
        materialItemId: id,
        batchId: id,
        quantity: positive4,
      }),
    )
    .min(1)
    .max(100),
});

export const recordOutputSchema = z
  .strictObject({
    batchNumber: z.string().trim().min(1).max(80),
    quantity: positive4,
    warehouseId: id,
    warehouseZoneId: id,
    manufacturedAt: z.iso.date().nullable().optional(),
    expiresAt: z.iso.date().nullable().optional(),
  })
  .refine(
    (value) => !value.manufacturedAt || !value.expiresAt || value.expiresAt >= value.manufacturedAt,
    {
      path: ['expiresAt'],
      message: 'Expiration date must be on or after manufacturing date',
    },
  );
