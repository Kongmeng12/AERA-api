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
import { Item, ItemUnitConversion, Unit } from '../../master-data/entities/item.entity';
import { Warehouse, WarehouseZone } from '../../master-data/entities/warehouse.entity';
import {
  BillOfMaterialLine,
  BillOfMaterials,
  ProductionMaterialIssue,
  ProductionOrder,
  ProductionOrderOutput,
} from '../entities/production.entity';
import type { ListBomsQueryDto, ListProductionOrdersQueryDto } from '../dto/production.dto';

export class ProductionRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly manager?: EntityManager,
  ) {}

  transaction<T>(operation: (repo: ProductionRepository) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      operation(new ProductionRepository(this.dataSource, manager)),
    );
  }

  listBoms(query: ListBomsQueryDto) {
    const builder = this.repo(BillOfMaterials).createQueryBuilder('bom');
    if (query.itemId !== undefined)
      builder.andWhere('bom.itemId = :itemId', { itemId: query.itemId });
    if (query.status) builder.andWhere('bom.status = :status', { status: query.status });
    return builder
      .orderBy('bom.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findBom(id: number) {
    return this.repo(BillOfMaterials).findOne({ where: { id } });
  }
  findBomForUpdate(id: number) {
    return this.locked(BillOfMaterials, 'bom').where('bom.id = :id', { id }).getOne();
  }
  findBoms(ids: number[]) {
    return ids.length
      ? this.repo(BillOfMaterials).find({ where: { id: In(ids) } })
      : Promise.resolve([]);
  }

  findBomLines(ids: number[]) {
    return ids.length
      ? this.repo(BillOfMaterialLine)
          .createQueryBuilder('line')
          .where('line.billOfMaterialsId IN (:...ids)', { ids })
          .orderBy('line.billOfMaterialsId', 'ASC')
          .addOrderBy('line.lineNumber', 'ASC')
          .getMany()
      : Promise.resolve([]);
  }
  findBomLinesForUpdate(id: number) {
    return this.locked(BillOfMaterialLine, 'line')
      .where('line.billOfMaterialsId = :id', { id })
      .orderBy('line.id', 'ASC')
      .getMany();
  }
  createBom(data: DeepPartial<BillOfMaterials>) {
    return this.save(BillOfMaterials, data);
  }
  createBomLines(data: DeepPartial<BillOfMaterialLine>[]) {
    const repository = this.repo(BillOfMaterialLine);
    return repository.save(data.map((line) => repository.create(line)));
  }
  setBomStatus(id: number, status: string) {
    return this.repo(BillOfMaterials).update({ id }, { status });
  }

  listOrders(query: ListProductionOrdersQueryDto) {
    const builder = this.repo(ProductionOrder).createQueryBuilder('order');
    if (query.status) builder.andWhere('order.status = :status', { status: query.status });
    if (query.itemId !== undefined)
      builder.andWhere('order.itemId = :itemId', { itemId: query.itemId });
    return builder
      .orderBy('order.plannedStartAt', 'DESC')
      .addOrderBy('order.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }
  findOrder(id: number) {
    return this.repo(ProductionOrder).findOne({ where: { id } });
  }
  findOrderForUpdate(id: number) {
    return this.locked(ProductionOrder, 'order').where('order.id = :id', { id }).getOne();
  }
  createOrder(data: DeepPartial<ProductionOrder>) {
    return this.save(ProductionOrder, data);
  }
  saveOrder(order: ProductionOrder) {
    return this.repo(ProductionOrder).save(order);
  }

  findIssues(orderIds: number[]) {
    return orderIds.length
      ? this.repo(ProductionMaterialIssue)
          .createQueryBuilder('issue')
          .where('issue.productionOrderId IN (:...orderIds)', { orderIds })
          .orderBy('issue.id', 'ASC')
          .getMany()
      : Promise.resolve([]);
  }
  findIssuesForUpdate(orderId: number) {
    return this.locked(ProductionMaterialIssue, 'issue')
      .where('issue.productionOrderId = :orderId', { orderId })
      .orderBy('issue.id', 'ASC')
      .getMany();
  }
  saveIssue(data: DeepPartial<ProductionMaterialIssue>) {
    return this.save(ProductionMaterialIssue, data);
  }
  saveIssues(issues: ProductionMaterialIssue[]) {
    return this.repo(ProductionMaterialIssue).save(issues);
  }
  findOutputs(orderIds: number[]) {
    return orderIds.length
      ? this.repo(ProductionOrderOutput)
          .createQueryBuilder('output')
          .where('output.productionOrderId IN (:...orderIds)', { orderIds })
          .orderBy('output.id', 'ASC')
          .getMany()
      : Promise.resolve([]);
  }
  createOutput(data: DeepPartial<ProductionOrderOutput>) {
    return this.save(ProductionOrderOutput, data);
  }

  findItem(id: number) {
    return this.repo(Item).findOne({ where: { id, status: 'active' } });
  }
  findItems(ids: number[]) {
    return ids.length
      ? this.repo(Item).find({ where: { id: In(ids), status: 'active' } })
      : Promise.resolve([]);
  }
  findUnits(ids: number[]) {
    return ids.length ? this.repo(Unit).find({ where: { id: In(ids) } }) : Promise.resolve([]);
  }
  findConversions(itemIds: number[]) {
    return itemIds.length
      ? this.repo(ItemUnitConversion).find({ where: { itemId: In(itemIds) } })
      : Promise.resolve([]);
  }
  findWarehouse(id: number) {
    return this.repo(Warehouse).findOne({ where: { id, status: 'active' } });
  }
  findZone(id: number) {
    return this.repo(WarehouseZone).findOne({ where: { id, status: 'active' } });
  }

  findAvailableBalances(itemId: number, unitId: number, batchId: number) {
    if (!this.manager) throw new Error('Locked stock reads must run inside a transaction');
    return this.manager
      .getRepository(InventoryBalance)
      .createQueryBuilder('balance')
      .innerJoin('balance.batch', 'batch')
      .where(
        'balance.itemId = :itemId AND balance.unitId = :unitId AND balance.batchId = :batchId',
        { itemId, unitId, batchId },
      )
      .andWhere('balance.stockStatus = :stockStatus', { stockStatus: 'available' })
      .andWhere('batch.status = :batchStatus', { batchStatus: 'active' })
      .orderBy('balance.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
  }
  findBatchForUpdate(id: number) {
    return this.locked(StockBatch, 'batch').where('batch.id = :id', { id }).getOne();
  }
  findBatchByNumber(itemId: number, batchNumber: string) {
    return this.locked(StockBatch, 'batch')
      .where('batch.itemId = :itemId AND batch.batchNumber = :batchNumber', { itemId, batchNumber })
      .getOne();
  }
  saveBalance(balance: InventoryBalance) {
    return this.repo(InventoryBalance).save(balance);
  }
  createBatch(data: DeepPartial<StockBatch>) {
    return this.save(StockBatch, data);
  }
  async addAvailableBalance(data: {
    itemId: number;
    batchId: number;
    unitId: number;
    warehouseId: number;
    zoneId: number;
    quantity: string;
  }) {
    if (!this.manager) throw new Error('Stock updates must run inside a transaction');
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
