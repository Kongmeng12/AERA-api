import { QueryFailedError } from 'typeorm';
import { ConflictError, NotFoundError, ValidationError } from '../../../core/exceptions/app-error';
import { ERROR_CODES } from '../../../shared/constants/error-codes';
import { formatDecimal4, parseDecimal4 } from '../../../shared/helpers/decimal';
import { toPaginatedResult } from '../../../shared/helpers/pagination';
import type { PaginatedResult } from '../../../shared/response/api-response';
import type { InventoryService } from '../../inventory/services/inventory.service';
import type { SalesInvoiceLine } from '../../sales/entities/invoice-payment.entity';
import {
  toSalesReturnResponse,
  type ApproveSalesReturnDto,
  type CreateSalesReturnDto,
  type ListReturnsQueryDto,
  type RejectSalesReturnDto,
  type SalesReturnResponseDto,
} from '../dto/returns.dto';
import type { ReturnsRepository } from '../repositories/returns.repository';

const ZERO = '0.0000';
const MAX_DECIMAL4 = 10n ** 19n - 1n;

function isDuplicateKeyError(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
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

function proRataAmount(line: SalesInvoiceLine, quantity: string): bigint {
  const invoicedQuantity = parseDecimal4(line.quantity);
  if (invoicedQuantity <= 0n) {
    throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, 'Invoice line quantity is invalid');
  }
  const lineTotal = parseDecimal4(line.lineTotal);
  const returnedQuantity = parseDecimal4(quantity);
  return (lineTotal * returnedQuantity + invoicedQuantity / 2n) / invoicedQuantity;
}

export class ReturnsService {
  constructor(
    private readonly repository: ReturnsRepository,
    private readonly inventory: InventoryService,
  ) {}

  async list(query: ListReturnsQueryDto): Promise<PaginatedResult<SalesReturnResponseDto>> {
    const [returns, total] = await this.repository.findReturns(query);
    const lines = await this.repository.findReturnsLines(
      returns.map((salesReturn) => salesReturn.id),
    );
    const byReturn = new Map<number, typeof lines>();
    for (const line of lines) {
      const current = byReturn.get(line.salesReturnId) ?? [];
      current.push(line);
      byReturn.set(line.salesReturnId, current);
    }
    return toPaginatedResult(
      returns.map((salesReturn) =>
        toSalesReturnResponse(salesReturn, byReturn.get(salesReturn.id) ?? []),
      ),
      total,
      query.page,
      query.limit,
    );
  }

  async get(id: number): Promise<SalesReturnResponseDto> {
    const salesReturn = await this.repository.findSalesReturn(id);
    if (!salesReturn) {
      throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Sales return not found');
    }
    return toSalesReturnResponse(salesReturn, await this.repository.findReturnsLines([id]));
  }

