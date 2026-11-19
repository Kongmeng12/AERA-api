import { z } from 'zod';
import { paginationQueryShape } from '../../../shared/helpers/pagination';

const idSchema = z.coerce.number().int().min(1).max(4_294_967_295);
const numberSchema = z.string().trim().min(1).max(50);
const positiveDecimal4Schema = z
  .string()
  .regex(/^\d{1,15}(\.\d{1,4})?$/)
  .refine((value) => BigInt(value.replace('.', '')) > 0n, 'Value must be greater than zero');

export const returnIdParamsSchema = z.object({ id: idSchema });

export const listReturnsQuerySchema = z.object({
  ...paginationQueryShape,
  salesInvoiceId: idSchema.optional(),
  status: z.string().trim().min(1).max(20).optional(),
});

export const createSalesReturnSchema = z.strictObject({
  returnNumber: numberSchema,
  salesInvoiceId: idSchema,
  reason: z.string().trim().min(1).max(4000),
  lines: z
    .array(
      z.strictObject({
        salesInvoiceLineId: idSchema,
        batchId: idSchema,
        quantity: positiveDecimal4Schema,
        reason: z.string().trim().max(2000).nullable().optional(),
      }),
    )
    .min(1)
    .max(100)
    .refine(
      (lines) => new Set(lines.map((line) => line.salesInvoiceLineId)).size === lines.length,
      'An invoice line may appear only once in a return',
    ),
});

export const approveSalesReturnSchema = z.strictObject({
  creditNoteNumber: numberSchema,
});

export const rejectSalesReturnSchema = z.strictObject({
  reason: z.string().trim().min(1).max(2000),
});
