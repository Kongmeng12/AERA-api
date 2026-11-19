import type {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { Currency, ExchangeRate } from '../../master-data/entities/currency.entity';
import {
  Customer,
  CustomerAddress,
  CustomerType,
} from '../../master-data/entities/customer.entity';
import { Item, ItemUnitConversion, Unit } from '../../master-data/entities/item.entity';
import { SalesPrice } from '../../master-data/entities/pricing.entity';
import {
  PaymentAllocation,
  PaymentReceipt,
  SalesInvoice,
  SalesInvoiceLine,
} from '../entities/invoice-payment.entity';
import { SalesOrder, SalesOrderLine } from '../entities/sales-order.entity';
import type {
  ListSalesInvoicesQueryDto,
  ListSalesOrdersQueryDto,
  ListSalesPricesQueryDto,
} from '../dto/sales.dto';

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

export class SalesRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly manager?: EntityManager,
  ) {}

  transaction<T>(operation: (repository: SalesRepository, manager: EntityManager) => Promise<T>) {
    return this.dataSource.transaction((manager) =>
      operation(new SalesRepository(this.dataSource, manager), manager),
    );
  }

  findSalesOrders(query: ListSalesOrdersQueryDto) {
    const builder = this.repo(SalesOrder).createQueryBuilder('order');
    if (query.search) {
      builder.andWhere('order.orderNumber LIKE :search', {
        search: `%${escapeLike(query.search)}%`,
      });
    }
    if (query.customerId !== undefined) {
      builder.andWhere('order.customerId = :customerId', { customerId: query.customerId });
    }
    if (query.status) {
      builder.andWhere('order.status = :status', { status: query.status });
    }
    return builder
      .orderBy('order.orderedAt', 'DESC')
      .addOrderBy('order.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findSalesOrder(id: number) {
    return this.repo(SalesOrder).findOne({ where: { id } });
  }

  findSalesOrderForUpdate(id: number) {
    return this.lockedQuery(SalesOrder, 'salesOrder').where('salesOrder.id = :id', { id }).getOne();
  }

  findSalesOrderLines(orderIds: number[]) {
    if (orderIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo(SalesOrderLine)
      .createQueryBuilder('line')
      .where('line.salesOrderId IN (:...orderIds)', { orderIds })
      .orderBy('line.salesOrderId', 'ASC')
      .addOrderBy('line.lineNumber', 'ASC')
      .getMany();
  }

  findSalesOrderLinesForUpdate(orderId: number) {
    return this.lockedQuery(SalesOrderLine, 'line')
      .where('line.salesOrderId = :orderId', { orderId })
      .orderBy('line.id', 'ASC')
      .getMany();
  }

  findCustomer(id: number) {
    return this.repo(Customer).findOne({ where: { id, status: 'active' } });
  }

  findCustomerAddress(customerId: number, addressId: number) {
    return this.repo(CustomerAddress).findOne({ where: { id: addressId, customerId } });
  }

  findCurrency(id: number) {
    return this.repo(Currency).findOne({ where: { id } });
  }

  findBaseCurrency() {
    return this.repo(Currency).findOne({ where: { isBaseCurrency: true } });
  }

  findCustomerType(id: number) {
    return this.repo(CustomerType).findOne({ where: { id } });
  }

  findExchangeRate(baseCurrencyId: number, quoteCurrencyId: number, at: Date) {
    return this.repo(ExchangeRate)
      .createQueryBuilder('rate')
      .where('rate.baseCurrencyId = :baseCurrencyId', { baseCurrencyId })
      .andWhere('rate.quoteCurrencyId = :quoteCurrencyId', { quoteCurrencyId })
      .andWhere('rate.effectiveAt <= :at', { at })
      .orderBy('rate.effectiveAt', 'DESC')
      .addOrderBy('rate.id', 'DESC')
      .getOne();
  }

  findItem(id: number) {
    return this.repo(Item).findOne({ where: { id, status: 'active' } });
  }

  findUnit(id: number) {
    return this.repo(Unit).findOne({ where: { id } });
  }

  findItemUnitConversion(itemId: number, unitId: number) {
    return this.repo(ItemUnitConversion).findOne({ where: { itemId, unitId } });
  }

  async findSalesPrice(
    itemId: number,
    unitId: number,
    currencyId: number,
    customerId: number,
    customerTypeId: number,
    at: Date,
  ) {
    const activePrices = () =>
      this.repo(SalesPrice)
        .createQueryBuilder('price')
        .where('price.itemId = :itemId', { itemId })
        .andWhere('price.unitId = :unitId', { unitId })
        .andWhere('price.currencyId = :currencyId', { currencyId })
        .andWhere('price.effectiveFrom <= :at', { at })
        .andWhere('(price.effectiveTo IS NULL OR price.effectiveTo >= :at)', { at })
        .orderBy('price.effectiveFrom', 'DESC')
        .addOrderBy('price.id', 'DESC');

    const customerPrice = await activePrices()
      .andWhere('price.customerId = :customerId', { customerId })
      .getOne();
    if (customerPrice) {
      return customerPrice;
    }
    if (customerTypeId > 0) {
      const customerTypePrice = await activePrices()
        .andWhere('price.customerId IS NULL')
        .andWhere('price.customerTypeId = :customerTypeId', { customerTypeId })
        .getOne();
      if (customerTypePrice) {
        return customerTypePrice;
      }
    }
    return activePrices()
      .andWhere('price.customerId IS NULL')
      .andWhere('price.customerTypeId IS NULL')
      .getOne();
  }

  findSalesPrices(query: ListSalesPricesQueryDto) {
    const builder = this.repo(SalesPrice).createQueryBuilder('price');
    if (query.itemId !== undefined) {
      builder.andWhere('price.itemId = :itemId', { itemId: query.itemId });
    }
    return builder
      .orderBy('price.effectiveFrom', 'DESC')
      .addOrderBy('price.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  createSalesPrice(data: DeepPartial<SalesPrice>) {
    const repository = this.repo(SalesPrice);
    return repository.save(repository.create(data));
  }

  withManager(manager: EntityManager): SalesRepository {
    return new SalesRepository(this.dataSource, manager);
  }

  createSalesOrder(data: DeepPartial<SalesOrder>) {
    const repository = this.repo(SalesOrder);
    return repository.save(repository.create(data));
  }

  createSalesOrderLines(data: DeepPartial<SalesOrderLine>[]) {
    const repository = this.repo(SalesOrderLine);
    return repository.save(data.map((line) => repository.create(line)));
  }

  updateSalesOrderStatus(id: number, status: string) {
    return this.repo(SalesOrder).update({ id }, { status });
  }

  cancelSalesOrder(id: number, userId: number, reason: string, cancelledAt: Date) {
    return this.repo(SalesOrder).update(
      { id },
      { status: 'cancelled', cancelledById: userId, cancelledAt, cancelReason: reason },
    );
  }

  findSalesInvoices(query: ListSalesInvoicesQueryDto) {
    const builder = this.repo(SalesInvoice).createQueryBuilder('invoice');
    if (query.customerId !== undefined) {
      builder.andWhere('invoice.customerId = :customerId', { customerId: query.customerId });
    }
    if (query.salesOrderId !== undefined) {
      builder.andWhere('invoice.salesOrderId = :salesOrderId', {
        salesOrderId: query.salesOrderId,
      });
    }
    if (query.status) {
      builder.andWhere('invoice.status = :status', { status: query.status });
    }
    return builder
      .orderBy('invoice.issuedAt', 'DESC')
      .addOrderBy('invoice.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findSalesInvoice(id: number) {
    return this.repo(SalesInvoice).findOne({ where: { id } });
  }

  findSalesInvoiceForUpdate(id: number) {
    return this.lockedQuery(SalesInvoice, 'invoice').where('invoice.id = :id', { id }).getOne();
  }

  findSalesInvoiceLines(invoiceIds: number[]) {
    if (invoiceIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo(SalesInvoiceLine)
      .createQueryBuilder('line')
      .where('line.salesInvoiceId IN (:...invoiceIds)', { invoiceIds })
      .orderBy('line.salesInvoiceId', 'ASC')
      .addOrderBy('line.lineNumber', 'ASC')
      .getMany();
  }

  createSalesInvoice(data: DeepPartial<SalesInvoice>) {
    const repository = this.repo(SalesInvoice);
    return repository.save(repository.create(data));
  }

  createSalesInvoiceLines(data: DeepPartial<SalesInvoiceLine>[]) {
    const repository = this.repo(SalesInvoiceLine);
    return repository.save(data.map((line) => repository.create(line)));
  }

  findPreviouslyInvoicedQuantity(salesOrderLineId: number) {
    return this.repo(SalesInvoiceLine)
      .createQueryBuilder('line')
      .select('COALESCE(SUM(line.quantity), 0)', 'quantity')
      .innerJoin(SalesInvoice, 'invoice', 'invoice.id = line.salesInvoiceId')
      .where('line.salesOrderLineId = :salesOrderLineId', { salesOrderLineId })
      .andWhere('invoice.status != :cancelled', { cancelled: 'cancelled' })
      .getRawOne<{ quantity: string }>();
  }

  sumAllocatedPayments(salesInvoiceId: number) {
    return this.repo(PaymentAllocation)
      .createQueryBuilder('allocation')
      .select('COALESCE(SUM(allocation.amount), 0)', 'amount')
      .innerJoin(PaymentReceipt, 'receipt', 'receipt.id = allocation.paymentReceiptId')
      .where('allocation.salesInvoiceId = :salesInvoiceId', { salesInvoiceId })
      .andWhere('receipt.status = :status', { status: 'posted' })
      .getRawOne<{ amount: string }>();
  }

  updateSalesInvoiceStatus(id: number, status: string) {
    return this.repo(SalesInvoice).update({ id }, { status });
  }

  createPaymentReceipt(data: DeepPartial<PaymentReceipt>) {
    const repository = this.repo(PaymentReceipt);
    return repository.save(repository.create(data));
  }

  createPaymentAllocations(data: DeepPartial<PaymentAllocation>[]) {
    const repository = this.repo(PaymentAllocation);
    return repository.save(data.map((allocation) => repository.create(allocation)));
  }

  findPaymentAllocations(receiptId: number) {
    return this.repo(PaymentAllocation).find({
      where: { paymentReceiptId: receiptId },
      order: { id: 'ASC' },
    });
  }

  findSalesOrderLine(id: number) {
    return this.repo(SalesOrderLine).findOne({ where: { id } });
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
