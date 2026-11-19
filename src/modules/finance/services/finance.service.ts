import { QueryFailedError } from 'typeorm';
import { ConflictError, NotFoundError, ValidationError } from '../../../core/exceptions/app-error';
import { ERROR_CODES } from '../../../shared/constants/error-codes';
import {
  addDecimal4,
  formatDecimal4,
  multiplyDecimal4,
  parseDecimal4,
} from '../../../shared/helpers/decimal';
import { toPaginatedResult } from '../../../shared/helpers/pagination';
import type { PaginatedResult } from '../../../shared/response/api-response';
import {
  toSupplierBillResponse,
  toSupplierPaymentResponse,
  type CreateSupplierBillDto,
  type CreateSupplierPaymentDto,
  type ListSupplierBillsQueryDto,
  type SupplierBillResponseDto,
  type SupplierPaymentResponseDto,
} from '../dto/finance.dto';
import type {
  SupplierBill,
  SupplierBillLine,
  SupplierBillReceiptMatch,
} from '../entities/accounts-payable.entity';
import type {
  GoodsReceiptLine,
  PurchaseOrderLine,
} from '../../purchasing/entities/purchase.entity';
import type { FinanceRepository } from '../repositories/finance.repository';

const ZERO = '0.0000';
const MAX_DECIMAL4 = 10n ** 19n - 1n;

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

function fieldError(field: string, message: string): ValidationError {
  return new ValidationError(ERROR_CODES.VALIDATION_ERROR, 'Validation failed', [
    { field, message },
  ]);
}

function sumDecimals(values: string[]): string {
  return values.reduce((total, value) => addDecimal4(total, value), ZERO);
}

function balance(total: string, allocated: string): string {
  const remaining = parseDecimal4(total) - parseDecimal4(allocated);
  return formatDecimal4(remaining > 0n ? remaining : 0n);
}

export class FinanceService {
  constructor(private readonly repository: FinanceRepository) {}

  async listSupplierBills(
    query: ListSupplierBillsQueryDto,
  ): Promise<PaginatedResult<SupplierBillResponseDto>> {
    const [bills, total] = await this.repository.findSupplierBills(query);
    const [lines, allocations] = await Promise.all([
      this.repository.findSupplierBillLines(bills.map((bill) => bill.id)),
      this.repository.findSupplierBillAllocations(bills.map((bill) => bill.id)),
    ]);
    const matches = await this.repository.findReceiptMatches(lines.map((line) => line.id));
    const linesByBill = new Map<number, SupplierBillLine[]>();
    for (const line of lines) {
      const current = linesByBill.get(line.supplierBillId) ?? [];
      current.push(line);
      linesByBill.set(line.supplierBillId, current);
    }
    const matchesByBillLine = new Map<number, SupplierBillReceiptMatch[]>();
    for (const match of matches) {
      const current = matchesByBillLine.get(match.supplierBillLineId) ?? [];
      current.push(match);
      matchesByBillLine.set(match.supplierBillLineId, current);
    }
    const paidByBill = new Map<number, string>();
    for (const allocation of allocations) {
      paidByBill.set(
        allocation.supplierBillId,
        addDecimal4(paidByBill.get(allocation.supplierBillId) ?? ZERO, allocation.amount),
      );
    }
    return toPaginatedResult(
      bills.map((bill) =>
        toSupplierBillResponse(
          bill,
          linesByBill.get(bill.id) ?? [],
          (linesByBill.get(bill.id) ?? []).flatMap((line) => matchesByBillLine.get(line.id) ?? []),
          balance(bill.total, paidByBill.get(bill.id) ?? ZERO),
        ),
      ),
      total,
      query.page,
      query.limit,
    );
  }

  async getSupplierBill(id: number): Promise<SupplierBillResponseDto> {
    const bill = await this.repository.findSupplierBill(id);
    if (!bill) {
      throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Supplier bill not found');
    }
    const lines = await this.repository.findSupplierBillLines([id]);
    const [matches, allocations] = await Promise.all([
      this.repository.findReceiptMatches(lines.map((line) => line.id)),
      this.repository.findAllocationTotals([id]),
    ]);
    const allocated = allocations[0]?.total ?? ZERO;
    return toSupplierBillResponse(bill, lines, matches, balance(bill.total, allocated));
  }

