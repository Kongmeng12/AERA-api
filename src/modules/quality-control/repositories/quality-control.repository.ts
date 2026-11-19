import type {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { In } from 'typeorm';
import { InventoryBalance, StockBatch, StockMovement } from '../../inventory/entities/stock.entity';
import { Item, Unit } from '../../master-data/entities/item.entity';
import {
  QcInspection,
  QcInspectionResult,
  QcTestDefinition,
} from '../entities/quality-control.entity';
import type {
  ListInspectionsQueryDto,
  ListTestDefinitionsQueryDto,
} from '../dto/quality-control.dto';

export class QualityControlRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly manager?: EntityManager,
  ) {}

  transaction<T>(operation: (repo: QualityControlRepository) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      operation(new QualityControlRepository(this.dataSource, manager)),
    );
  }
  listDefinitions(query: ListTestDefinitionsQueryDto) {
    const builder = this.repo(QcTestDefinition).createQueryBuilder('definition');
    if (query.itemId !== undefined)
      builder.andWhere('definition.itemId = :itemId', { itemId: query.itemId });
    if (query.isActive !== undefined)
      builder.andWhere('definition.isActive = :isActive', { isActive: query.isActive });
    return builder
      .orderBy('definition.name', 'ASC')
      .addOrderBy('definition.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }
  findDefinition(id: number) {
    return this.repo(QcTestDefinition).findOne({ where: { id } });
  }
  findDefinitions(ids: number[]) {
    return ids.length
      ? this.repo(QcTestDefinition).find({ where: { id: In(ids) } })
      : Promise.resolve([]);
  }
  findActiveDefinitions(itemId: number) {
    return this.repo(QcTestDefinition)
      .createQueryBuilder('definition')
      .where('definition.isActive = :active', { active: true })
      .andWhere('(definition.itemId IS NULL OR definition.itemId = :itemId)', { itemId })
      .orderBy('definition.id', 'ASC')
      .getMany();
  }
  createDefinition(data: DeepPartial<QcTestDefinition>) {
    return this.save(QcTestDefinition, data);
  }
  findItem(id: number) {
    return this.repo(Item).findOne({ where: { id, status: 'active' } });
  }
  findUnit(id: number) {
    return this.repo(Unit).findOne({ where: { id } });
  }

  listInspections(query: ListInspectionsQueryDto) {
    const builder = this.repo(QcInspection).createQueryBuilder('inspection');
    if (query.batchId !== undefined)
      builder.andWhere('inspection.batchId = :batchId', { batchId: query.batchId });
    if (query.status) builder.andWhere('inspection.status = :status', { status: query.status });
    return builder
      .orderBy('inspection.inspectedAt', 'DESC')
      .addOrderBy('inspection.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }
  findInspection(id: number) {
    return this.repo(QcInspection).findOne({ where: { id } });
  }
  findInspectionForUpdate(id: number) {
    return this.locked(QcInspection, 'inspection').where('inspection.id = :id', { id }).getOne();
  }
  findUnreleasedPassingInspection(batchId: number) {
    return this.repo(QcInspection)
      .createQueryBuilder('inspection')
      .where('inspection.batchId = :batchId', { batchId })
      .andWhere('inspection.status = :status', { status: 'passed' })
      .andWhere('inspection.releasedAt IS NULL')
      .getOne();
  }
  findResults(ids: number[]) {
    return ids.length
      ? this.repo(QcInspectionResult)
          .createQueryBuilder('result')
          .where('result.inspectionId IN (:...ids)', { ids })
          .orderBy('result.id', 'ASC')
          .getMany()
      : Promise.resolve([]);
  }
  createInspection(data: DeepPartial<QcInspection>) {
    return this.save(QcInspection, data);
  }
  createResults(data: DeepPartial<QcInspectionResult>[]) {
    const repository = this.repo(QcInspectionResult);
    return repository.save(data.map((result) => repository.create(result)));
  }
  saveInspection(inspection: QcInspection) {
    return this.repo(QcInspection).save(inspection);
  }
  findBatchForUpdate(id: number) {
    return this.locked(StockBatch, 'batch').where('batch.id = :id', { id }).getOne();
  }
  saveBatch(batch: StockBatch) {
    return this.repo(StockBatch).save(batch);
  }
  findQcHoldBalances(batchId: number) {
    return this.locked(InventoryBalance, 'balance')
      .where('balance.batchId = :batchId', { batchId })
      .andWhere('balance.stockStatus = :status', { status: 'qc_hold' })
      .orderBy('balance.id', 'ASC')
      .getMany();
  }
  saveBalance(balance: InventoryBalance) {
    return this.repo(InventoryBalance).save(balance);
  }
  async addAvailableBalance(data: {
    itemId: number;
    batchId: number;
    unitId: number;
    warehouseId: number;
    zoneId: number;
    quantity: string;
  }) {
    if (!this.manager) throw new Error('QC stock releases must run inside a transaction');
    await this.manager.query(
      'INSERT INTO `inventory_balances` (`item_id`, `batch_id`, `unit_id`, `warehouse_id`, `zone_id`, `stock_status`, `quantity_on_hand`, `quantity_reserved`) VALUES (?, ?, ?, ?, ?, ?, ?, 0) ON DUPLICATE KEY UPDATE `quantity_on_hand` = `quantity_on_hand` + VALUES(`quantity_on_hand`), `updated_at` = CURRENT_TIMESTAMP(6)',
      [
        data.itemId,
        data.batchId,
        data.unitId,
        data.warehouseId,
        data.zoneId,
        'available',
        data.quantity,
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
  private locked<T extends ObjectLiteral>(entity: EntityTarget<T>, alias: string) {
    if (!this.manager) throw new Error('Locked reads must run inside a transaction');
    return this.manager
      .getRepository(entity)
      .createQueryBuilder(alias)
      .setLock('pessimistic_write');
  }
}
