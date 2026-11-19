import type {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { In } from 'typeorm';
import { Currency } from '../../master-data/entities/currency.entity';
import { Item, ItemUnitConversion, Unit } from '../../master-data/entities/item.entity';
import { Supplier } from '../../master-data/entities/supplier.entity';
import { Warehouse, WarehouseZone } from '../../master-data/entities/warehouse.entity';
import { StockBatch, StockMovement } from '../../inventory/entities/stock.entity';
import {
  GoodsReceipt,
  GoodsReceiptLine,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseRequisition,
} from '../entities/purchase.entity';
import type { ListGoodsReceiptsQueryDto, ListPurchaseOrdersQueryDto } from '../dto/purchasing.dto';

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

export class PurchasingRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly manager?: EntityManager,
  ) {}

  transaction<T>(operation: (repository: PurchasingRepository) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      operation(new PurchasingRepository(this.dataSource, manager)),
    );
  }

  findPurchaseOrders(query: ListPurchaseOrdersQueryDto) {
    const builder = this.repo(PurchaseOrder).createQueryBuilder('purchaseOrder');
    if (query.search) {
      builder.andWhere('purchaseOrder.purchaseOrderNumber LIKE :search', {
        search: `%${escapeLike(query.search)}%`,
      });
    }
    if (query.status) {
      builder.andWhere('purchaseOrder.status = :status', { status: query.status });
    }
    if (query.supplierId !== undefined) {
      builder.andWhere('purchaseOrder.supplierId = :supplierId', {
        supplierId: query.supplierId,
      });
    }
    return builder
      .orderBy('purchaseOrder.orderedAt', 'DESC')
      .addOrderBy('purchaseOrder.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findPurchaseOrder(id: number) {
    return this.repo(PurchaseOrder).findOne({ where: { id } });
  }

  findPurchaseOrderForUpdate(id: number) {
    return this.lockedQuery(PurchaseOrder, 'purchaseOrder')
      .where('purchaseOrder.id = :id', { id })
      .getOne();
  }

  findPurchaseOrderLines(orderIds: number[]) {
    if (orderIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo(PurchaseOrderLine)
      .createQueryBuilder('line')
      .where('line.purchaseOrderId IN (:...orderIds)', { orderIds })
      .orderBy('line.purchaseOrderId', 'ASC')
      .addOrderBy('line.lineNumber', 'ASC')
      .getMany();
  }

  findPurchaseOrderLineForUpdate(orderId: number, lineId: number) {
    return this.lockedQuery(PurchaseOrderLine, 'line')
      .where('line.purchaseOrderId = :orderId AND line.id = :lineId', { orderId, lineId })
      .getOne();
  }

  findPurchaseOrderLinesForUpdate(orderId: number, lineIds: number[]) {
    if (lineIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.lockedQuery(PurchaseOrderLine, 'line')
      .where('line.purchaseOrderId = :orderId AND line.id IN (:...lineIds)', {
        orderId,
        lineIds,
      })
      .orderBy('line.id', 'ASC')
      .getMany();
  }

  findPurchaseOrderLine(id: number) {
    return this.repo(PurchaseOrderLine).findOne({ where: { id } });
  }

  findPurchaseRequisition(id: number) {
    return this.repo(PurchaseRequisition).findOne({ where: { id } });
  }

  findSupplier(id: number) {
    return this.repo(Supplier).findOne({ where: { id, status: 'active' } });
  }

  findCurrency(id: number) {
    return this.repo(Currency).findOne({ where: { id } });
  }

  findItem(id: number) {
    return this.repo(Item).findOne({ where: { id, status: 'active' } });
  }

  findItems(ids: number[]) {
    return ids.length === 0
      ? Promise.resolve([])
      : this.repo(Item).find({ where: { id: In(ids), status: 'active' } });
  }

  findUnit(id: number) {
    return this.repo(Unit).findOne({ where: { id } });
  }

  findUnits(ids: number[]) {
    return ids.length === 0
      ? Promise.resolve([])
      : this.repo(Unit).find({ where: { id: In(ids) } });
  }

  findItemUnitConversion(itemId: number, unitId: number) {
    return this.repo(ItemUnitConversion).findOne({ where: { itemId, unitId } });
  }

  findItemUnitConversions(itemIds: number[]) {
    return itemIds.length === 0
      ? Promise.resolve([])
      : this.repo(ItemUnitConversion).find({ where: { itemId: In(itemIds) } });
  }

  findWarehouse(id: number) {
    return this.repo(Warehouse).findOne({ where: { id, status: 'active' } });
  }

  findWarehouseZone(id: number) {
    return this.repo(WarehouseZone).findOne({ where: { id, status: 'active' } });
  }

  batchForUpdate(itemId: number, batchNumber: string) {
    return this.lockedQuery(StockBatch, 'batch')
      .where('batch.itemId = :itemId AND batch.batchNumber = :batchNumber', {
        itemId,
        batchNumber,
      })
      .getOne();
  }

  createPurchaseOrder(data: DeepPartial<PurchaseOrder>) {
    const repository = this.repo(PurchaseOrder);
    return repository.save(repository.create(data));
  }

  createPurchaseOrderLines(data: DeepPartial<PurchaseOrderLine>[]) {
    const repository = this.repo(PurchaseOrderLine);
    return repository.save(data.map((line) => repository.create(line)));
  }

  updatePurchaseOrderStatus(id: number, status: string) {
    return this.repo(PurchaseOrder).update({ id }, { status });
  }

  updatePurchaseOrderLineReceived(id: number, receivedQuantity: string) {
    return this.repo(PurchaseOrderLine).update({ id }, { receivedQuantity });
  }

  findGoodsReceipts(query: ListGoodsReceiptsQueryDto) {
    const builder = this.repo(GoodsReceipt).createQueryBuilder('receipt');
    if (query.search) {
      builder.andWhere('receipt.receiptNumber LIKE :search', {
        search: `%${escapeLike(query.search)}%`,
      });
    }
    if (query.purchaseOrderId !== undefined) {
      builder.andWhere('receipt.purchaseOrderId = :purchaseOrderId', {
        purchaseOrderId: query.purchaseOrderId,
      });
    }
    if (query.supplierId !== undefined) {
      builder.andWhere('receipt.supplierId = :supplierId', { supplierId: query.supplierId });
    }
    if (query.warehouseId !== undefined) {
      builder.andWhere('receipt.warehouseId = :warehouseId', { warehouseId: query.warehouseId });
    }
    return builder
      .orderBy('receipt.receivedAt', 'DESC')
      .addOrderBy('receipt.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findGoodsReceipt(id: number) {
    return this.repo(GoodsReceipt).findOne({ where: { id } });
  }

  findGoodsReceiptLines(receiptIds: number[]) {
    if (receiptIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo(GoodsReceiptLine)
      .createQueryBuilder('line')
      .where('line.goodsReceiptId IN (:...receiptIds)', { receiptIds })
      .orderBy('line.goodsReceiptId', 'ASC')
      .addOrderBy('line.lineNumber', 'ASC')
      .getMany();
  }

  createGoodsReceipt(data: DeepPartial<GoodsReceipt>) {
    const repository = this.repo(GoodsReceipt);
    return repository.save(repository.create(data));
  }

  createGoodsReceiptLines(data: DeepPartial<GoodsReceiptLine>[]) {
    const repository = this.repo(GoodsReceiptLine);
    return repository.save(data.map((line) => repository.create(line)));
  }

  createStockBatch(data: DeepPartial<StockBatch>) {
    const repository = this.repo(StockBatch);
    return repository.save(repository.create(data));
  }

  updateStockBatch(id: number, data: Pick<StockBatch, 'manufacturedAt' | 'expiresAt'>) {
    return this.repo(StockBatch).update({ id }, data);
  }

  async addInventoryToQcHold(data: {
    itemId: number;
    batchId: number;
    unitId: number;
    warehouseId: number;
    zoneId: number;
    quantity: string;
  }): Promise<void> {
    if (!this.manager) {
      throw new Error('Inventory receipt updates must run inside a transaction');
    }
    await this.manager.query(
      'INSERT INTO `inventory_balances` (`item_id`, `batch_id`, `unit_id`, `warehouse_id`, `zone_id`, `stock_status`, `quantity_on_hand`, `quantity_reserved`) VALUES (?, ?, ?, ?, ?, ?, ?, 0) ON DUPLICATE KEY UPDATE `quantity_on_hand` = `quantity_on_hand` + VALUES(`quantity_on_hand`), `updated_at` = CURRENT_TIMESTAMP(6)',
      [
        data.itemId,
        data.batchId,
        data.unitId,
        data.warehouseId,
        data.zoneId,
        'qc_hold',
        data.quantity,
      ],
    );
  }

  createStockMovement(data: DeepPartial<StockMovement>) {
    const repository = this.repo(StockMovement);
    return repository.save(repository.create(data));
  }

  private repo<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
    return this.manager
      ? this.manager.getRepository(entity)
      : this.dataSource.getRepository(entity);
  }

  private lockedQuery<T extends ObjectLiteral>(entity: EntityTarget<T>, alias: string) {
    if (!this.manager) {
      throw new Error('Locked reads must run inside a transaction');
    }
    return this.manager
      .getRepository(entity)
      .createQueryBuilder(alias)
      .setLock('pessimistic_write');
  }
}
