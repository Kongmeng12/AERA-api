import { z } from 'zod';
import type { InventoryBalance, StockBatch, StockMovement } from '../entities/stock.entity';
import type {
  listInventoryBalancesQuerySchema,
  listStockBatchesQuerySchema,
  listStockMovementsQuerySchema,
} from '../validators/inventory.validator';

export type ListInventoryBalancesQueryDto = z.infer<typeof listInventoryBalancesQuerySchema>;
export type ListStockBatchesQueryDto = z.infer<typeof listStockBatchesQuerySchema>;
export type ListStockMovementsQueryDto = z.infer<typeof listStockMovementsQuerySchema>;

export const inventoryBalanceResponseSchema = z.object({
  id: z.number().int(),
  itemId: z.number().int(),
  batchId: z.number().int(),
  unitId: z.number().int(),
  warehouseId: z.number().int(),
  zoneId: z.number().int(),
  stockStatus: z.string(),
  quantityOnHand: z.string(),
  quantityReserved: z.string(),
  updatedAt: z.string(),
});
export type InventoryBalanceResponseDto = z.infer<typeof inventoryBalanceResponseSchema>;

export function toInventoryBalanceResponse(balance: InventoryBalance): InventoryBalanceResponseDto {
  return {
    id: balance.id,
    itemId: balance.itemId,
    batchId: balance.batchId,
    unitId: balance.unitId,
    warehouseId: balance.warehouseId,
    zoneId: balance.zoneId,
    stockStatus: balance.stockStatus,
    quantityOnHand: balance.quantityOnHand,
    quantityReserved: balance.quantityReserved,
    updatedAt: balance.updatedAt.toISOString(),
  };
}

export const stockBatchResponseSchema = z.object({
  id: z.number().int(),
  itemId: z.number().int(),
  batchNumber: z.string(),
  manufacturedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  qcStatus: z.string(),
  sourceType: z.string().nullable(),
  sourceId: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StockBatchResponseDto = z.infer<typeof stockBatchResponseSchema>;

export function toStockBatchResponse(batch: StockBatch): StockBatchResponseDto {
  return {
    id: batch.id,
    itemId: batch.itemId,
    batchNumber: batch.batchNumber,
    manufacturedAt: batch.manufacturedAt,
    expiresAt: batch.expiresAt,
    qcStatus: batch.qcStatus,
    sourceType: batch.sourceType,
    sourceId: batch.sourceId,
    status: batch.status,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

export const stockMovementResponseSchema = z.object({
  id: z.number().int(),
  movementNumber: z.string(),
  movementType: z.string(),
  itemId: z.number().int(),
  batchId: z.number().int().nullable(),
  unitId: z.number().int(),
  quantity: z.string(),
  fromWarehouseId: z.number().int().nullable(),
  fromZoneId: z.number().int().nullable(),
  toWarehouseId: z.number().int().nullable(),
  toZoneId: z.number().int().nullable(),
  sourceType: z.string(),
  sourceId: z.string(),
  idempotencyKey: z.string().nullable(),
  actorId: z.number().int(),
  reason: z.string().nullable(),
  createdAt: z.string(),
});
export type StockMovementResponseDto = z.infer<typeof stockMovementResponseSchema>;

export function toStockMovementResponse(movement: StockMovement): StockMovementResponseDto {
  return {
    id: movement.id,
    movementNumber: movement.movementNumber,
    movementType: movement.movementType,
    itemId: movement.itemId,
    batchId: movement.batchId,
    unitId: movement.unitId,
    quantity: movement.quantity,
    fromWarehouseId: movement.fromWarehouseId,
    fromZoneId: movement.fromZoneId,
    toWarehouseId: movement.toWarehouseId,
    toZoneId: movement.toZoneId,
    sourceType: movement.sourceType,
    sourceId: movement.sourceId,
    idempotencyKey: movement.idempotencyKey,
    actorId: movement.actorId,
    reason: movement.reason,
    createdAt: movement.createdAt.toISOString(),
  };
}
