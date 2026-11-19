import { z } from 'zod';
import type {
  createPaymentReceiptSchema,
  createSalesOrderSchema,
  createSalesPriceSchema,
  listSalesInvoicesQuerySchema,
  listSalesOrdersQuerySchema,
  listSalesPricesQuerySchema,
} from '../validators/sales.validator';
import type {
  PaymentAllocation,
  PaymentReceipt,
  SalesInvoice,
  SalesInvoiceLine,
} from '../entities/invoice-payment.entity';
import type { SalesOrder, SalesOrderLine } from '../entities/sales-order.entity';
import type { SalesPrice } from '../../master-data/entities/pricing.entity';

export type ListSalesOrdersQueryDto = z.infer<typeof listSalesOrdersQuerySchema>;
export type CreateSalesOrderDto = z.infer<typeof createSalesOrderSchema>;
export type CreateSalesPriceDto = z.infer<typeof createSalesPriceSchema>;
export type ListSalesInvoicesQueryDto = z.infer<typeof listSalesInvoicesQuerySchema>;
export type ListSalesPricesQueryDto = z.infer<typeof listSalesPricesQuerySchema>;
export type CreatePaymentReceiptDto = z.infer<typeof createPaymentReceiptSchema>;

export const salesPriceResponseSchema = z.object({
  id: z.number().int(),
  itemId: z.number().int(),
  unitId: z.number().int(),
  customerTypeId: z.number().int().nullable(),
  customerId: z.number().int().nullable(),
  currencyId: z.number().int(),
  unitPrice: z.string(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
});
export type SalesPriceResponseDto = z.infer<typeof salesPriceResponseSchema>;

export function toSalesPriceResponse(price: SalesPrice): SalesPriceResponseDto {
  return {
    id: price.id,
    itemId: price.itemId,
    unitId: price.unitId,
    customerTypeId: price.customerTypeId,
    customerId: price.customerId,
    currencyId: price.currencyId,
    unitPrice: price.unitPrice,
    effectiveFrom: price.effectiveFrom.toISOString(),
    effectiveTo: price.effectiveTo?.toISOString() ?? null,
  };
}

export const salesOrderLineResponseSchema = z.object({
  id: z.number().int(),
  lineNumber: z.number().int(),
  itemId: z.number().int(),
  unitId: z.number().int(),
  itemSkuSnapshot: z.string(),
  itemNameSnapshot: z.string(),
  unitCodeSnapshot: z.string(),
  quantity: z.string(),
  priceId: z.number().int().nullable(),
  unitPrice: z.string(),
  discountAmount: z.string(),
  taxRate: z.string(),
  lineTotal: z.string(),
});

export const salesOrderResponseSchema = z.object({
  id: z.number().int(),
  orderNumber: z.string(),
  customerId: z.number().int(),
  customerAddressId: z.number().int().nullable(),
  deliveryAddressSnapshot: z.string().nullable(),
  salesEmployeeId: z.number().int().nullable(),
  createdById: z.number().int(),
  orderedAt: z.string(),
  requestedDeliveryAt: z.string().nullable(),
  currencyId: z.number().int(),
  status: z.string(),
  subtotal: z.string(),
  discountTotal: z.string(),
  taxTotal: z.string(),
  total: z.string(),
  notes: z.string().nullable(),
  lines: z.array(salesOrderLineResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SalesOrderResponseDto = z.infer<typeof salesOrderResponseSchema>;

export function toSalesOrderResponse(
  order: SalesOrder,
  lines: SalesOrderLine[],
): SalesOrderResponseDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    customerAddressId: order.customerAddressId,
    deliveryAddressSnapshot: order.deliveryAddressSnapshot,
    salesEmployeeId: order.salesEmployeeId,
    createdById: order.createdById,
    orderedAt: order.orderedAt.toISOString(),
    requestedDeliveryAt: order.requestedDeliveryAt?.toISOString() ?? null,
    currencyId: order.currencyId,
    status: order.status,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    taxTotal: order.taxTotal,
    total: order.total,
    notes: order.notes,
    lines: lines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      itemId: line.itemId,
      unitId: line.unitId,
      itemSkuSnapshot: line.itemSkuSnapshot,
      itemNameSnapshot: line.itemNameSnapshot,
      unitCodeSnapshot: line.unitCodeSnapshot,
      quantity: line.quantity,
      priceId: line.priceId,
      unitPrice: line.unitPrice,
      discountAmount: line.discountAmount,
      taxRate: line.taxRate,
      lineTotal: line.lineTotal,
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export const salesInvoiceLineResponseSchema = z.object({
  id: z.number().int(),
  lineNumber: z.number().int(),
  salesOrderLineId: z.number().int(),
  itemId: z.number().int(),
  unitId: z.number().int(),
  itemNameSnapshot: z.string(),
  itemSkuSnapshot: z.string(),
  unitCodeSnapshot: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  discountAmount: z.string(),
  taxRate: z.string(),
  lineTotal: z.string(),
});

export const salesInvoiceResponseSchema = z.object({
  id: z.number().int(),
  invoiceNumber: z.string(),
  salesOrderId: z.number().int(),
  customerId: z.number().int(),
  currencyId: z.number().int(),
  issuedAt: z.string(),
  dueAt: z.string().nullable(),
  status: z.string(),
  subtotal: z.string(),
  discountTotal: z.string(),
  taxTotal: z.string(),
  total: z.string(),
  lines: z.array(salesInvoiceLineResponseSchema),
});
export type SalesInvoiceResponseDto = z.infer<typeof salesInvoiceResponseSchema>;

export function toSalesInvoiceResponse(
  invoice: SalesInvoice,
  lines: SalesInvoiceLine[],
): SalesInvoiceResponseDto {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    salesOrderId: invoice.salesOrderId,
    customerId: invoice.customerId,
    currencyId: invoice.currencyId,
    issuedAt: invoice.issuedAt.toISOString(),
    dueAt: invoice.dueAt?.toISOString() ?? null,
    status: invoice.status,
    subtotal: invoice.subtotal,
    discountTotal: invoice.discountTotal,
    taxTotal: invoice.taxTotal,
    total: invoice.total,
    lines: lines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      salesOrderLineId: line.salesOrderLineId,
      itemId: line.itemId,
      unitId: line.unitId,
      itemNameSnapshot: line.itemNameSnapshot,
      itemSkuSnapshot: line.itemSkuSnapshot,
      unitCodeSnapshot: line.unitCodeSnapshot,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountAmount: line.discountAmount,
      taxRate: line.taxRate,
      lineTotal: line.lineTotal,
    })),
  };
}

export const paymentReceiptResponseSchema = z.object({
  id: z.number().int(),
  receiptNumber: z.string(),
  customerId: z.number().int(),
  currencyId: z.number().int(),
  receivedAmount: z.string(),
  paymentMethod: z.string(),
  referenceNumber: z.string().nullable(),
  receivedAt: z.string(),
  status: z.string(),
  allocations: z.array(
    z.object({
      salesInvoiceId: z.number().int(),
      amount: z.string(),
    }),
  ),
});
export type PaymentReceiptResponseDto = z.infer<typeof paymentReceiptResponseSchema>;

export function toPaymentReceiptResponse(
  receipt: PaymentReceipt,
  allocations: PaymentAllocation[],
): PaymentReceiptResponseDto {
  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    customerId: receipt.customerId,
    currencyId: receipt.currencyId,
    receivedAmount: receipt.receivedAmount,
    paymentMethod: receipt.paymentMethod,
    referenceNumber: receipt.referenceNumber,
    receivedAt: receipt.receivedAt.toISOString(),
    status: receipt.status,
    allocations: allocations.map((allocation) => ({
      salesInvoiceId: allocation.salesInvoiceId,
      amount: allocation.amount,
    })),
  };
}
