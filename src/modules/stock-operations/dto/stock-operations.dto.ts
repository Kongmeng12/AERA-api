import { z } from 'zod';
import type {
  StockCount,
  StockCountLine,
  StockTransfer,
  StockTransferLine,
  StockWriteoff,
  StockWriteoffLine,
} from '../../inventory/entities/stock-operations.entity';
import type {
  createStockCountSchema,
  createStockTransferSchema,
  createStockWriteoffSchema,
  listStockCountsQuerySchema,
  listStockTransfersQuerySchema,
  listStockWriteoffsQuerySchema,
  receiveStockTransferSchema,
  rejectStockWriteoffSchema,
} from '../validators/stock-operations.validator';

export type CreateStockTransferDto = z.infer<typeof createStockTransferSchema>;
export type ReceiveStockTransferDto = z.infer<typeof receiveStockTransferSchema>;
export type ListStockTransfersQueryDto = z.infer<typeof listStockTransfersQuerySchema>;
export type CreateStockCountDto = z.infer<typeof createStockCountSchema>;
export type ListStockCountsQueryDto = z.infer<typeof listStockCountsQuerySchema>;
export type CreateStockWriteoffDto = z.infer<typeof createStockWriteoffSchema>;
export type ListStockWriteoffsQueryDto = z.infer<typeof listStockWriteoffsQuerySchema>;
export type RejectStockWriteoffDto = z.infer<typeof rejectStockWriteoffSchema>;

export interface StockTransferResponseDto {
  id: number;
  transferNumber: string;
  fromWarehouseId: number;
  fromZoneId: number | null;
  toWarehouseId: number;
  toZoneId: number | null;
  requestedById: number;
  requestedAt: string;
  completedAt: string | null;
  status: string;
  notes: string | null;
  lines: Array<
    Pick<
      StockTransferLine,
      'id' | 'lineNumber' | 'itemId' | 'batchId' | 'unitId' | 'quantity' | 'receivedQuantity'
    >
  >;
  createdAt: string;
  updatedAt: string;
}

export interface StockCountResponseDto {
  id: number;
  countNumber: string;
  warehouseId: number;
  zoneId: number | null;
  startedById: number;
  startedAt: string;
  completedAt: string | null;
  approvedById: number | null;
  status: string;
  lines: Array<
    Pick<
      StockCountLine,
      | 'id'
      | 'lineNumber'
      | 'itemId'
      | 'batchId'
      | 'unitId'
      | 'expectedQuantity'
      | 'countedQuantity'
      | 'discrepancyReason'
    >
  >;
  createdAt: string;
  updatedAt: string;
}

export interface StockWriteoffResponseDto {
  id: number;
  writeoffNumber: string;
  requestedById: number;
  approvedById: number | null;
  requestedAt: string;
  status: string;
  reason: string;
  lines: Array<
    Pick<
      StockWriteoffLine,
      'id' | 'lineNumber' | 'itemId' | 'batchId' | 'unitId' | 'quantity' | 'reason'
    >
  >;
  createdAt: string;
  updatedAt: string;
}

export function toStockTransferResponse(
  transfer: StockTransfer,
  lines: StockTransferLine[],
): StockTransferResponseDto {
  return {
    id: transfer.id,
    transferNumber: transfer.transferNumber,
    fromWarehouseId: transfer.fromWarehouseId,
    fromZoneId: transfer.fromZoneId,
    toWarehouseId: transfer.toWarehouseId,
    toZoneId: transfer.toZoneId,
    requestedById: transfer.requestedById,
    requestedAt: transfer.requestedAt.toISOString(),
    completedAt: transfer.completedAt?.toISOString() ?? null,
    status: transfer.status,
    notes: transfer.notes,
    lines: lines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      itemId: line.itemId,
      batchId: line.batchId,
      unitId: line.unitId,
      quantity: line.quantity,
      receivedQuantity: line.receivedQuantity,
    })),
    createdAt: transfer.createdAt.toISOString(),
    updatedAt: transfer.updatedAt.toISOString(),
  };
}

export function toStockCountResponse(
  count: StockCount,
  lines: StockCountLine[],
): StockCountResponseDto {
  return {
    id: count.id,
    countNumber: count.countNumber,
    warehouseId: count.warehouseId,
    zoneId: count.zoneId,
    startedById: count.startedById,
    startedAt: count.startedAt.toISOString(),
    completedAt: count.completedAt?.toISOString() ?? null,
    approvedById: count.approvedById,
    status: count.status,
    lines: lines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      itemId: line.itemId,
      batchId: line.batchId,
      unitId: line.unitId,
      expectedQuantity: line.expectedQuantity,
      countedQuantity: line.countedQuantity,
      discrepancyReason: line.discrepancyReason,
    })),
    createdAt: count.createdAt.toISOString(),
    updatedAt: count.updatedAt.toISOString(),
  };
}

export function toStockWriteoffResponse(
  writeoff: StockWriteoff,
  lines: StockWriteoffLine[],
): StockWriteoffResponseDto {
  return {
    id: writeoff.id,
    writeoffNumber: writeoff.writeoffNumber,
    requestedById: writeoff.requestedById,
    approvedById: writeoff.approvedById,
    requestedAt: writeoff.requestedAt.toISOString(),
    status: writeoff.status,
    reason: writeoff.reason,
    lines: lines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      itemId: line.itemId,
      batchId: line.batchId,
      unitId: line.unitId,
      quantity: line.quantity,
      reason: line.reason,
    })),
    createdAt: writeoff.createdAt.toISOString(),
    updatedAt: writeoff.updatedAt.toISOString(),
  };
}
