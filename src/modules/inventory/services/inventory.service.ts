import type { EntityManager } from 'typeorm';
import { ConflictError } from '../../../core/exceptions/app-error';
import { ERROR_CODES } from '../../../shared/constants/error-codes';
import { addDecimal4, formatDecimal4, parseDecimal4 } from '../../../shared/helpers/decimal';
import { toPaginatedResult } from '../../../shared/helpers/pagination';
import type { PaginatedResult } from '../../../shared/response/api-response';
import { InventoryReservation } from '../entities/inventory-reservation.entity';
import { InventoryBalance, StockBatch, StockMovement } from '../entities/stock.entity';
import {
  toInventoryBalanceResponse,
  toStockBatchResponse,
  toStockMovementResponse,
  type InventoryBalanceResponseDto,
  type ListInventoryBalancesQueryDto,
  type ListStockBatchesQueryDto,
  type ListStockMovementsQueryDto,
  type StockBatchResponseDto,
  type StockMovementResponseDto,
} from '../dto/inventory.dto';
import type { InventoryRepository } from '../repositories/inventory.repository';

export interface SalesOrderReservationLine {
  id: number;
  itemId: number;
  unitId: number;
  quantity: string;
}

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  async listBalances(
    query: ListInventoryBalancesQueryDto,
  ): Promise<PaginatedResult<InventoryBalanceResponseDto>> {
    const [rows, total] = await this.repository.findBalances(query);
    return toPaginatedResult(rows.map(toInventoryBalanceResponse), total, query.page, query.limit);
  }

  async listBatches(
    query: ListStockBatchesQueryDto,
  ): Promise<PaginatedResult<StockBatchResponseDto>> {
    const [rows, total] = await this.repository.findBatches(query);
    return toPaginatedResult(rows.map(toStockBatchResponse), total, query.page, query.limit);
  }

  async listMovements(
    query: ListStockMovementsQueryDto,
  ): Promise<PaginatedResult<StockMovementResponseDto>> {
    const [rows, total] = await this.repository.findMovements(query);
    return toPaginatedResult(rows.map(toStockMovementResponse), total, query.page, query.limit);
  }

  async reserveSalesOrder(
    manager: EntityManager,
    lines: SalesOrderReservationLine[],
  ): Promise<void> {
    const balances = manager.getRepository(InventoryBalance);
    const reservations = manager.getRepository(InventoryReservation);

    for (const line of [...lines].sort((left, right) => left.id - right.id)) {
      let remaining = parseDecimal4(line.quantity);
      const candidates = await balances
        .createQueryBuilder('balance')
        .innerJoin('balance.batch', 'batch')
        .where('balance.itemId = :itemId', { itemId: line.itemId })
        .andWhere('balance.unitId = :unitId', { unitId: line.unitId })
        .andWhere('balance.stockStatus = :stockStatus', { stockStatus: 'available' })
        .andWhere('batch.status = :batchStatus', { batchStatus: 'active' })
        .orderBy('batch.expiresAt', 'ASC')
        .addOrderBy('balance.id', 'ASC')
        .setLock('pessimistic_write')
        .getMany();

      for (const balance of candidates) {
        const available =
          parseDecimal4(balance.quantityOnHand) - parseDecimal4(balance.quantityReserved);
        const quantity = available < remaining ? available : remaining;
        if (quantity <= 0n) {
          continue;
        }
        const reservedQuantity = formatDecimal4(quantity);
        balance.quantityReserved = addDecimal4(balance.quantityReserved, reservedQuantity);
        await balances.save(balance);
        await reservations.save(
          reservations.create({
            salesOrderLineId: line.id,
            inventoryBalanceId: balance.id,
            batchId: balance.batchId,
            quantity: reservedQuantity,
            status: 'reserved',
            reservedAt: new Date(),
            releasedAt: null,
            releasedById: null,
          }),
        );
        remaining -= quantity;
        if (remaining === 0n) {
          break;
        }
      }

      if (remaining > 0n) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          `Insufficient available stock for item ${line.itemId} in unit ${line.unitId}`,
        );
      }
    }
  }

  async releaseSalesOrderReservations(
    manager: EntityManager,
    orderLineIds: number[],
    releasedById: number,
  ): Promise<void> {
    if (orderLineIds.length === 0) {
      return;
    }
    const reservationRepository = manager.getRepository(InventoryReservation);
    const balanceRepository = manager.getRepository(InventoryBalance);
    const reservations = await reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.salesOrderLineId IN (:...orderLineIds)', { orderLineIds })
      .andWhere('reservation.status = :status', { status: 'reserved' })
      .orderBy('reservation.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();

    for (const reservation of reservations) {
      const balance = await balanceRepository.findOne({
        where: { id: reservation.inventoryBalanceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !balance ||
        parseDecimal4(balance.quantityReserved) < parseDecimal4(reservation.quantity)
      ) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Reserved inventory is inconsistent and cannot be released',
        );
      }
      balance.quantityReserved = formatDecimal4(
        parseDecimal4(balance.quantityReserved) - parseDecimal4(reservation.quantity),
      );
      await balanceRepository.save(balance);
      reservation.status = 'released';
      reservation.releasedAt = new Date();
      reservation.releasedById = releasedById;
      await reservationRepository.save(reservation);
    }
  }

  async dispatchSalesOrderLine(
    manager: EntityManager,
    input: {
      salesOrderLineId: number;
      quantity: string;
      deliveryId: number;
      actorId: number;
    },
  ): Promise<void> {
    const reservationRepository = manager.getRepository(InventoryReservation);
    const balanceRepository = manager.getRepository(InventoryBalance);
    const movementRepository = manager.getRepository(StockMovement);
    let remaining = parseDecimal4(input.quantity);
    const reservations = await reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.salesOrderLineId = :salesOrderLineId', {
        salesOrderLineId: input.salesOrderLineId,
      })
      .andWhere('reservation.status = :status', { status: 'reserved' })
      .orderBy('reservation.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();

    for (const [index, reservation] of reservations.entries()) {
      if (remaining === 0n) {
        break;
      }
      const balance = await balanceRepository.findOne({
        where: { id: reservation.inventoryBalanceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!balance) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Reserved inventory no longer exists',
        );
      }
      const reserved = parseDecimal4(reservation.quantity);
      const quantity = reserved < remaining ? reserved : remaining;
      if (
        quantity <= 0n ||
        parseDecimal4(balance.quantityOnHand) < quantity ||
        parseDecimal4(balance.quantityReserved) < quantity
      ) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Reserved inventory is inconsistent and cannot be dispatched',
        );
      }

      const dispatched = formatDecimal4(quantity);
      balance.quantityOnHand = formatDecimal4(parseDecimal4(balance.quantityOnHand) - quantity);
      balance.quantityReserved = formatDecimal4(parseDecimal4(balance.quantityReserved) - quantity);
      await balanceRepository.save(balance);
      reservation.quantity = formatDecimal4(reserved - quantity);
      if (parseDecimal4(reservation.quantity) === 0n) {
        reservation.status = 'released';
        reservation.releasedAt = new Date();
        reservation.releasedById = input.actorId;
      }
      await reservationRepository.save(reservation);
      await movementRepository.save(
        movementRepository.create({
          movementNumber: `DL-${input.deliveryId}-${input.salesOrderLineId}-${index + 1}`,
          movementType: 'sale',
          itemId: balance.itemId,
          batchId: balance.batchId,
          unitId: balance.unitId,
          quantity: dispatched,
          fromWarehouseId: balance.warehouseId,
          fromZoneId: balance.zoneId,
          toWarehouseId: null,
          toZoneId: null,
          sourceType: 'delivery',
          sourceId: String(input.deliveryId),
          idempotencyKey: null,
          actorId: input.actorId,
          reason: `sales_order_line:${input.salesOrderLineId}`,
        }),
      );
      remaining -= quantity;
    }
    if (remaining > 0n) {
      throw new ConflictError(
        ERROR_CODES.RESOURCE_CONFLICT,
        'The delivery quantity exceeds its reserved inventory',
      );
    }
  }

  async returnUndeliveredSalesLine(
    manager: EntityManager,
    input: {
      deliveryId: number;
      salesOrderLineId: number;
      quantity: string;
      actorId: number;
    },
  ): Promise<void> {
    let remaining = parseDecimal4(input.quantity);
    if (remaining === 0n) {
      return;
    }
    const movements = manager.getRepository(StockMovement);
    const balances = manager.getRepository(InventoryBalance);
    const sourceId = `${input.deliveryId}:${input.salesOrderLineId}`;
    const shipped = await movements
      .createQueryBuilder('movement')
      .where('movement.sourceType = :sourceType', { sourceType: 'delivery' })
      .andWhere('movement.sourceId = :sourceId', { sourceId: String(input.deliveryId) })
      .andWhere('movement.movementType = :movementType', { movementType: 'sale' })
      .andWhere('movement.reason = :reason', {
        reason: `sales_order_line:${input.salesOrderLineId}`,
      })
      .orderBy('movement.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
    const returnedMovements = await movements
      .createQueryBuilder('movement')
      .where('movement.sourceType = :sourceType', { sourceType: 'delivery_return' })
      .andWhere('movement.sourceId = :sourceId', { sourceId })
      .getMany();
    const alreadyReturned = new Map<number, bigint>();
    for (const movement of returnedMovements) {
      if (movement.batchId !== null) {
        alreadyReturned.set(
          movement.batchId,
          (alreadyReturned.get(movement.batchId) ?? 0n) + parseDecimal4(movement.quantity),
        );
      }
    }

    for (const [index, movement] of shipped.entries()) {
      if (remaining === 0n || movement.batchId === null) {
        continue;
      }
      const available =
        parseDecimal4(movement.quantity) - (alreadyReturned.get(movement.batchId) ?? 0n);
      const quantity = available < remaining ? available : remaining;
      if (quantity <= 0n || movement.fromWarehouseId === null || movement.fromZoneId === null) {
        continue;
      }
      const balance = await balances.findOne({
        where: {
          itemId: movement.itemId,
          batchId: movement.batchId,
          unitId: movement.unitId,
          warehouseId: movement.fromWarehouseId,
          zoneId: movement.fromZoneId,
          stockStatus: 'available',
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!balance) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'The original stock balance is unavailable for returned delivery goods',
        );
      }
      const returnedQuantity = formatDecimal4(quantity);
      balance.quantityOnHand = addDecimal4(balance.quantityOnHand, returnedQuantity);
      await balances.save(balance);
      await movements.save(
        movements.create({
          movementNumber: `DR-${input.deliveryId}-${input.salesOrderLineId}-${index + 1}`,
          movementType: 'delivery_return',
          itemId: movement.itemId,
          batchId: movement.batchId,
          unitId: movement.unitId,
          quantity: returnedQuantity,
          fromWarehouseId: null,
          fromZoneId: null,
          toWarehouseId: movement.fromWarehouseId,
          toZoneId: movement.fromZoneId,
          sourceType: 'delivery_return',
          sourceId,
          idempotencyKey: null,
          actorId: input.actorId,
          reason: null,
        }),
      );
      remaining -= quantity;
    }

    if (remaining > 0n) {
      throw new ConflictError(
        ERROR_CODES.RESOURCE_CONFLICT,
        'Returned quantity exceeds the stock dispatched for this delivery line',
      );
    }
  }

  async receiveSalesReturn(
    manager: EntityManager,
    input: {
      returnId: number;
      returnLineNumber: number;
      salesOrderLineId: number;
      itemId: number;
      batchId: number;
      unitId: number;
      quantity: string;
      actorId: number;
    },
  ): Promise<number> {
    const movementRepository = manager.getRepository(StockMovement);
    const batchRepository = manager.getRepository(StockBatch);
    const balanceRepository = manager.getRepository(InventoryBalance);
    const batch = await batchRepository.findOne({
      where: { id: input.batchId, itemId: input.itemId, status: 'active' },
      lock: { mode: 'pessimistic_write' },
    });
    if (!batch) {
      throw new ConflictError(
        ERROR_CODES.RESOURCE_CONFLICT,
        'Returned stock batch does not exist or is inactive',
      );
    }

    const shipped = await movementRepository
      .createQueryBuilder('movement')
      .where('movement.movementType = :movementType', { movementType: 'sale' })
      .andWhere('movement.sourceType = :sourceType', { sourceType: 'delivery' })
      .andWhere('movement.reason = :reason', {
        reason: `sales_order_line:${input.salesOrderLineId}`,
      })
      .andWhere('movement.itemId = :itemId', { itemId: input.itemId })
      .andWhere('movement.batchId = :batchId', { batchId: input.batchId })
      .andWhere('movement.unitId = :unitId', { unitId: input.unitId })
      .andWhere('movement.fromWarehouseId IS NOT NULL')
      .andWhere('movement.fromZoneId IS NOT NULL')
      .orderBy('movement.id', 'ASC')
      .getMany();
    const reason = `sales_order_line:${input.salesOrderLineId};source_batch_id:${input.batchId}`;
    const returned = await movementRepository
      .createQueryBuilder('movement')
      .where('movement.movementType = :movementType', { movementType: 'sales_return' })
      .andWhere('movement.sourceType = :sourceType', { sourceType: 'sales_return' })
      .andWhere('movement.reason = :reason', {
        reason,
      })
      .andWhere('movement.itemId = :itemId', { itemId: input.itemId })
      .andWhere('movement.unitId = :unitId', { unitId: input.unitId })
      .getMany();
    const shippedQuantity = shipped.reduce(
      (sum, movement) => sum + parseDecimal4(movement.quantity),
      0n,
    );
    const returnedQuantity = returned.reduce(
      (sum, movement) => sum + parseDecimal4(movement.quantity),
      0n,
    );
    const quantity = parseDecimal4(input.quantity);
    if (quantity <= 0n || returnedQuantity + quantity > shippedQuantity || shipped.length === 0) {
      throw new ConflictError(
        ERROR_CODES.RESOURCE_CONFLICT,
        'Returned quantity exceeds the delivered quantity for this batch',
      );
    }

    const origin = shipped[0];
    if (origin.fromWarehouseId === null || origin.fromZoneId === null) {
      throw new ConflictError(
        ERROR_CODES.RESOURCE_CONFLICT,
        'Original delivery location is missing for returned stock',
      );
    }
    const returnedBatch = await batchRepository.save(
      batchRepository.create({
        itemId: batch.itemId,
        batchNumber: `SR-${input.returnId}-${input.returnLineNumber}`,
        manufacturedAt: batch.manufacturedAt,
        expiresAt: batch.expiresAt,
        qcStatus: 'not_tracked',
        sourceType: 'sales_return',
        sourceId: `${input.returnId}:${input.returnLineNumber}:source-batch-${batch.id}`,
        status: 'active',
      }),
    );
    let balance = await balanceRepository.findOne({
      where: {
        itemId: input.itemId,
        batchId: returnedBatch.id,
        unitId: input.unitId,
        warehouseId: origin.fromWarehouseId,
        zoneId: origin.fromZoneId,
        stockStatus: 'available',
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (!balance) {
      balance = balanceRepository.create({
        itemId: input.itemId,
        batchId: returnedBatch.id,
        unitId: input.unitId,
        warehouseId: origin.fromWarehouseId,
        zoneId: origin.fromZoneId,
        stockStatus: 'available',
        quantityOnHand: '0.0000',
        quantityReserved: '0.0000',
      });
    }
    balance.quantityOnHand = addDecimal4(balance.quantityOnHand, input.quantity);
    await balanceRepository.save(balance);
    await movementRepository.save(
      movementRepository.create({
        movementNumber: `SR-${input.returnId}-${input.returnLineNumber}`,
        movementType: 'sales_return',
        itemId: input.itemId,
        batchId: returnedBatch.id,
        unitId: input.unitId,
        quantity: input.quantity,
        fromWarehouseId: null,
        fromZoneId: null,
        toWarehouseId: origin.fromWarehouseId,
        toZoneId: origin.fromZoneId,
        sourceType: 'sales_return',
        sourceId: String(input.returnId),
        idempotencyKey: null,
        actorId: input.actorId,
        reason,
      }),
    );
    return returnedBatch.id;
  }
}
