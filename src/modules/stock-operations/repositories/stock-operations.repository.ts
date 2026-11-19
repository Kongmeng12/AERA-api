import type {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { InventoryBalance, StockBatch, StockMovement } from '../../inventory/entities/stock.entity';
import {
  StockCount,
  StockCountLine,
  StockTransfer,
  StockTransferLine,
  StockWriteoff,
  StockWriteoffLine,
} from '../../inventory/entities/stock-operations.entity';
import { Item, Unit } from '../../master-data/entities/item.entity';
import { Warehouse, WarehouseZone } from '../../master-data/entities/warehouse.entity';
import type {
  ListStockCountsQueryDto,
  ListStockTransfersQueryDto,
  ListStockWriteoffsQueryDto,
} from '../dto/stock-operations.dto';

export class StockOperationsRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly manager?: EntityManager,
  ) {}

  transaction<T>(operation: (repository: StockOperationsRepository) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      operation(new StockOperationsRepository(this.dataSource, manager)),
    );
  }

  listTransfers(query: ListStockTransfersQueryDto) {
    const builder = this.repo(StockTransfer).createQueryBuilder('transfer');
    if (query.status) builder.andWhere('transfer.status = :status', { status: query.status });
    if (query.fromWarehouseId !== undefined)
      builder.andWhere('transfer.fromWarehouseId = :fromWarehouseId', {
        fromWarehouseId: query.fromWarehouseId,
      });
    if (query.toWarehouseId !== undefined)
      builder.andWhere('transfer.toWarehouseId = :toWarehouseId', {
        toWarehouseId: query.toWarehouseId,
      });
    return builder
      .orderBy('transfer.requestedAt', 'DESC')
      .addOrderBy('transfer.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findTransfer(id: number) {
    return this.repo(StockTransfer).findOne({ where: { id } });
  }

  findTransferForUpdate(id: number) {
    return this.locked(StockTransfer, 'transfer').where('transfer.id = :id', { id }).getOne();
  }

  findTransferLines(ids: number[]) {
    return ids.length
      ? this.repo(StockTransferLine)
          .createQueryBuilder('line')
          .where('line.transferId IN (:...ids)', { ids })
          .orderBy('line.transferId', 'ASC')
          .addOrderBy('line.lineNumber', 'ASC')
          .getMany()
      : Promise.resolve([]);
  }

  findTransferLinesForUpdate(id: number) {
    return this.locked(StockTransferLine, 'line')
      .where('line.transferId = :id', { id })
      .orderBy('line.id', 'ASC')
      .getMany();
  }

  createTransfer(data: DeepPartial<StockTransfer>) {
    return this.save(StockTransfer, data);
  }

  createTransferLines(data: DeepPartial<StockTransferLine>[]) {
    return this.saveMany(StockTransferLine, data);
  }

  saveTransferLine(line: StockTransferLine) {
    return this.repo(StockTransferLine).save(line);
  }

  saveTransfer(transfer: StockTransfer) {
    return this.repo(StockTransfer).save(transfer);
  }

  listCounts(query: ListStockCountsQueryDto) {
    const builder = this.repo(StockCount).createQueryBuilder('count');
    if (query.status) builder.andWhere('count.status = :status', { status: query.status });
    if (query.warehouseId !== undefined)
      builder.andWhere('count.warehouseId = :warehouseId', { warehouseId: query.warehouseId });
    return builder
      .orderBy('count.startedAt', 'DESC')
      .addOrderBy('count.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findCount(id: number) {
    return this.repo(StockCount).findOne({ where: { id } });
  }

  findCountForUpdate(id: number) {
    return this.locked(StockCount, 'count').where('count.id = :id', { id }).getOne();
  }

  findCountLines(ids: number[]) {
    return ids.length
      ? this.repo(StockCountLine)
          .createQueryBuilder('line')
          .where('line.stockCountId IN (:...ids)', { ids })
          .orderBy('line.stockCountId', 'ASC')
          .addOrderBy('line.lineNumber', 'ASC')
          .getMany()
      : Promise.resolve([]);
  }

  findCountLinesForUpdate(id: number) {
    return this.locked(StockCountLine, 'line')
      .where('line.stockCountId = :id', { id })
      .orderBy('line.id', 'ASC')
      .getMany();
  }

  createCount(data: DeepPartial<StockCount>) {
    return this.save(StockCount, data);
  }

  createCountLines(data: DeepPartial<StockCountLine>[]) {
    return this.saveMany(StockCountLine, data);
  }

  saveCount(count: StockCount) {
    return this.repo(StockCount).save(count);
  }

  listWriteoffs(query: ListStockWriteoffsQueryDto) {
    const builder = this.repo(StockWriteoff).createQueryBuilder('writeoff');
    if (query.status) builder.andWhere('writeoff.status = :status', { status: query.status });
    return builder
      .orderBy('writeoff.requestedAt', 'DESC')
      .addOrderBy('writeoff.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findWriteoff(id: number) {
    return this.repo(StockWriteoff).findOne({ where: { id } });
  }

  findWriteoffForUpdate(id: number) {
    return this.locked(StockWriteoff, 'writeoff').where('writeoff.id = :id', { id }).getOne();
  }

  findWriteoffLines(ids: number[]) {
    return ids.length
      ? this.repo(StockWriteoffLine)
          .createQueryBuilder('line')
          .where('line.writeoffId IN (:...ids)', { ids })
          .orderBy('line.writeoffId', 'ASC')
          .addOrderBy('line.lineNumber', 'ASC')
          .getMany()
      : Promise.resolve([]);
  }

  findWriteoffLinesForUpdate(id: number) {
    return this.locked(StockWriteoffLine, 'line')
      .where('line.writeoffId = :id', { id })
      .orderBy('line.id', 'ASC')
      .getMany();
  }

  createWriteoff(data: DeepPartial<StockWriteoff>) {
    return this.save(StockWriteoff, data);
  }

  createWriteoffLines(data: DeepPartial<StockWriteoffLine>[]) {
    return this.saveMany(StockWriteoffLine, data);
  }

  saveWriteoff(writeoff: StockWriteoff) {
    return this.repo(StockWriteoff).save(writeoff);
  }

  findWarehouse(id: number) {
    return this.repo(Warehouse).findOne({ where: { id, status: 'active' } });
  }

  findZone(id: number, warehouseId: number) {
    return this.repo(WarehouseZone).findOne({ where: { id, warehouseId, status: 'active' } });
  }

  findItem(id: number) {
    return this.repo(Item).findOne({ where: { id, status: 'active' } });
  }

  findUnit(id: number) {
    return this.repo(Unit).findOne({ where: { id } });
  }

  findActiveBatch(itemId: number, batchId: number) {
    return this.repo(StockBatch).findOne({ where: { id: batchId, itemId, status: 'active' } });
  }

  findSourceBalances(input: {
    itemId: number;
    batchId: number;
    unitId: number;
    warehouseId: number;
    zoneId: number | null;
  }) {
    const builder = this.locked(InventoryBalance, 'balance')
      .innerJoin('balance.batch', 'batch')
      .where('balance.itemId = :itemId', { itemId: input.itemId })
      .andWhere('balance.batchId = :batchId', { batchId: input.batchId })
      .andWhere('balance.unitId = :unitId', { unitId: input.unitId })
      .andWhere('balance.warehouseId = :warehouseId', { warehouseId: input.warehouseId })
      .andWhere('balance.stockStatus = :stockStatus', { stockStatus: 'available' })
      .andWhere('batch.status = :batchStatus', { batchStatus: 'active' });
    if (input.zoneId !== null)
      builder.andWhere('balance.zoneId = :zoneId', { zoneId: input.zoneId });
    return builder.orderBy('balance.id', 'ASC').getMany();
  }

  findCountSnapshotBalances(warehouseId: number, zoneId: number) {
    return this.locked(InventoryBalance, 'balance')
      .innerJoin('balance.batch', 'batch')
      .where('balance.warehouseId = :warehouseId', { warehouseId })
      .andWhere('balance.zoneId = :zoneId', { zoneId })
      .andWhere('balance.stockStatus = :stockStatus', { stockStatus: 'available' })
      .andWhere('batch.status = :batchStatus', { batchStatus: 'active' })
      .orderBy('balance.id', 'ASC')
      .getMany();
  }

  findCountBalanceForUpdate(input: {
    warehouseId: number;
    zoneId: number;
    itemId: number;
    batchId: number;
    unitId: number;
  }) {
    return this.locked(InventoryBalance, 'balance')
      .where('balance.warehouseId = :warehouseId', { warehouseId: input.warehouseId })
      .andWhere('balance.zoneId = :zoneId', { zoneId: input.zoneId })
      .andWhere('balance.itemId = :itemId', { itemId: input.itemId })
      .andWhere('balance.batchId = :batchId', { batchId: input.batchId })
      .andWhere('balance.unitId = :unitId', { unitId: input.unitId })
      .andWhere('balance.stockStatus = :stockStatus', { stockStatus: 'available' })
      .getOne();
  }

  hasCountMovementAfter(input: { startedAt: Date; warehouseId: number; zoneId: number }) {
    const builder = this.repo(StockMovement)
      .createQueryBuilder('movement')
      .where('movement.createdAt > :startedAt', { startedAt: input.startedAt })
      .andWhere(
        '((movement.fromWarehouseId = :warehouseId AND movement.fromZoneId = :zoneId) OR (movement.toWarehouseId = :warehouseId AND movement.toZoneId = :zoneId))',
        { warehouseId: input.warehouseId, zoneId: input.zoneId },
      );
    return builder.getCount().then((count) => count > 0);
  }

  findAvailableBalancesForWriteoff(itemId: number, batchId: number, unitId: number) {
    return this.locked(InventoryBalance, 'balance')
      .innerJoin('balance.batch', 'batch')
      .where('balance.itemId = :itemId', { itemId })
      .andWhere('balance.batchId = :batchId', { batchId })
      .andWhere('balance.unitId = :unitId', { unitId })
      .andWhere('balance.stockStatus = :stockStatus', { stockStatus: 'available' })
      .andWhere('batch.status = :batchStatus', { batchStatus: 'active' })
      .orderBy('balance.id', 'ASC')
      .getMany();
  }

  findBalanceForUpdate(id: number) {
    return this.locked(InventoryBalance, 'balance').where('balance.id = :id', { id }).getOne();
  }

  saveBalance(balance: InventoryBalance) {
    return this.repo(InventoryBalance).save(balance);
  }

  async addAvailableBalance(input: {
    itemId: number;
    batchId: number;
    unitId: number;
    warehouseId: number;
    zoneId: number;
    quantity: string;
  }) {
    if (!this.manager) throw new Error('Inventory transfer receipts must run in a transaction');
    await this.manager.query(
      'INSERT INTO `inventory_balances` (`item_id`, `batch_id`, `unit_id`, `warehouse_id`, `zone_id`, `stock_status`, `quantity_on_hand`, `quantity_reserved`) VALUES (?, ?, ?, ?, ?, ?, ?, 0) ON DUPLICATE KEY UPDATE `quantity_on_hand` = `quantity_on_hand` + VALUES(`quantity_on_hand`), `updated_at` = CURRENT_TIMESTAMP(6)',
      [
        input.itemId,
        input.batchId,
        input.unitId,
        input.warehouseId,
        input.zoneId,
        'available',
        input.quantity,
      ],
    );
  }

  createMovement(data: DeepPartial<StockMovement>) {
    return this.save(StockMovement, data);
  }

  private repo<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
    return this.manager
      ? this.manager.getRepository(entity)
      : this.dataSource.getRepository(entity);
  }

  private save<T extends ObjectLiteral>(entity: EntityTarget<T>, data: DeepPartial<T>) {
    const repository = this.repo(entity);
    return repository.save(repository.create(data));
  }

  private saveMany<T extends ObjectLiteral>(entity: EntityTarget<T>, data: DeepPartial<T>[]) {
    const repository = this.repo(entity);
    return repository.save(data.map((item) => repository.create(item)));
  }

  private locked<T extends ObjectLiteral>(entity: EntityTarget<T>, alias: string) {
    if (!this.manager) throw new Error('Locked stock reads must run in a transaction');
    return this.manager
      .getRepository(entity)
      .createQueryBuilder(alias)
      .setLock('pessimistic_write');
  }
}
