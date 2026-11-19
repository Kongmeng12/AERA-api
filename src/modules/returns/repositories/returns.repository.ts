import type {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import {
  CreditNote,
  PaymentAllocation,
  PaymentReceipt,
  SalesInvoice,
  SalesInvoiceLine,
} from '../../sales/entities/invoice-payment.entity';
import {
  CreditNoteLine,
  SalesReturn,
  SalesReturnLine,
} from '../../sales/entities/sales-return.entity';
import type { ListReturnsQueryDto } from '../dto/returns.dto';

export class ReturnsRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly manager?: EntityManager,
  ) {}

  transaction<T>(
    operation: (repository: ReturnsRepository, manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction((manager) =>
      operation(new ReturnsRepository(this.dataSource, manager), manager),
    );
  }

  findReturns(query: ListReturnsQueryDto) {
    const builder = this.repo(SalesReturn).createQueryBuilder('salesReturn');
    if (query.salesInvoiceId !== undefined) {
      builder.andWhere('salesReturn.salesInvoiceId = :salesInvoiceId', {
        salesInvoiceId: query.salesInvoiceId,
      });
    }
    if (query.status) {
      builder.andWhere('salesReturn.status = :status', { status: query.status });
    }
    return builder
      .orderBy('salesReturn.requestedAt', 'DESC')
      .addOrderBy('salesReturn.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findReturnsLines(returnIds: number[]) {
    if (returnIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo(SalesReturnLine)
      .createQueryBuilder('line')
      .where('line.salesReturnId IN (:...returnIds)', { returnIds })
      .orderBy('line.salesReturnId', 'ASC')
      .addOrderBy('line.lineNumber', 'ASC')
      .getMany();
  }

  findSalesReturn(id: number) {
    return this.repo(SalesReturn).findOne({ where: { id } });
  }

  findSalesReturnForUpdate(id: number) {
    return this.lockedQuery(SalesReturn, 'salesReturn')
      .where('salesReturn.id = :id', { id })
      .getOne();
  }

  findSalesInvoiceForUpdate(id: number) {
    return this.lockedQuery(SalesInvoice, 'invoice').where('invoice.id = :id', { id }).getOne();
  }

  findSalesInvoiceLineForUpdate(id: number, invoiceId: number) {
    return this.lockedQuery(SalesInvoiceLine, 'invoiceLine')
      .where('invoiceLine.id = :id', { id })
      .andWhere('invoiceLine.salesInvoiceId = :invoiceId', { invoiceId })
      .getOne();
  }

  sumReturnQuantities(invoiceLineId: number) {
    return this.repo(SalesReturnLine)
      .createQueryBuilder('line')
      .select('COALESCE(SUM(line.quantity), 0)', 'quantity')
      .innerJoin(SalesReturn, 'salesReturn', 'salesReturn.id = line.salesReturnId')
      .where('line.salesInvoiceLineId = :invoiceLineId', { invoiceLineId })
      .andWhere('salesReturn.status != :rejected', { rejected: 'rejected' })
      .getRawOne<{ quantity: string }>();
  }

  sumApprovedReturnQuantities(invoiceLineId: number) {
    return this.repo(SalesReturnLine)
      .createQueryBuilder('line')
      .select('COALESCE(SUM(line.quantity), 0)', 'quantity')
      .innerJoin(SalesReturn, 'salesReturn', 'salesReturn.id = line.salesReturnId')
      .where('line.salesInvoiceLineId = :invoiceLineId', { invoiceLineId })
      .andWhere('salesReturn.status = :status', { status: 'approved' })
      .getRawOne<{ quantity: string }>();
  }

  createSalesReturn(data: DeepPartial<SalesReturn>) {
    const repository = this.repo(SalesReturn);
    return repository.save(repository.create(data));
  }

  createSalesReturnLines(data: DeepPartial<SalesReturnLine>[]) {
    const repository = this.repo(SalesReturnLine);
    return repository.save(data.map((line) => repository.create(line)));
  }

  saveSalesReturnLine(line: SalesReturnLine) {
    return this.repo(SalesReturnLine).save(line);
  }

  createCreditNote(data: DeepPartial<CreditNote>) {
    const repository = this.repo(CreditNote);
    return repository.save(repository.create(data));
  }

  createCreditNoteLines(data: DeepPartial<CreditNoteLine>[]) {
    const repository = this.repo(CreditNoteLine);
    return repository.save(data.map((line) => repository.create(line)));
  }

  updateSalesReturn(id: number, data: Pick<SalesReturn, 'status' | 'creditNoteId' | 'reason'>) {
    return this.repo(SalesReturn).update({ id }, data);
  }

  sumIssuedCreditNotes(invoiceId: number) {
    return this.repo(CreditNote)
      .createQueryBuilder('creditNote')
      .select('COALESCE(SUM(creditNote.amount), 0)', 'amount')
      .where('creditNote.salesInvoiceId = :invoiceId', { invoiceId })
      .andWhere('creditNote.status = :status', { status: 'issued' })
      .getRawOne<{ amount: string }>();
  }

  sumPostedPayments(invoiceId: number) {
    return this.repo(PaymentAllocation)
      .createQueryBuilder('allocation')
      .select('COALESCE(SUM(allocation.amount), 0)', 'amount')
      .innerJoin(PaymentReceipt, 'receipt', 'receipt.id = allocation.paymentReceiptId')
      .where('allocation.salesInvoiceId = :invoiceId', { invoiceId })
      .andWhere('receipt.status = :status', { status: 'posted' })
      .getRawOne<{ amount: string }>();
  }

  updateSalesInvoiceStatus(id: number, status: string) {
    return this.repo(SalesInvoice).update({ id }, { status });
  }

  withManager(manager: EntityManager) {
    return new ReturnsRepository(this.dataSource, manager);
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
