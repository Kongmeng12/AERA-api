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
import { Supplier } from '../../master-data/entities/supplier.entity';
import {
  GoodsReceiptLine,
  PurchaseOrder,
  PurchaseOrderLine,
} from '../../purchasing/entities/purchase.entity';
import {
  SupplierBill,
  SupplierBillLine,
  SupplierBillReceiptMatch,
  SupplierPayment,
  SupplierPaymentAllocation,
} from '../entities/accounts-payable.entity';
import type { ListSupplierBillsQueryDto } from '../dto/finance.dto';

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

export class FinanceRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly manager?: EntityManager,
  ) {}

  transaction<T>(operation: (repository: FinanceRepository) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      operation(new FinanceRepository(this.dataSource, manager)),
    );
  }

  findSupplierBills(query: ListSupplierBillsQueryDto) {
    const builder = this.repo(SupplierBill).createQueryBuilder('bill');
    if (query.search) {
      builder.andWhere(
        '(bill.billNumber LIKE :search OR bill.supplierInvoiceNumber LIKE :search)',
        { search: `%${escapeLike(query.search)}%` },
      );
    }
    if (query.status) {
      builder.andWhere('bill.status = :status', { status: query.status });
    }
    if (query.supplierId !== undefined) {
      builder.andWhere('bill.supplierId = :supplierId', { supplierId: query.supplierId });
    }
    return builder
      .orderBy('bill.invoiceDate', 'DESC')
      .addOrderBy('bill.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findSupplierBill(id: number) {
    return this.repo(SupplierBill).findOne({ where: { id } });
  }

  findSupplierBillForUpdate(id: number) {
    return this.lockedQuery(SupplierBill, 'bill').where('bill.id = :id', { id }).getOne();
  }

  findSupplierBillLines(billIds: number[]) {
    if (billIds.length === 0) return Promise.resolve([]);
    return this.repo(SupplierBillLine)
      .createQueryBuilder('line')
      .where('line.supplierBillId IN (:...billIds)', { billIds })
      .orderBy('line.supplierBillId', 'ASC')
      .addOrderBy('line.lineNumber', 'ASC')
      .getMany();
  }

  findReceiptMatches(lineIds: number[]) {
    return lineIds.length === 0
      ? Promise.resolve([])
      : this.repo(SupplierBillReceiptMatch).find({
          where: { supplierBillLineId: In(lineIds) },
          order: { supplierBillLineId: 'ASC', id: 'ASC' },
        });
  }

  findSupplierBillAllocations(billIds: number[]) {
    return billIds.length === 0
      ? Promise.resolve([])
      : this.repo(SupplierPaymentAllocation).find({
          where: { supplierBillId: In(billIds) },
        });
  }

  findAllocationTotals(
    billIds: number[],
  ): Promise<Array<{ supplierBillId: number; total: string }>> {
    if (billIds.length === 0) return Promise.resolve([]);
    return this.repo(SupplierPaymentAllocation)
      .createQueryBuilder('allocation')
      .select('allocation.supplierBillId', 'supplierBillId')
      .addSelect('SUM(allocation.amount)', 'total')
      .where('allocation.supplierBillId IN (:...billIds)', { billIds })
      .groupBy('allocation.supplierBillId')
      .getRawMany();
  }

  findSupplier(id: number) {
    return this.repo(Supplier).findOne({ where: { id, status: 'active' } });
  }

  findCurrency(id: number) {
    return this.repo(Currency).findOne({ where: { id } });
  }

  findPurchaseOrderForUpdate(id: number) {
    return this.lockedQuery(PurchaseOrder, 'purchaseOrder')
      .where('purchaseOrder.id = :id', { id })
      .getOne();
  }

  findPurchaseOrderLinesForUpdate(orderId: number, lineIds: number[]) {
    if (lineIds.length === 0) return Promise.resolve([]);
    return this.lockedQuery(PurchaseOrderLine, 'line')
      .where('line.purchaseOrderId = :orderId AND line.id IN (:...lineIds)', {
        orderId,
        lineIds,
      })
      .orderBy('line.id', 'ASC')
      .getMany();
  }

  findReceiptLinesForUpdate(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.lockedQuery(GoodsReceiptLine, 'receiptLine')
      .innerJoinAndSelect('receiptLine.goodsReceipt', 'receipt')
      .innerJoinAndSelect('receiptLine.purchaseOrderLine', 'orderLine')
      .where('receiptLine.id IN (:...ids)', { ids })
      .orderBy('receiptLine.id', 'ASC')
      .getMany();
  }

  findReceiptLineMatches(ids: number[]) {
    if (ids.length === 0) {
      return Promise.resolve([] as Array<{ goodsReceiptLineId: number; total: string }>);
    }
    return this.repo(SupplierBillReceiptMatch)
      .createQueryBuilder('match')
      .select('match.goodsReceiptLineId', 'goodsReceiptLineId')
      .addSelect('SUM(match.matchedQuantity)', 'total')
      .where('match.goodsReceiptLineId IN (:...ids)', { ids })
      .groupBy('match.goodsReceiptLineId')
      .getRawMany<{ goodsReceiptLineId: number; total: string }>();
  }

  findPurchaseOrderLineMatchTotals(ids: number[]) {
    if (ids.length === 0) {
      return Promise.resolve([] as Array<{ purchaseOrderLineId: number; total: string }>);
    }
    return this.repo(SupplierBillReceiptMatch)
      .createQueryBuilder('match')
      .innerJoin(SupplierBillLine, 'billLine', 'billLine.id = match.supplierBillLineId')
      .select('billLine.purchaseOrderLineId', 'purchaseOrderLineId')
      .addSelect('SUM(match.matchedQuantity)', 'total')
      .where('billLine.purchaseOrderLineId IN (:...ids)', { ids })
      .groupBy('billLine.purchaseOrderLineId')
      .getRawMany<{ purchaseOrderLineId: number; total: string }>();
  }

  createSupplierBill(data: DeepPartial<SupplierBill>) {
    const repository = this.repo(SupplierBill);
    return repository.save(repository.create(data));
  }

  createSupplierBillLines(data: DeepPartial<SupplierBillLine>[]) {
    const repository = this.repo(SupplierBillLine);
    return repository.save(data.map((line) => repository.create(line)));
  }

  createReceiptMatches(data: DeepPartial<SupplierBillReceiptMatch>[]) {
    const repository = this.repo(SupplierBillReceiptMatch);
    return repository.save(data.map((match) => repository.create(match)));
  }

  updateSupplierBillStatus(id: number, status: string) {
    return this.repo(SupplierBill).update({ id }, { status });
  }

  findBillsForUpdate(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.lockedQuery(SupplierBill, 'bill')
      .where('bill.id IN (:...ids)', { ids })
      .orderBy('bill.id', 'ASC')
      .getMany();
  }

  createSupplierPayment(data: DeepPartial<SupplierPayment>) {
    const repository = this.repo(SupplierPayment);
    return repository.save(repository.create(data));
  }

  createPaymentAllocations(data: DeepPartial<SupplierPaymentAllocation>[]) {
    const repository = this.repo(SupplierPaymentAllocation);
    return repository.save(data.map((allocation) => repository.create(allocation)));
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
