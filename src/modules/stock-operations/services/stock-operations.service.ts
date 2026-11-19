import { randomUUID } from 'node:crypto';
import { QueryFailedError } from 'typeorm';
import { ConflictError, NotFoundError, ValidationError } from '../../../core/exceptions/app-error';
import { ERROR_CODES } from '../../../shared/constants/error-codes';
import { addDecimal4, formatDecimal4, parseDecimal4 } from '../../../shared/helpers/decimal';
import { toPaginatedResult } from '../../../shared/helpers/pagination';
import type { PaginatedResult } from '../../../shared/response/api-response';
import {
  toStockCountResponse,
  toStockTransferResponse,
  toStockWriteoffResponse,
  type CreateStockCountDto,
  type CreateStockTransferDto,
  type CreateStockWriteoffDto,
  type ListStockCountsQueryDto,
  type ListStockTransfersQueryDto,
  type ListStockWriteoffsQueryDto,
  type ReceiveStockTransferDto,
  type RejectStockWriteoffDto,
  type StockCountResponseDto,
  type StockTransferResponseDto,
  type StockWriteoffResponseDto,
} from '../dto/stock-operations.dto';
import type { StockOperationsRepository } from '../repositories/stock-operations.repository';

const ZERO = '0.0000';

function fieldError(field: string, message: string): ValidationError {
  return new ValidationError(ERROR_CODES.VALIDATION_ERROR, 'Validation failed', [
    { field, message },
  ]);
}

function notFound(message: string): NotFoundError {
  return new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, message);
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === 'ER_DUP_ENTRY'
  );
}

export class StockOperationsService {
  constructor(private readonly repository: StockOperationsRepository) {}

  async listTransfers(
    query: ListStockTransfersQueryDto,
  ): Promise<PaginatedResult<StockTransferResponseDto>> {
    const [transfers, total] = await this.repository.listTransfers(query);
    const lines = await this.repository.findTransferLines(transfers.map((transfer) => transfer.id));
    return toPaginatedResult(
      transfers.map((transfer) =>
        toStockTransferResponse(
          transfer,
          lines.filter((line) => line.transferId === transfer.id),
        ),
      ),
      total,
      query.page,
      query.limit,
    );
  }

  async getTransfer(id: number): Promise<StockTransferResponseDto> {
    const transfer = await this.repository.findTransfer(id);
    if (!transfer) throw notFound('Stock transfer not found');
    return toStockTransferResponse(transfer, await this.repository.findTransferLines([id]));
  }

  async createTransfer(
    dto: CreateStockTransferDto,
    requesterId: number,
  ): Promise<StockTransferResponseDto> {
    const [fromWarehouse, toWarehouse] = await Promise.all([
      this.repository.findWarehouse(dto.fromWarehouseId),
      this.repository.findWarehouse(dto.toWarehouseId),
    ]);
    if (!fromWarehouse)
      throw fieldError('fromWarehouseId', 'Source warehouse is inactive or missing');
    if (!toWarehouse)
      throw fieldError('toWarehouseId', 'Destination warehouse is inactive or missing');
    if (
      dto.fromZoneId != null &&
      !(await this.repository.findZone(dto.fromZoneId, fromWarehouse.id))
    ) {
      throw fieldError('fromZoneId', 'Source zone is inactive or belongs to another warehouse');
    }
    if (!(await this.repository.findZone(dto.toZoneId, toWarehouse.id))) {
      throw fieldError('toZoneId', 'Destination zone is inactive or belongs to another warehouse');
    }
    for (const [index, line] of dto.lines.entries()) {
      const [item, batch, unit] = await Promise.all([
        this.repository.findItem(line.itemId),
        this.repository.findActiveBatch(line.itemId, line.batchId),
        this.repository.findUnit(line.unitId),
      ]);
      if (!item) throw fieldError(`lines.${index}.itemId`, 'Item is inactive or missing');
      if (!batch)
        throw fieldError(`lines.${index}.batchId`, 'Active batch does not match the item');
      if (!unit) throw fieldError(`lines.${index}.unitId`, 'Unit is inactive or missing');
    }

    const transfer = await this.saveUnique(
      () =>
        this.repository.transaction(async (repository) => {
          const created = await repository.createTransfer({
            transferNumber: dto.transferNumber,
            fromWarehouseId: dto.fromWarehouseId,
            fromZoneId: dto.fromZoneId ?? null,
            toWarehouseId: dto.toWarehouseId,
            toZoneId: dto.toZoneId,
            requestedById: requesterId,
            requestedAt: new Date(),
            completedAt: null,
            status: 'draft',
            notes: dto.notes ?? null,
          });
          const lines = await repository.createTransferLines(
            dto.lines.map((line, index) => ({
              transferId: created.id,
              lineNumber: index + 1,
              inventoryUnitId: null,
              itemId: line.itemId,
              batchId: line.batchId,
              unitId: line.unitId,
              quantity: line.quantity,
              receivedQuantity: ZERO,
            })),
          );
          return { created, lines };
        }),
      'Stock transfer number already exists',
    );
    return toStockTransferResponse(transfer.created, transfer.lines);
  }

