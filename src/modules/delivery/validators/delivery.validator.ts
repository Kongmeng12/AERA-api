import { z } from 'zod';
import { paginationQueryShape } from '../../../shared/helpers/pagination';

const idSchema = z.coerce.number().int().min(1).max(4_294_967_295);
const numberSchema = z.string().trim().min(1).max(50);
const decimal4Schema = z.string().regex(/^\d{1,15}(\.\d{1,4})?$/);
const positiveDecimal4Schema = decimal4Schema.refine(
  (value) => BigInt(value.replace('.', '')) > 0n,
  'Value must be greater than zero',
);

export const deliveryIdParamsSchema = z.object({ id: idSchema });

export const listDeliveriesQuerySchema = z.object({
  ...paginationQueryShape,
  status: z.string().trim().min(1).max(20).optional(),
  driverId: idSchema.optional(),
  salesOrderId: idSchema.optional(),
});

export const createDeliverySchema = z.strictObject({
  deliveryNumber: numberSchema,
  salesOrderId: idSchema,
  plannedAt: z.iso.datetime(),
  routeId: idSchema.nullable().optional(),
  vehicleId: idSchema.nullable().optional(),
  driverId: idSchema.nullable().optional(),
  notes: z.string().max(16_000).nullable().optional(),
  lines: z
    .array(
      z.strictObject({
        salesOrderLineId: idSchema,
        plannedQuantity: positiveDecimal4Schema,
      }),
    )
    .min(1)
    .max(100),
});

export const completeDeliverySchema = z
  .strictObject({
    invoiceNumber: numberSchema.optional(),
    lines: z
      .array(
        z.strictObject({
          deliveryLineId: idSchema,
          deliveredQuantity: decimal4Schema,
          returnedQuantity: decimal4Schema.default('0.0000'),
        }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    (value) =>
      !value.lines.some((line) => BigInt(line.deliveredQuantity.replace('.', '')) > 0n) ||
      Boolean(value.invoiceNumber),
    { path: ['invoiceNumber'], message: 'An invoice number is required when goods are delivered' },
  );

export type CompleteDeliveryDto = z.infer<typeof completeDeliverySchema>;
