import { z } from 'zod';
import { paginationQueryShape } from '../../../shared/helpers/pagination';

const idSchema = z.coerce.number().int().min(1).max(4_294_967_295);
const numberSchema = z.string().trim().min(1).max(50);
const decimal4Schema = z.string().regex(/^\d{1,15}(\.\d{1,4})?$/);
const positiveDecimal4Schema = decimal4Schema.refine(
  (value) => BigInt(value.replace('.', '')) > 0n,
  'Value must be greater than zero',
);

export const salesIdParamsSchema = z.object({ id: idSchema });

export const listSalesOrdersQuerySchema = z.object({
  ...paginationQueryShape,
  search: z.string().trim().min(1).max(100).optional(),
  customerId: idSchema.optional(),
  status: z.string().trim().min(1).max(25).optional(),
});

export const salesOrderCancellationSchema = z.strictObject({
  reason: z.string().trim().min(1).max(2000),
});

export const createSalesOrderSchema = z.strictObject({
  orderNumber: numberSchema,
  customerId: idSchema,
  customerAddressId: idSchema.nullable().optional(),
  currencyId: idSchema,
  requestedDeliveryAt: z.iso.datetime().nullable().optional(),
  notes: z.string().max(16_000).nullable().optional(),
  lines: z
    .array(
      z.strictObject({
        itemId: idSchema,
        unitId: idSchema,
        quantity: positiveDecimal4Schema,
      }),
    )
    .min(1)
    .max(100),
});

export const createSalesPriceSchema = z
  .strictObject({
    itemId: idSchema,
    unitId: idSchema,
    customerTypeId: idSchema.nullable().optional(),
    customerId: idSchema.nullable().optional(),
    currencyId: idSchema,
    unitPrice: decimal4Schema,
    effectiveFrom: z.iso.datetime(),
    effectiveTo: z.iso.datetime().nullable().optional(),
  })
  .refine(
    (value) => !value.effectiveTo || new Date(value.effectiveTo) >= new Date(value.effectiveFrom),
    { path: ['effectiveTo'], message: 'effectiveTo must be on or after effectiveFrom' },
  )
  .refine((value) => !(value.customerTypeId && value.customerId), {
    path: ['customerId'],
    message: 'Set either customerId or customerTypeId, not both',
  });

export const listSalesInvoicesQuerySchema = z.object({
  ...paginationQueryShape,
  customerId: idSchema.optional(),
  salesOrderId: idSchema.optional(),
  status: z.string().trim().min(1).max(20).optional(),
});

export const listSalesPricesQuerySchema = z.object({
  ...paginationQueryShape,
  itemId: idSchema.optional(),
});

export const createPaymentReceiptSchema = z.strictObject({
  receiptNumber: numberSchema,
  customerId: idSchema,
  currencyId: idSchema,
  receivedAmount: positiveDecimal4Schema,
  paymentMethod: z.enum(['cash', 'bank_transfer', 'card', 'cheque', 'other']),
  referenceNumber: z.string().trim().max(100).nullable().optional(),
  receivedAt: z.iso.datetime().optional(),
  allocations: z
    .array(
      z.strictObject({
        salesInvoiceId: idSchema,
        amount: positiveDecimal4Schema,
      }),
    )
    .min(1)
    .max(100),
});