  async createSupplierBill(
    dto: CreateSupplierBillDto,
    recordedById: number,
  ): Promise<SupplierBillResponseDto> {
    const supplier = await this.repository.findSupplier(dto.supplierId);
    if (!supplier) throw fieldError('supplierId', 'Supplier does not exist or is inactive');
    if (!(await this.repository.findCurrency(dto.currencyId))) {
      throw fieldError('currencyId', 'Currency does not exist');
    }

    const quantitiesByLine = dto.lines.map((line, index) => {
      const matched = sumDecimals(line.receiptMatches.map((match) => match.matchedQuantity));
      if (parseDecimal4(matched) !== parseDecimal4(line.quantity)) {
        throw fieldError(
          `lines.${index}.receiptMatches`,
          'Receipt matches must equal the bill line quantity',
        );
      }
      const lineTotal = multiplyDecimal4(line.quantity, line.unitPrice);
      if (parseDecimal4(lineTotal) > MAX_DECIMAL4) {
        throw fieldError(`lines.${index}.unitPrice`, 'Line total exceeds the supported amount');
      }
      return { lineTotal, quantity: formatDecimal4(parseDecimal4(line.quantity)) };
    });
    const subtotal = sumDecimals(quantitiesByLine.map((line) => line.lineTotal));
    const taxTotal = formatDecimal4(parseDecimal4(dto.taxTotal));
    const total = addDecimal4(subtotal, taxTotal);
    if (parseDecimal4(subtotal) > MAX_DECIMAL4 || parseDecimal4(total) > MAX_DECIMAL4) {
      throw fieldError('lines', 'Supplier bill total exceeds the supported amount');
    }
    if (parseDecimal4(total) <= 0n) {
      throw fieldError('lines', 'Supplier bill total must be greater than zero');
    }

    const created = await this.saveUnique(
      () =>
        this.repository.transaction(async (repository) => {
          const order = await repository.findPurchaseOrderForUpdate(dto.purchaseOrderId);
          if (!order) throw fieldError('purchaseOrderId', 'Purchase order does not exist');
          if (order.supplierId !== supplier.id || order.currencyId !== dto.currencyId) {
            throw fieldError(
              'purchaseOrderId',
              'Purchase order supplier and currency must match the supplier bill',
            );
          }
          if (!['ordered', 'partially_received', 'received'].includes(order.status)) {
            throw new ConflictError(
              ERROR_CODES.RESOURCE_CONFLICT,
              'Bills can only be matched to an issued purchase order',
            );
          }

          const orderLineIds = [...new Set(dto.lines.map((line) => line.purchaseOrderLineId))].sort(
            (a, b) => a - b,
          );
          const orderLines = await repository.findPurchaseOrderLinesForUpdate(
            order.id,
            orderLineIds,
          );
          if (orderLines.length !== orderLineIds.length) {
            throw fieldError(
              'lines',
              'One or more purchase order lines do not belong to this order',
            );
          }
          const orderLineById = new Map(orderLines.map((line) => [line.id, line]));
          for (const [index, input] of dto.lines.entries()) {
            const orderLine = orderLineById.get(input.purchaseOrderLineId);
            if (
              !orderLine ||
              orderLine.itemId !== input.itemId ||
              orderLine.unitId !== input.unitId
            ) {
              throw fieldError(
                `lines.${index}`,
                'Bill line item and unit must match its purchase order line',
              );
            }
          }

          const receiptLineIds = [
            ...new Set(
              dto.lines.flatMap((line) => line.receiptMatches.map((m) => m.goodsReceiptLineId)),
            ),
          ].sort((a, b) => a - b);
          const receiptLines = await repository.findReceiptLinesForUpdate(receiptLineIds);
          if (receiptLines.length !== receiptLineIds.length) {
            throw fieldError('lines.receiptMatches', 'One or more receipt lines do not exist');
          }
          this.validateReceiptLines(
            dto,
            order,
            orderLineById,
            receiptLines,
            await repository.findReceiptLineMatches(receiptLineIds),
            await repository.findPurchaseOrderLineMatchTotals(orderLineIds),
          );

          const bill = await repository.createSupplierBill({
            billNumber: dto.billNumber,
            supplierInvoiceNumber: dto.supplierInvoiceNumber,
            supplierId: supplier.id,
            purchaseOrderId: order.id,
            currencyId: dto.currencyId,
            invoiceDate: dto.invoiceDate,
            dueAt: dto.dueAt ?? null,
            status: 'draft',
            subtotal,
            taxTotal,
            total,
            recordedById,
          });
          const lines = await repository.createSupplierBillLines(
            dto.lines.map((line, index) => ({
              supplierBillId: bill.id,
              lineNumber: index + 1,
              purchaseOrderLineId: line.purchaseOrderLineId,
              itemId: line.itemId,
              unitId: line.unitId,
              quantity: quantitiesByLine[index].quantity,
              unitPrice: formatDecimal4(parseDecimal4(line.unitPrice)),
              lineTotal: quantitiesByLine[index].lineTotal,
            })),
          );
          const receiptMatches: Array<Partial<SupplierBillReceiptMatch>> = [];
          for (const [index, line] of dto.lines.entries()) {
            for (const match of line.receiptMatches) {
              receiptMatches.push({
                supplierBillLineId: lines[index].id,
                goodsReceiptLineId: match.goodsReceiptLineId,
                matchedQuantity: formatDecimal4(parseDecimal4(match.matchedQuantity)),
                matchedUnitPrice: lines[index].unitPrice,
              });
            }
          }
          const savedMatches = await repository.createReceiptMatches(receiptMatches);
          return { bill, lines, matches: savedMatches };
        }),
      'Supplier bill number or supplier invoice number already exists',
    );
    return toSupplierBillResponse(created.bill, created.lines, created.matches, created.bill.total);
  }