  async dispatchTransfer(id: number, actorId: number): Promise<StockTransferResponseDto> {
    await this.repository.transaction(async (repository) => {
      const transfer = await repository.findTransferForUpdate(id);
      if (!transfer) throw notFound('Stock transfer not found');
      if (transfer.status !== 'draft')
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only draft transfers can be dispatched',
        );
      const lines = await repository.findTransferLinesForUpdate(transfer.id);
      for (const line of lines) {
        if (line.batchId === null)
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            'Transfer line has no stock batch',
          );
        const balances = await repository.findSourceBalances({
          itemId: line.itemId,
          batchId: line.batchId,
          unitId: line.unitId,
          warehouseId: transfer.fromWarehouseId,
          zoneId: transfer.fromZoneId,
        });
        const requested = parseDecimal4(line.quantity);
        const totalAvailable = balances.reduce(
          (sum, balance) =>
            sum + parseDecimal4(balance.quantityOnHand) - parseDecimal4(balance.quantityReserved),
          0n,
        );
        if (totalAvailable < requested)
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            `Insufficient available stock for item ${line.itemId}, batch ${line.batchId}`,
          );

        let remaining = requested;
        let movementNumber = 0;
        for (const balance of balances) {
          if (remaining === 0n) break;
          const free =
            parseDecimal4(balance.quantityOnHand) - parseDecimal4(balance.quantityReserved);
          const moved = free < remaining ? free : remaining;
          if (moved <= 0n) continue;
          const quantity = formatDecimal4(moved);
          balance.quantityOnHand = formatDecimal4(parseDecimal4(balance.quantityOnHand) - moved);
          await repository.saveBalance(balance);
          await repository.createMovement({
            movementNumber: `TD-${transfer.id}-${line.lineNumber}-${++movementNumber}`,
            movementType: 'transfer_dispatch',
            itemId: line.itemId,
            batchId: line.batchId,
            unitId: line.unitId,
            quantity,
            fromWarehouseId: balance.warehouseId,
            fromZoneId: balance.zoneId,
            toWarehouseId: null,
            toZoneId: null,
            sourceType: 'stock_transfer',
            sourceId: String(transfer.id),
            idempotencyKey: null,
            actorId,
            reason: null,
          });
          remaining -= moved;
        }
      }
      transfer.status = 'in_transit';
      await repository.saveTransfer(transfer);
    });
    return this.getTransfer(id);
  }

  async receiveTransfer(
    id: number,
    dto: ReceiveStockTransferDto,
    actorId: number,
  ): Promise<StockTransferResponseDto> {
    await this.repository.transaction(async (repository) => {
      const transfer = await repository.findTransferForUpdate(id);
      if (!transfer) throw notFound('Stock transfer not found');
      if (transfer.status !== 'in_transit')
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only in-transit transfers can be received',
        );
      if (transfer.toZoneId === null)
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Transfer has no destination zone for stock receipt',
        );
      const lines = await repository.findTransferLinesForUpdate(transfer.id);
      const lineById = new Map(lines.map((line) => [line.id, line]));
      for (const [index, input] of dto.lines.entries()) {
        const line = lineById.get(input.transferLineId);
        if (!line)
          throw fieldError(
            `lines.${index}.transferLineId`,
            'Transfer line does not belong to this transfer',
          );
        const received = parseDecimal4(input.receivedQuantity);
        if (parseDecimal4(line.receivedQuantity) + received > parseDecimal4(line.quantity))
          throw fieldError(
            `lines.${index}.receivedQuantity`,
            'Received quantity exceeds dispatched quantity',
          );
        if (line.batchId === null)
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            'Transfer line has no stock batch',
          );
        await repository.addAvailableBalance({
          itemId: line.itemId,
          batchId: line.batchId,
          unitId: line.unitId,
          warehouseId: transfer.toWarehouseId,
          zoneId: transfer.toZoneId,
          quantity: input.receivedQuantity,
        });
        await repository.createMovement({
          movementNumber: `TR-${transfer.id}-${line.lineNumber}-${randomUUID().slice(0, 8)}`,
          movementType: 'transfer_receipt',
          itemId: line.itemId,
          batchId: line.batchId,
          unitId: line.unitId,
          quantity: input.receivedQuantity,
          fromWarehouseId: transfer.fromWarehouseId,
          fromZoneId: transfer.fromZoneId,
          toWarehouseId: transfer.toWarehouseId,
          toZoneId: transfer.toZoneId,
          sourceType: 'stock_transfer',
          sourceId: String(transfer.id),
          idempotencyKey: null,
          actorId,
          reason: null,
        });
        line.receivedQuantity = addDecimal4(line.receivedQuantity, input.receivedQuantity);
        await repository.saveTransferLine(line);
      }
      if (
        lines.every((line) => parseDecimal4(line.receivedQuantity) === parseDecimal4(line.quantity))
      ) {
        transfer.status = 'completed';
        transfer.completedAt = new Date();
        await repository.saveTransfer(transfer);
      }
    });
    return this.getTransfer(id);
  }

  async listCounts(
    query: ListStockCountsQueryDto,
  ): Promise<PaginatedResult<StockCountResponseDto>> {
    const [counts, total] = await this.repository.listCounts(query);
    const lines = await this.repository.findCountLines(counts.map((count) => count.id));
    return toPaginatedResult(
      counts.map((count) =>
        toStockCountResponse(
          count,
          lines.filter((line) => line.stockCountId === count.id),
        ),
      ),
      total,
      query.page,
      query.limit,
    );
  }

  async getCount(id: number): Promise<StockCountResponseDto> {
    const count = await this.repository.findCount(id);
    if (!count) throw notFound('Stock count not found');
    return toStockCountResponse(count, await this.repository.findCountLines([id]));
  }

  async createCount(dto: CreateStockCountDto, startedById: number): Promise<StockCountResponseDto> {
    const warehouse = await this.repository.findWarehouse(dto.warehouseId);
    if (!warehouse) throw fieldError('warehouseId', 'Warehouse is inactive or missing');
    if (!(await this.repository.findZone(dto.zoneId, warehouse.id)))
      throw fieldError('zoneId', 'Zone is inactive or belongs to another warehouse');

    const count = await this.saveUnique(
      () =>
        this.repository.transaction(async (repository) => {
          const balances = await repository.findCountSnapshotBalances(warehouse.id, dto.zoneId);
          const balanceByKey = new Map(
            balances.map((balance) => [
              `${balance.itemId}:${balance.batchId}:${balance.unitId}`,
              balance,
            ]),
          );
          const lineValues = dto.lines.map((line, index) => {
            const balance = balanceByKey.get(`${line.itemId}:${line.batchId}:${line.unitId}`);
            if (!balance)
              throw fieldError(
                `lines.${index}`,
                'Count line does not match an available stock balance in the selected zone',
              );
            const expected = parseDecimal4(balance.quantityOnHand);
            const counted = parseDecimal4(line.countedQuantity);
            if (expected !== counted && !line.discrepancyReason)
              throw fieldError(
                `lines.${index}.discrepancyReason`,
                'A reason is required when the counted quantity differs from expected',
              );
            return {
              itemId: line.itemId,
              batchId: line.batchId,
              unitId: line.unitId,
              expectedQuantity: formatDecimal4(expected),
              countedQuantity: formatDecimal4(counted),
              discrepancyReason: line.discrepancyReason ?? null,
            };
          });
          const startedAt = new Date();
          const created = await repository.createCount({
            countNumber: dto.countNumber,
            warehouseId: warehouse.id,
            zoneId: dto.zoneId,
            startedById,
            startedAt,
            completedAt: startedAt,
            approvedById: null,
            status: 'pending_approval',
          });
          const lines = await repository.createCountLines(
            lineValues.map((line, index) => ({
              stockCountId: created.id,
              lineNumber: index + 1,
              inventoryUnitId: null,
              ...line,
            })),
          );
          return { created, lines };
        }),
      'Stock count number already exists',
    );
    return toStockCountResponse(count.created, count.lines);
  }

  async approveCount(id: number, approverId: number): Promise<StockCountResponseDto> {
    await this.repository.transaction(async (repository) => {
      const count = await repository.findCountForUpdate(id);
      if (!count) throw notFound('Stock count not found');
      if (count.status !== 'pending_approval')
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only stock counts pending approval can be approved',
        );
      if (count.zoneId === null)
        throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, 'Stock count is missing its zone');
      if (
        await repository.hasCountMovementAfter({
          startedAt: count.startedAt,
          warehouseId: count.warehouseId,
          zoneId: count.zoneId,
        })
      ) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Stock moved in the counted zone after the snapshot; recount is required',
        );
      }
      const lines = await repository.findCountLinesForUpdate(count.id);
      for (const line of lines) {
        if (line.batchId === null)
          throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, 'Count line has no stock batch');
        const balance = await repository.findCountBalanceForUpdate({
          warehouseId: count.warehouseId,
          zoneId: count.zoneId,
          itemId: line.itemId,
          batchId: line.batchId,
          unitId: line.unitId,
        });
        if (
          !balance ||
          parseDecimal4(balance.quantityOnHand) !== parseDecimal4(line.expectedQuantity)
        )
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            `Stock changed for item ${line.itemId}, batch ${line.batchId}; recount is required`,
          );

        const expected = parseDecimal4(line.expectedQuantity);
        const counted = parseDecimal4(line.countedQuantity);
        const reserved = parseDecimal4(balance.quantityReserved);
        if (counted < reserved)
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            `Counted quantity is below the reserved quantity for item ${line.itemId}, batch ${line.batchId}`,
          );
        const delta = counted - expected;
        if (delta === 0n) continue;
        const quantity = formatDecimal4(delta < 0n ? -delta : delta);
        balance.quantityOnHand = formatDecimal4(counted);
        await repository.saveBalance(balance);
        await repository.createMovement({
          movementNumber: `SC-${count.id}-${line.lineNumber}`,
          movementType: 'stock_count_adjustment',
          itemId: line.itemId,
          batchId: line.batchId,
          unitId: line.unitId,
          quantity,
          fromWarehouseId: delta < 0n ? count.warehouseId : null,
          fromZoneId: delta < 0n ? count.zoneId : null,
          toWarehouseId: delta > 0n ? count.warehouseId : null,
          toZoneId: delta > 0n ? count.zoneId : null,
          sourceType: 'stock_count',
          sourceId: String(count.id),
          idempotencyKey: null,
          actorId: approverId,
          reason: line.discrepancyReason,
        });
      }
      count.status = 'approved';
      count.approvedById = approverId;
      await repository.saveCount(count);
    });
    return this.getCount(id);
  }

  async listWriteoffs(
    query: ListStockWriteoffsQueryDto,
  ): Promise<PaginatedResult<StockWriteoffResponseDto>> {
    const [writeoffs, total] = await this.repository.listWriteoffs(query);
    const lines = await this.repository.findWriteoffLines(writeoffs.map((entry) => entry.id));
    return toPaginatedResult(
      writeoffs.map((writeoff) =>
        toStockWriteoffResponse(
          writeoff,
          lines.filter((line) => line.writeoffId === writeoff.id),
        ),
      ),
      total,
      query.page,
      query.limit,
    );
  }

  async getWriteoff(id: number): Promise<StockWriteoffResponseDto> {
    const writeoff = await this.repository.findWriteoff(id);
    if (!writeoff) throw notFound('Stock write-off not found');
    return toStockWriteoffResponse(writeoff, await this.repository.findWriteoffLines([id]));
  }

  async createWriteoff(
    dto: CreateStockWriteoffDto,
    requesterId: number,
  ): Promise<StockWriteoffResponseDto> {
    const writeoff = await this.saveUnique(
      () =>
        this.repository.transaction(async (repository) => {
          for (const [index, line] of dto.lines.entries()) {
            if (!(await repository.findItem(line.itemId)))
              throw fieldError(`lines.${index}.itemId`, 'Item is inactive or missing');
            if (!(await repository.findActiveBatch(line.itemId, line.batchId)))
              throw fieldError(`lines.${index}.batchId`, 'Active batch does not match the item');
            if (!(await repository.findUnit(line.unitId)))
              throw fieldError(`lines.${index}.unitId`, 'Unit is inactive or missing');
            const balances = await repository.findAvailableBalancesForWriteoff(
              line.itemId,
              line.batchId,
              line.unitId,
            );
            const available = balances.reduce(
              (sum, balance) =>
                sum +
                parseDecimal4(balance.quantityOnHand) -
                parseDecimal4(balance.quantityReserved),
              0n,
            );
            if (available < parseDecimal4(line.quantity))
              throw fieldError(
                `lines.${index}.quantity`,
                'Write-off quantity exceeds available, unreserved stock',
              );
          }
          const created = await repository.createWriteoff({
            writeoffNumber: dto.writeoffNumber,
            requestedById: requesterId,
            approvedById: null,
            requestedAt: new Date(),
            status: 'pending_approval',
            reason: dto.reason,
          });
          const lines = await repository.createWriteoffLines(
            dto.lines.map((line, index) => ({
              writeoffId: created.id,
              lineNumber: index + 1,
              inventoryUnitId: null,
              itemId: line.itemId,
              batchId: line.batchId,
              unitId: line.unitId,
              quantity: line.quantity,
              reason: line.reason,
            })),
          );
          return { created, lines };
        }),
      'Stock write-off number already exists',
    );
    return toStockWriteoffResponse(writeoff.created, writeoff.lines);
  }

  async approveWriteoff(id: number, approverId: number): Promise<StockWriteoffResponseDto> {
    await this.repository.transaction(async (repository) => {
      const writeoff = await repository.findWriteoffForUpdate(id);
      if (!writeoff) throw notFound('Stock write-off not found');
      if (writeoff.status !== 'pending_approval')
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only pending stock write-offs can be approved',
        );
      if (writeoff.requestedById === approverId)
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'The requester cannot approve their own stock write-off',
        );
      const lines = await repository.findWriteoffLinesForUpdate(writeoff.id);
      for (const line of lines) {
        if (line.batchId === null)
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            'Write-off line has no stock batch',
          );
        const balances = await repository.findAvailableBalancesForWriteoff(
          line.itemId,
          line.batchId,
          line.unitId,
        );
        let remaining = parseDecimal4(line.quantity);
        const available = balances.reduce(
          (sum, balance) =>
            sum + parseDecimal4(balance.quantityOnHand) - parseDecimal4(balance.quantityReserved),
          0n,
        );
        if (available < remaining)
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            `Insufficient available stock for write-off item ${line.itemId}, batch ${line.batchId}`,
          );
        let movementIndex = 0;
        for (const balance of balances) {
          if (remaining === 0n) break;
          const free =
            parseDecimal4(balance.quantityOnHand) - parseDecimal4(balance.quantityReserved);
          const quantityValue = free < remaining ? free : remaining;
          if (quantityValue <= 0n) continue;
          const quantity = formatDecimal4(quantityValue);
          balance.quantityOnHand = formatDecimal4(
            parseDecimal4(balance.quantityOnHand) - quantityValue,
          );
          await repository.saveBalance(balance);
          await repository.createMovement({
            movementNumber: `WO-${writeoff.id}-${line.lineNumber}-${++movementIndex}`,
            movementType: 'writeoff',
            itemId: line.itemId,
            batchId: line.batchId,
            unitId: line.unitId,
            quantity,
            fromWarehouseId: balance.warehouseId,
            fromZoneId: balance.zoneId,
            toWarehouseId: null,
            toZoneId: null,
            sourceType: 'stock_writeoff',
            sourceId: String(writeoff.id),
            idempotencyKey: null,
            actorId: approverId,
            reason: line.reason,
          });
          remaining -= quantityValue;
        }
      }
      writeoff.status = 'approved';
      writeoff.approvedById = approverId;
      await repository.saveWriteoff(writeoff);
    });
    return this.getWriteoff(id);
  }

  async rejectWriteoff(id: number, dto: RejectStockWriteoffDto): Promise<StockWriteoffResponseDto> {
    await this.repository.transaction(async (repository) => {
      const writeoff = await repository.findWriteoffForUpdate(id);
      if (!writeoff) throw notFound('Stock write-off not found');
      if (writeoff.status !== 'pending_approval')
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only pending stock write-offs can be rejected',
        );
      writeoff.status = 'rejected';
      writeoff.reason = `${writeoff.reason}\nRejection: ${dto.reason}`;
      await repository.saveWriteoff(writeoff);
    });
    return this.getWriteoff(id);
  }

  private async saveUnique<T>(operation: () => Promise<T>, duplicateMessage: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, duplicateMessage);
      throw error;
    }
  }
}
