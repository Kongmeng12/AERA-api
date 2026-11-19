import { z } from 'zod';
import type {
  GoodsReceipt,
  GoodsReceiptLine,
  PurchaseOrder,
  PurchaseOrderLine,
} from '../entities/purchase.entity';
import type {
  createGoodsReceiptSchema,
  createPurchaseOrderSchema,
  listGoodsReceiptsQuerySchema,
  listPurchaseOrdersQuerySchema,
} from '../validators/purchasing.validator';

export type ListPurchaseOrdersQueryDto = z.infer<typeof listPurchaseOrdersQuerySchema>;
export type CreatePurchaseOrderDto = z.infer<typeof createPurchaseOrderSchema>;
export type ListGoodsReceiptsQueryDto = z.infer<typeof listGoodsReceiptsQuerySchema>;
export type CreateGoodsReceiptDto = z.infer<typeof createGoodsReceiptSchema>;

export const purchaseOrderLineResponseSchema = z.object({
  id: z.number().int(),
  lineNumber: z.number().int(),
  itemId: z.number().int(),
  unitId: z.number().int(),
  itemSkuSnapshot: z.string(),
  itemNameSnapshot: z.string(),
  unitCodeSnapshot: z.string(),
  conversionToBaseSnapshot: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  receivedQuantity: z.string(),
  lineTotal: z.string(),
});

export const purchaseOrderResponseSchema = z.object({
  id: z.number().int(),
  purchaseOrderNumber: z.string(),
  requisitionId: z.number().int().nullable(),
  supplierId: z.number().int(),
  currencyId: z.number().int(),
  orderedById: z.number().int(),
  orderedAt: z.string(),
  expectedAt: z.string().nullable(),
  deliveryAddressSnapshot: z.string().nullable(),
  status: z.string(),
  subtotal: z.string(),
  discountTotal: z.string(),
  taxTotal: z.string(),
  total: z.string(),
  notes: z.string().nullable(),
  lines: z.array(purchaseOrderLineResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PurchaseOrderResponseDto = z.infer<typeof purchaseOrderResponseSchema>;

export function toPurchaseOrderResponse(
  order: PurchaseOrder,
  lines: PurchaseOrderLine[],
): PurchaseOrderResponseDto {
  return {
    id: order.id,
    purchaseOrderNumber: order.purchaseOrderNumber,
    requisitionId: order.requisitionId,
    supplierId: order.supplierId,
    currencyId: order.currencyId,
    orderedById: order.orderedById,
    orderedAt: order.orderedAt.toISOString(),
    expectedAt: order.expectedAt?.toISOString() ?? null,
    deliveryAddressSnapshot: order.deliveryAddressSnapshot,
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
      conversionToBaseSnapshot: line.conversionToBaseSnapshot,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      receivedQuantity: line.receivedQuantity,
      lineTotal: line.lineTotal,
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export const goodsReceiptLineResponseSchema = z.object({
  id: z.number().int(),
  lineNumber: z.number().int(),
  purchaseOrderLineId: z.number().int(),
  stockBatchId: z.number().int().nullable(),
  warehouseZoneId: z.number().int().nullable(),
  itemId: z.number().int(),
  unitId: z.number().int(),
  itemNameSnapshot: z.string(),
  unitCodeSnapshot: z.string(),
  orderedQuantity: z.string(),
  receivedQuantity: z.string(),
  rejectedQuantity: z.string(),
  unitCost: z.string(),
  batchNumber: z.string().nullable(),
  manufacturedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
});

export const goodsReceiptResponseSchema = z.object({
  id: z.number().int(),
  receiptNumber: z.string(),
  purchaseOrderId: z.number().int(),
  supplierId: z.number().int(),
  warehouseId: z.number().int(),
  receivedById: z.number().int(),
  receivedAt: z.string(),
  status: z.string(),
  notes: z.string().nullable(),
  lines: z.array(goodsReceiptLineResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GoodsReceiptResponseDto = z.infer<typeof goodsReceiptResponseSchema>;

export function toGoodsReceiptResponse(
  receipt: GoodsReceipt,
  lines: GoodsReceiptLine[],
): GoodsReceiptResponseDto {
  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    purchaseOrderId: receipt.purchaseOrderId,
    supplierId: receipt.supplierId,
    warehouseId: receipt.warehouseId,
    receivedById: receipt.receivedById,
    receivedAt: receipt.receivedAt.toISOString(),
    status: receipt.status,
    notes: receipt.notes,
    lines: lines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      purchaseOrderLineId: line.purchaseOrderLineId,
      stockBatchId: line.stockBatchId,
      warehouseZoneId: line.warehouseZoneId,
      itemId: line.itemId,
      unitId: line.unitId,
      itemNameSnapshot: line.itemNameSnapshot,
      unitCodeSnapshot: line.unitCodeSnapshot,
      orderedQuantity: line.orderedQuantity,
      receivedQuantity: line.receivedQuantity,
      rejectedQuantity: line.rejectedQuantity,
      unitCost: line.unitCost,
      batchNumber: line.batchNumber,
      manufacturedAt: line.manufacturedAt,
      expiresAt: line.expiresAt,
    })),
    createdAt: receipt.createdAt.toISOString(),
    updatedAt: receipt.updatedAt.toISOString(),
  };
}
