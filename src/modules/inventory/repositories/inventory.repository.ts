import type { DataSource, Repository } from 'typeorm';
import { InventoryBalance, StockBatch, StockMovement } from '../entities/stock.entity';
import type {
  ListInventoryBalancesQueryDto,
  ListStockBatchesQueryDto,
  ListStockMovementsQueryDto,
} from '../dto/inventory.dto';

export class InventoryRepository {
  private readonly balances: Repository<InventoryBalance>;
  private readonly batches: Repository<StockBatch>;
  private readonly movements: Repository<StockMovement>;

  constructor(dataSource: DataSource) {
    this.balances = dataSource.getRepository(InventoryBalance);
    this.batches = dataSource.getRepository(StockBatch);
    this.movements = dataSource.getRepository(StockMovement);
  }

  findBalances(query: ListInventoryBalancesQueryDto) {
    const builder = this.balances.createQueryBuilder('balance');
    if (query.itemId !== undefined) {
      builder.andWhere('balance.itemId = :itemId', { itemId: query.itemId });
    }
    if (query.warehouseId !== undefined) {
      builder.andWhere('balance.warehouseId = :warehouseId', { warehouseId: query.warehouseId });
    }
    if (query.zoneId !== undefined) {
      builder.andWhere('balance.zoneId = :zoneId', { zoneId: query.zoneId });
    }
    if (query.stockStatus) {
      builder.andWhere('balance.stockStatus = :stockStatus', { stockStatus: query.stockStatus });
    }
    return builder
      .orderBy('balance.updatedAt', 'DESC')
      .addOrderBy('balance.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findBatches(query: ListStockBatchesQueryDto) {
    const builder = this.batches.createQueryBuilder('batch');
    if (query.itemId !== undefined) {
      builder.andWhere('batch.itemId = :itemId', { itemId: query.itemId });
    }
    if (query.qcStatus) {
      builder.andWhere('batch.qcStatus = :qcStatus', { qcStatus: query.qcStatus });
    }
    if (query.status) {
      builder.andWhere('batch.status = :status', { status: query.status });
    }
    return builder
      .orderBy('batch.createdAt', 'DESC')
      .addOrderBy('batch.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findMovements(query: ListStockMovementsQueryDto) {
    const builder = this.movements.createQueryBuilder('movement');
    if (query.itemId !== undefined) {
      builder.andWhere('movement.itemId = :itemId', { itemId: query.itemId });
    }
    if (query.movementType) {
      builder.andWhere('movement.movementType = :movementType', {
        movementType: query.movementType,
      });
    }
    if (query.from) {
      builder.andWhere('movement.createdAt >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      builder.andWhere('movement.createdAt <= :to', { to: new Date(query.to) });
    }
    return builder
      .orderBy('movement.createdAt', 'DESC')
      .addOrderBy('movement.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }
}
