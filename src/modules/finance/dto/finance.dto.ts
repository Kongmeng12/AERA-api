import { z } from 'zod';
import type {
  SupplierBill,
  SupplierBillLine,
  SupplierBillReceiptMatch,
  SupplierPayment,
  SupplierPaymentAllocation,
} from '../entities/accounts-payable.entity';
import type {
  createSupplierBillSchema,
  createSupplierPaymentSchema,
  listSupplierBillsQuerySchema,
} from '../validators/finance.validator';

export type ListSupplierBillsQueryDto = z.infer<typeof listSupplierBillsQuerySchema>;
export type CreateSupplierBillDto = z.infer<typeof createSupplierBillSchema>;
export type CreateSupplierPaymentDto = z.infer<typeof createSupplierPaymentSchema>;

export const supplierBillResponseSchema = z.object({
  id: z.number().int(),
  billNumber: z.string(),
  supplierInvoiceNumber: z.string(),
  supplierId: z.number().int(),
  purchaseOrderId: z.number().int().nullable(),
  currencyId: z.number().int(),
  invoiceDate: z.string(),
  dueAt: z.string().nullable(),
  status: z.string(),
  subtotal: z.string(),
  taxTotal: z.string(),
  total: z.string(),
  balanceDue: z.string(),
  recordedById: z.number().int(),
  lines: z.array(
    z.object({
      id: z.number().int(),
      lineNumber: z.number().int(),
      purchaseOrderLineId: z.number().int().nullable(),
      itemId: z.number().int(),
      unitId: z.number().int(),
      quantity: z.string(),
      unitPrice: z.string(),
      lineTotal: z.string(),
      receiptMatches: z.array(
        z.object({
          goodsReceiptLineId: z.number().int(),
          matchedQuantity: z.string(),
          matchedUnitPrice: z.string(),
        }),
      ),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SupplierBillResponseDto = z.infer<typeof supplierBillResponseSchema>;

export const supplierPaymentResponseSchema = z.object({
  id: z.number().int(),
  paymentNumber: z.string(),
  supplierId: z.number().int(),
  currencyId: z.number().int(),
  amount: z.string(),
  paymentMethod: z.string(),
  referenceNumber: z.string().nullable(),
  paidAt: z.string(),
  paidById: z.number().int(),
  status: z.string(),
  allocations: z.array(
    z.object({
      supplierBillId: z.number().int(),
      amount: z.string(),
      balanceDue: z.string(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SupplierPaymentResponseDto = z.infer<typeof supplierPaymentResponseSchema>;

export function toSupplierBillResponse(
  bill: SupplierBill,
  lines: SupplierBillLine[],
  matches: SupplierBillReceiptMatch[],
  balanceDue: string,
): SupplierBillResponseDto {
  const matchesByLine = new Map<number, SupplierBillReceiptMatch[]>();
  for (const match of matches) {
    const list = matchesByLine.get(match.supplierBillLineId) ?? [];
    list.push(match);
    matchesByLine.set(match.supplierBillLineId, list);
  }
  return {
    id: bill.id,
    billNumber: bill.billNumber,
    supplierInvoiceNumber: bill.supplierInvoiceNumber,
    supplierId: bill.supplierId,
    purchaseOrderId: bill.purchaseOrderId,
    currencyId: bill.currencyId,
    invoiceDate: bill.invoiceDate,
    dueAt: bill.dueAt,
    status: bill.status,
    subtotal: bill.subtotal,
    taxTotal: bill.taxTotal,
    total: bill.total,
    balanceDue,
    recordedById: bill.recordedById,
    lines: lines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      purchaseOrderLineId: line.purchaseOrderLineId,
      itemId: line.itemId,
      unitId: line.unitId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      receiptMatches: (matchesByLine.get(line.id) ?? []).map((match) => ({
        goodsReceiptLineId: match.goodsReceiptLineId,
        matchedQuantity: match.matchedQuantity,
        matchedUnitPrice: match.matchedUnitPrice,
      })),
    })),
    createdAt: bill.createdAt.toISOString(),
    updatedAt: bill.updatedAt.toISOString(),
  };
}

export function toSupplierPaymentResponse(
  payment: SupplierPayment,
  allocations: SupplierPaymentAllocation[],
  balancesDue: Map<number, string>,
): SupplierPaymentResponseDto {
  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    supplierId: payment.supplierId,
    currencyId: payment.currencyId,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    referenceNumber: payment.referenceNumber,
    paidAt: payment.paidAt.toISOString(),
    paidById: payment.paidById,
    status: payment.status,
    allocations: allocations.map((allocation) => ({
      supplierBillId: allocation.supplierBillId,
      amount: allocation.amount,
      balanceDue: balancesDue.get(allocation.supplierBillId) ?? '0.0000',
    })),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}
