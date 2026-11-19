import { z } from 'zod';
import type {
  approveSalesReturnSchema,
  createSalesReturnSchema,
  listReturnsQuerySchema,
  rejectSalesReturnSchema,
} from '../validators/returns.validator';
import type { SalesReturn, SalesReturnLine } from '../../sales/entities/sales-return.entity';

export type CreateSalesReturnDto = z.infer<typeof createSalesReturnSchema>;
export type ApproveSalesReturnDto = z.infer<typeof approveSalesReturnSchema>;
export type RejectSalesReturnDto = z.infer<typeof rejectSalesReturnSchema>;
export type ListReturnsQueryDto = z.infer<typeof listReturnsQuerySchema>;

export const salesReturnLineResponseSchema = z.object({
  id: z.number().int(),
  salesInvoiceLineId: z.number().int(),
  lineNumber: z.number().int(),
  itemId: z.number().int(),
  batchId: z.number().int().nullable(),
  unitId: z.number().int(),
  quantity: z.string(),
  disposition: z.string(),
  unitPriceSnapshot: z.string(),
  lineCreditAmount: z.string(),
  reason: z.string().nullable(),
});

export const salesReturnResponseSchema = z.object({
  id: z.number().int(),
  returnNumber: z.string(),
  salesInvoiceId: z.number().int(),
  customerId: z.number().int(),
  requestedById: z.number().int(),
  requestedAt: z.string(),
  status: z.string(),
  reason: z.string(),
  creditNoteId: z.number().int().nullable(),
  lines: z.array(salesReturnLineResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SalesReturnResponseDto = z.infer<typeof salesReturnResponseSchema>;

export function toSalesReturnResponse(
  salesReturn: SalesReturn,
  lines: SalesReturnLine[],
): SalesReturnResponseDto {
  return {
    id: salesReturn.id,
    returnNumber: salesReturn.returnNumber,
    salesInvoiceId: salesReturn.salesInvoiceId,
    customerId: salesReturn.customerId,
    requestedById: salesReturn.requestedById,
    requestedAt: salesReturn.requestedAt.toISOString(),
    status: salesReturn.status,
    reason: salesReturn.reason,
    creditNoteId: salesReturn.creditNoteId,
    lines: lines.map((line) => ({
      id: line.id,
      salesInvoiceLineId: line.salesInvoiceLineId,
      lineNumber: line.lineNumber,
      itemId: line.itemId,
      batchId: line.batchId,
      unitId: line.unitId,
      quantity: line.quantity,
      disposition: line.disposition,
      unitPriceSnapshot: line.unitPriceSnapshot,
      lineCreditAmount: line.lineCreditAmount,
      reason: line.reason,
    })),
    createdAt: salesReturn.createdAt.toISOString(),
    updatedAt: salesReturn.updatedAt.toISOString(),
  };
}