  async create(dto: CreateSalesReturnDto, requestedById: number): Promise<SalesReturnResponseDto> {
    return this.repository.transaction(async (repository) => {
      const invoice = await repository.findSalesInvoiceForUpdate(dto.salesInvoiceId);
      if (!invoice) {
        throw fieldError('salesInvoiceId', 'Sales invoice does not exist');
      }
      if (!['issued', 'partially_paid', 'paid'].includes(invoice.status)) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only active sales invoices can be returned',
        );
      }

      const preparedLines = [];
      for (const [index, input] of dto.lines.entries()) {
        const invoiceLine = await repository.findSalesInvoiceLineForUpdate(
          input.salesInvoiceLineId,
          invoice.id,
        );
        if (!invoiceLine) {
          throw fieldError(`lines.${index}.salesInvoiceLineId`, 'Invoice line does not exist');
        }
        const alreadyRequested = parseDecimal4(
          (await repository.sumReturnQuantities(invoiceLine.id))?.quantity ?? ZERO,
        );
        const quantity = parseDecimal4(input.quantity);
        if (alreadyRequested + quantity > parseDecimal4(invoiceLine.quantity)) {
          throw fieldError(
            `lines.${index}.quantity`,
            'Return quantity exceeds the invoice quantity not already requested',
          );
        }
        const lineCreditAmount = proRataAmount(invoiceLine, input.quantity);
        preparedLines.push({
          salesInvoiceLineId: invoiceLine.id,
          itemId: invoiceLine.itemId,
          batchId: input.batchId,
          unitId: invoiceLine.unitId,
          quantity: formatDecimal4(quantity),
          disposition: 'available',
          unitPriceSnapshot: invoiceLine.unitPrice,
          lineCreditAmount: formatDecimal4(lineCreditAmount),
          reason: input.reason ?? null,
        });
      }

      const salesReturn = await this.saveUnique(
        () =>
          repository.createSalesReturn({
            returnNumber: dto.returnNumber,
            salesInvoiceId: invoice.id,
            customerId: invoice.customerId,
            requestedById,
            requestedAt: new Date(),
            status: 'draft',
            reason: dto.reason,
            creditNoteId: null,
          }),
        'Sales return number already exists',
      );
      const lines = await repository.createSalesReturnLines(
        preparedLines.map((line, index) => ({
          ...line,
          salesReturnId: salesReturn.id,
          lineNumber: index + 1,
        })),
      );
      return toSalesReturnResponse(salesReturn, lines);
    });
  }

  async approve(
    id: number,
    dto: ApproveSalesReturnDto,
    approvedById: number,
  ): Promise<SalesReturnResponseDto> {
    return this.repository.transaction(async (repository, manager) => {
      const salesReturn = await repository.findSalesReturnForUpdate(id);
      if (!salesReturn) {
        throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Sales return not found');
      }
      if (salesReturn.status !== 'draft') {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only draft returns can be approved',
        );
      }
      const invoice = await repository.findSalesInvoiceForUpdate(salesReturn.salesInvoiceId);
      if (!invoice || invoice.status === 'cancelled') {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Sales invoice is unavailable for return approval',
        );
      }
      const lines = await repository.findReturnsLines([salesReturn.id]);
      let creditAmount = 0n;
      const invoiceLines = new Map<number, SalesInvoiceLine>();
      for (const line of lines) {
        if (line.batchId === null) {
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            'Return line is missing its original stock batch',
          );
        }
        const invoiceLine = await repository.findSalesInvoiceLineForUpdate(
          line.salesInvoiceLineId,
          invoice.id,
        );
        if (!invoiceLine) {
          throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, 'Invoice line no longer exists');
        }
        const alreadyApproved = parseDecimal4(
          (await repository.sumApprovedReturnQuantities(invoiceLine.id))?.quantity ?? ZERO,
        );
        if (alreadyApproved + parseDecimal4(line.quantity) > parseDecimal4(invoiceLine.quantity)) {
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            'Approved returns exceed the invoiced quantity',
          );
        }
        line.batchId = await this.inventory.receiveSalesReturn(manager, {
          returnId: salesReturn.id,
          returnLineNumber: line.lineNumber,
          salesOrderLineId: invoiceLine.salesOrderLineId,
          itemId: line.itemId,
          batchId: line.batchId,
          unitId: line.unitId,
          quantity: line.quantity,
          actorId: approvedById,
        });
        await repository.saveSalesReturnLine(line);
        creditAmount += parseDecimal4(line.lineCreditAmount);
        invoiceLines.set(invoiceLine.id, invoiceLine);
      }
      if (creditAmount <= 0n || creditAmount > MAX_DECIMAL4) {
        throw fieldError('lines', 'Credit note amount is invalid or exceeds the supported amount');
      }

      const creditNote = await this.saveUnique(
        () =>
          repository.createCreditNote({
            creditNoteNumber: dto.creditNoteNumber,
            salesInvoiceId: invoice.id,
            customerId: invoice.customerId,
            issuedAt: new Date(),
            status: 'issued',
            amount: formatDecimal4(creditAmount),
            reason: salesReturn.reason,
          }),
        'Credit note number already exists',
      );
      await repository.createCreditNoteLines(
        lines.map((line, index) => {
          const invoiceLine = invoiceLines.get(line.salesInvoiceLineId);
          if (!invoiceLine) {
            throw new ConflictError(
              ERROR_CODES.RESOURCE_CONFLICT,
              'Invoice line could not resolve',
            );
          }
          return {
            creditNoteId: creditNote.id,
            salesReturnLineId: line.id,
            lineNumber: index + 1,
            itemId: line.itemId,
            unitId: line.unitId,
            quantity: line.quantity,
            unitPrice: line.unitPriceSnapshot,
            lineTotal: line.lineCreditAmount,
          };
        }),
      );
      await repository.updateSalesReturn(salesReturn.id, {
        status: 'approved',
        creditNoteId: creditNote.id,
        reason: salesReturn.reason,
      });

      const [paidResult, creditResult] = await Promise.all([
        repository.sumPostedPayments(invoice.id),
        repository.sumIssuedCreditNotes(invoice.id),
      ]);
      const paid = parseDecimal4(paidResult?.amount ?? ZERO);
      const credits = parseDecimal4(creditResult?.amount ?? ZERO);
      const total = parseDecimal4(invoice.total);
      if (paid + credits >= total) {
        await repository.updateSalesInvoiceStatus(invoice.id, 'paid');
      } else if (paid > 0n) {
        await repository.updateSalesInvoiceStatus(invoice.id, 'partially_paid');
      }
      const updatedReturn = await repository.findSalesReturn(salesReturn.id);
      if (!updatedReturn) {
        throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Sales return not found');
      }
      return toSalesReturnResponse(
        updatedReturn,
        await repository.findReturnsLines([salesReturn.id]),
      );
    });
  }

  async reject(id: number, dto: RejectSalesReturnDto): Promise<SalesReturnResponseDto> {
    return this.repository.transaction(async (repository) => {
      const salesReturn = await repository.findSalesReturnForUpdate(id);
      if (!salesReturn) {
        throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Sales return not found');
      }
      if (salesReturn.status !== 'draft') {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only draft returns can be rejected',
        );
      }
      const reason = `${salesReturn.reason}\nRejection: ${dto.reason}`;
      await repository.updateSalesReturn(salesReturn.id, {
        status: 'rejected',
        creditNoteId: null,
        reason,
      });
      const updatedReturn = await repository.findSalesReturn(salesReturn.id);
      if (!updatedReturn) {
        throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Sales return not found');
      }
      return toSalesReturnResponse(
        updatedReturn,
        await repository.findReturnsLines([salesReturn.id]),
      );
    });
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