  async postSupplierBill(id: number): Promise<SupplierBillResponseDto> {
    await this.repository.transaction(async (repository) => {
      const bill = await repository.findSupplierBillForUpdate(id);
      if (!bill) {
        throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Supplier bill not found');
      }
      if (bill.status !== 'draft') {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only draft supplier bills can be posted',
        );
      }
      if (bill.purchaseOrderId === null) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Supplier bill has no purchase order',
        );
      }
      const lines = await repository.findSupplierBillLines([bill.id]);
      const matches = await repository.findReceiptMatches(lines.map((line) => line.id));
      const order = await repository.findPurchaseOrderForUpdate(bill.purchaseOrderId);
      if (
        !order ||
        order.supplierId !== bill.supplierId ||
        order.currencyId !== bill.currencyId ||
        !['ordered', 'partially_received', 'received'].includes(order.status)
      ) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Supplier bill purchase order is invalid',
        );
      }
      const orderLineIds = [
        ...new Set(
          lines
            .map((line) => line.purchaseOrderLineId)
            .filter((value): value is number => value !== null),
        ),
      ].sort((a, b) => a - b);
      const orderLines = await repository.findPurchaseOrderLinesForUpdate(order.id, orderLineIds);
      const orderLineById = new Map(orderLines.map((line) => [line.id, line]));
      const receiptLineIds = [...new Set(matches.map((match) => match.goodsReceiptLineId))].sort(
        (a, b) => a - b,
      );
      const receiptLines = await repository.findReceiptLinesForUpdate(receiptLineIds);
      const receiptLineById = new Map(receiptLines.map((line) => [line.id, line]));
      const receiptMatchTotals = new Map(
        (await repository.findReceiptLineMatches(receiptLineIds)).map((row) => [
          Number(row.goodsReceiptLineId),
          parseDecimal4(row.total),
        ]),
      );
      const orderLineMatchTotals = new Map(
        (await repository.findPurchaseOrderLineMatchTotals(orderLineIds)).map((row) => [
          Number(row.purchaseOrderLineId),
          parseDecimal4(row.total),
        ]),
      );
      const matchedByBillLine = new Map<number, bigint>();
      const addedByReceipt = new Map<number, bigint>();
      const addedByOrderLine = new Map<number, bigint>();

      for (const line of lines) {
        if (line.purchaseOrderLineId === null) {
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            'Every bill line must match a PO line',
          );
        }
        const orderLine = orderLineById.get(line.purchaseOrderLineId);
        if (!orderLine || orderLine.itemId !== line.itemId || orderLine.unitId !== line.unitId) {
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            'Bill line does not match its PO line',
          );
        }
      }
      for (const match of matches) {
        const line = lines.find((candidate) => candidate.id === match.supplierBillLineId);
        const receiptLine = receiptLineById.get(match.goodsReceiptLineId);
        if (!line || !receiptLine || line.purchaseOrderLineId === null) {
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            'Supplier bill receipt match is invalid',
          );
        }
        this.assertReceiptMatch(bill, order, line, receiptLine);
        const quantity = parseDecimal4(match.matchedQuantity);
        matchedByBillLine.set(line.id, (matchedByBillLine.get(line.id) ?? 0n) + quantity);
        addedByReceipt.set(
          match.goodsReceiptLineId,
          (addedByReceipt.get(match.goodsReceiptLineId) ?? 0n) + quantity,
        );
        addedByOrderLine.set(
          line.purchaseOrderLineId,
          (addedByOrderLine.get(line.purchaseOrderLineId) ?? 0n) + quantity,
        );
      }
      for (const line of lines) {
        if ((matchedByBillLine.get(line.id) ?? 0n) !== parseDecimal4(line.quantity)) {
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            'Every bill line must be fully matched to accepted receipt quantities before posting',
          );
        }
      }
      for (const [receiptLineId, added] of addedByReceipt) {
        const receiptLine = receiptLineById.get(receiptLineId)!;
        const existing = (receiptMatchTotals.get(receiptLineId) ?? 0n) - added;
        if (existing + added > parseDecimal4(receiptLine.receivedQuantity)) {
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            'Cumulative bill matches exceed the accepted receipt quantity',
          );
        }
      }
      for (const [orderLineId, added] of addedByOrderLine) {
        const orderLine = orderLineById.get(orderLineId)!;
        const existing = (orderLineMatchTotals.get(orderLineId) ?? 0n) - added;
        if (existing + added > parseDecimal4(orderLine.quantity)) {
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            'Cumulative bill matches exceed the purchase order quantity',
          );
        }
      }
      await repository.updateSupplierBillStatus(bill.id, 'posted');
    });
    return this.getSupplierBill(id);
  }

  async createSupplierPayment(
    dto: CreateSupplierPaymentDto,
    paidById: number,
  ): Promise<SupplierPaymentResponseDto> {
    if (!(await this.repository.findSupplier(dto.supplierId))) {
      throw fieldError('supplierId', 'Supplier does not exist or is inactive');
    }
    if (!(await this.repository.findCurrency(dto.currencyId))) {
      throw fieldError('currencyId', 'Currency does not exist');
    }
    const allocationTotal = sumDecimals(dto.allocations.map((allocation) => allocation.amount));
    if (parseDecimal4(allocationTotal) !== parseDecimal4(dto.amount)) {
      throw fieldError('allocations', 'Allocations must equal the payment amount');
    }
    const amount = formatDecimal4(parseDecimal4(dto.amount));

    const created = await this.saveUnique(
      () =>
        this.repository.transaction(async (repository) => {
          const billIds = dto.allocations
            .map((allocation) => allocation.supplierBillId)
            .sort((a, b) => a - b);
          const bills = await repository.findBillsForUpdate(billIds);
          if (bills.length !== billIds.length) {
            throw fieldError('allocations', 'One or more supplier bills do not exist');
          }
          const billsById = new Map(bills.map((bill) => [bill.id, bill]));
          const totals = new Map(
            (await repository.findAllocationTotals(billIds)).map((row) => [
              Number(row.supplierBillId),
              parseDecimal4(row.total),
            ]),
          );
          const balances = new Map<number, string>();
          for (const allocation of dto.allocations) {
            const bill = billsById.get(allocation.supplierBillId)!;
            if (bill.supplierId !== dto.supplierId || bill.currencyId !== dto.currencyId) {
              throw fieldError(
                'allocations',
                'Allocated bills must belong to the payment supplier and currency',
              );
            }
            if (!['posted', 'partially_paid'].includes(bill.status)) {
              throw new ConflictError(
                ERROR_CODES.RESOURCE_CONFLICT,
                'Payments can only be allocated to posted, unpaid supplier bills',
              );
            }
            const allocated = totals.get(bill.id) ?? 0n;
            const requested = parseDecimal4(allocation.amount);
            const outstanding = parseDecimal4(bill.total) - allocated;
            if (requested > outstanding) {
              throw new ConflictError(
                ERROR_CODES.RESOURCE_CONFLICT,
                `Allocation exceeds the outstanding balance for supplier bill ${bill.billNumber}`,
              );
            }
            const nextBalance = outstanding - requested;
            balances.set(bill.id, formatDecimal4(nextBalance));
          }

          const payment = await repository.createSupplierPayment({
            paymentNumber: dto.paymentNumber,
            supplierId: dto.supplierId,
            currencyId: dto.currencyId,
            amount,
            paymentMethod: dto.paymentMethod,
            referenceNumber: dto.referenceNumber ?? null,
            paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
            paidById,
            status: 'posted',
          });
          const allocations = await repository.createPaymentAllocations(
            dto.allocations.map((allocation) => ({
              supplierPaymentId: payment.id,
              supplierBillId: allocation.supplierBillId,
              amount: formatDecimal4(parseDecimal4(allocation.amount)),
            })),
          );
          for (const allocation of dto.allocations) {
            const remaining = balances.get(allocation.supplierBillId)!;
            await repository.updateSupplierBillStatus(
              allocation.supplierBillId,
              parseDecimal4(remaining) === 0n ? 'paid' : 'partially_paid',
            );
          }
          return { payment, allocations, balances };
        }),
      'Supplier payment number already exists',
    );
    return toSupplierPaymentResponse(created.payment, created.allocations, created.balances);
  }

  private validateReceiptLines(
    dto: CreateSupplierBillDto,
    order: { id: number; supplierId: number },
    orderLineById: Map<number, PurchaseOrderLine>,
    receiptLines: GoodsReceiptLine[],
    existingReceiptTotals: Array<{ goodsReceiptLineId: number; total: string }>,
    existingOrderLineTotals: Array<{ purchaseOrderLineId: number; total: string }>,
  ): void {
    const receiptById = new Map(receiptLines.map((line) => [line.id, line]));
    const receiptTotals = new Map(
      existingReceiptTotals.map((row) => [
        Number(row.goodsReceiptLineId),
        parseDecimal4(row.total),
      ]),
    );
    const orderTotals = new Map(
      existingOrderLineTotals.map((row) => [
        Number(row.purchaseOrderLineId),
        parseDecimal4(row.total),
      ]),
    );
    const requestedByReceipt = new Map<number, bigint>();
    const requestedByOrderLine = new Map<number, bigint>();

    for (const [index, input] of dto.lines.entries()) {
      for (const match of input.receiptMatches) {
        const receiptLine = receiptById.get(match.goodsReceiptLineId);
        const orderLine = orderLineById.get(input.purchaseOrderLineId);
        if (!receiptLine || !orderLine) {
          throw fieldError(
            `lines.${index}.receiptMatches`,
            'Receipt or purchase order line is invalid',
          );
        }
        if (
          receiptLine.goodsReceipt?.status !== 'posted' ||
          receiptLine.goodsReceipt?.supplierId !== order.supplierId ||
          receiptLine.goodsReceipt?.purchaseOrderId !== order.id ||
          receiptLine.purchaseOrderLineId !== orderLine.id ||
          receiptLine.itemId !== input.itemId ||
          receiptLine.unitId !== input.unitId ||
          receiptLine.receivedQuantity === ZERO ||
          parseDecimal4(receiptLine.receivedQuantity) <= 0n
        ) {
          throw fieldError(
            `lines.${index}.receiptMatches`,
            'Receipt line must be accepted and match the bill supplier, PO line, item and unit',
          );
        }
        const quantity = parseDecimal4(match.matchedQuantity);
        requestedByReceipt.set(
          receiptLine.id,
          (requestedByReceipt.get(receiptLine.id) ?? 0n) + quantity,
        );
        requestedByOrderLine.set(
          orderLine.id,
          (requestedByOrderLine.get(orderLine.id) ?? 0n) + quantity,
        );
      }
    }

    for (const [receiptLineId, requested] of requestedByReceipt) {
      const receiptLine = receiptById.get(receiptLineId)!;
      if (
        (receiptTotals.get(receiptLineId) ?? 0n) + requested >
        parseDecimal4(receiptLine.receivedQuantity)
      ) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Cumulative bill matches exceed the accepted receipt quantity',
        );
      }
    }
    for (const [orderLineId, requested] of requestedByOrderLine) {
      const orderLine = orderLineById.get(orderLineId)!;
      if ((orderTotals.get(orderLineId) ?? 0n) + requested > parseDecimal4(orderLine.quantity)) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Cumulative bill matches exceed the purchase order quantity',
        );
      }
    }
  }

  private assertReceiptMatch(
    bill: SupplierBill,
    order: { id: number; supplierId: number },
    line: SupplierBillLine,
    receiptLine: GoodsReceiptLine,
  ): void {
    if (
      line.purchaseOrderLineId === null ||
      receiptLine.goodsReceipt?.status !== 'posted' ||
      receiptLine.goodsReceipt?.supplierId !== order.supplierId ||
      receiptLine.goodsReceipt?.purchaseOrderId !== order.id ||
      receiptLine.purchaseOrderLineId !== line.purchaseOrderLineId ||
      receiptLine.itemId !== line.itemId ||
      receiptLine.unitId !== line.unitId ||
      bill.supplierId !== order.supplierId ||
      parseDecimal4(receiptLine.receivedQuantity) <= 0n
    ) {
      throw new ConflictError(
        ERROR_CODES.RESOURCE_CONFLICT,
        'Supplier bill receipt match must use accepted quantities for the same supplier, PO, item and unit',
      );
    }
  }

  private async saveUnique<T>(operation: () => Promise<T>, duplicateMessage: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, duplicateMessage);
      }
      throw error;
    }
  }
}
