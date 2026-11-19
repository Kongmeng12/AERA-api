import { QueryFailedError, type EntityManager } from 'typeorm';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../core/exceptions/app-error';
import { ERROR_CODES } from '../../../shared/constants/error-codes';
import {
  addDecimal4,
  formatDecimal4,
  multiplyDecimal4,
  parseDecimal4,
} from '../../../shared/helpers/decimal';
import { toPaginatedResult } from '../../../shared/helpers/pagination';
import type { PaginatedResult } from '../../../shared/response/api-response';
import type { InventoryService } from '../../inventory/services/inventory.service';
import type { SalesInvoiceLine } from '../entities/invoice-payment.entity';
import {
  toPaymentReceiptResponse,
  toSalesInvoiceResponse,
  toSalesOrderResponse,
  toSalesPriceResponse,
  type CreatePaymentReceiptDto,
  type CreateSalesOrderDto,
  type CreateSalesPriceDto,
  type ListSalesInvoicesQueryDto,
  type ListSalesOrdersQueryDto,
  type ListSalesPricesQueryDto,
  type PaymentReceiptResponseDto,
  type SalesInvoiceResponseDto,
  type SalesOrderResponseDto,
  type SalesPriceResponseDto,
} from '../dto/sales.dto';
import type { SalesRepository } from '../repositories/sales.repository';

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

export class SalesService {
  constructor(
    private readonly repository: SalesRepository,
    private readonly inventory: InventoryService,
  ) {}

  async listSalesOrders(
    query: ListSalesOrdersQueryDto,
  ): Promise<PaginatedResult<SalesOrderResponseDto>> {
    const [orders, total] = await this.repository.findSalesOrders(query);
    const lines = await this.repository.findSalesOrderLines(orders.map((order) => order.id));
    const byOrder = new Map<number, typeof lines>();
    for (const line of lines) {
      const current = byOrder.get(line.salesOrderId) ?? [];
      current.push(line);
      byOrder.set(line.salesOrderId, current);
    }
    return toPaginatedResult(
      orders.map((order) => toSalesOrderResponse(order, byOrder.get(order.id) ?? [])),
      total,
      query.page,
      query.limit,
    );
  }

  async getSalesOrder(id: number): Promise<SalesOrderResponseDto> {
    const order = await this.repository.findSalesOrder(id);
    if (!order) {
      throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Sales order not found');
    }
    return toSalesOrderResponse(order, await this.repository.findSalesOrderLines([id]));
  }

  async createSalesOrder(
    dto: CreateSalesOrderDto,
    createdById: number,
  ): Promise<SalesOrderResponseDto> {
    const customer = await this.repository.findCustomer(dto.customerId);
    if (!customer) {
      throw fieldError('customerId', 'Customer does not exist or is inactive');
    }
    const currency = await this.repository.findCurrency(dto.currencyId);
    if (!currency) {
      throw fieldError('currencyId', 'Currency does not exist');
    }
    const baseCurrency = await this.repository.findBaseCurrency();
    if (!baseCurrency) {
      throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, 'Base currency is not configured');
    }
    const orderedAt = new Date();
    const exchangeRate =
      currency.id === baseCurrency.id
        ? '1.00000000'
        : (await this.repository.findExchangeRate(baseCurrency.id, currency.id, orderedAt))?.rate;
    if (!exchangeRate) {
      throw fieldError('currencyId', 'No active exchange rate exists for this currency');
    }

    let deliveryAddressSnapshot: string | null = null;
    if (dto.customerAddressId !== undefined && dto.customerAddressId !== null) {
      const address = await this.repository.findCustomerAddress(customer.id, dto.customerAddressId);
      if (!address) {
        throw fieldError('customerAddressId', 'Address does not belong to this customer');
      }
      deliveryAddressSnapshot = [
        address.addressLine1,
        address.addressLine2,
        address.village,
        address.district,
        address.province,
        address.countryCode,
      ]
        .filter((part): part is string => Boolean(part))
        .join(', ');
    }

    const preparedLines: Array<{
      itemId: number;
      unitId: number;
      itemSkuSnapshot: string;
      itemNameSnapshot: string;
      unitCodeSnapshot: string;
      quantity: string;
      conversionToBaseSnapshot: string;
      priceId: number;
      promotionId: null;
      unitPrice: string;
      discountType: null;
      discountValue: string;
      discountAmount: string;
      taxRate: string;
      lineTotal: string;
    }> = [];
    let subtotal = ZERO;

    for (const [index, input] of dto.lines.entries()) {
      const item = await this.repository.findItem(input.itemId);
      if (!item) {
        throw fieldError(`lines.${index}.itemId`, 'Item does not exist or is inactive');
      }
      const unit = await this.repository.findUnit(input.unitId);
      if (!unit) {
        throw fieldError(`lines.${index}.unitId`, 'Unit does not exist');
      }
      const conversion =
        item.baseUnitId === unit.id
          ? '1.000000'
          : (await this.repository.findItemUnitConversion(item.id, unit.id))?.factorToBase;
      if (!conversion) {
        throw fieldError(`lines.${index}.unitId`, 'Item has no conversion for this unit');
      }
      const price = await this.repository.findSalesPrice(
        item.id,
        unit.id,
        currency.id,
        customer.id,
        customer.customerTypeId,
        orderedAt,
      );
      if (!price) {
        throw fieldError(
          `lines.${index}`,
          'No effective price is configured for this item, unit, customer and currency',
        );
      }
      const quantity = formatDecimal4(parseDecimal4(input.quantity));
      const unitPrice = formatDecimal4(parseDecimal4(price.unitPrice));
      const lineTotal = multiplyDecimal4(quantity, unitPrice);
      if (parseDecimal4(lineTotal) > MAX_DECIMAL4) {
        throw fieldError(`lines.${index}.quantity`, 'Line total exceeds the supported amount');
      }
      subtotal = addDecimal4(subtotal, lineTotal);
      if (parseDecimal4(subtotal) > MAX_DECIMAL4) {
        throw fieldError('lines', 'Sales order total exceeds the supported amount');
      }
      preparedLines.push({
        itemId: item.id,
        unitId: unit.id,
        itemSkuSnapshot: item.sku,
        itemNameSnapshot: item.name,
        unitCodeSnapshot: unit.code,
        quantity,
        conversionToBaseSnapshot: conversion,
        priceId: price.id,
        promotionId: null,
        unitPrice,
        discountType: null,
        discountValue: ZERO,
        discountAmount: ZERO,
        taxRate: ZERO,
        lineTotal,
      });
    }

    const result = await this.repository.transaction(async (repository) => {
      const order = await this.saveUnique(
        () =>
          repository.createSalesOrder({
            orderNumber: dto.orderNumber,
            customerId: customer.id,
            customerAddressId: dto.customerAddressId ?? null,
            deliveryAddressSnapshot,
            salesEmployeeId: customer.salesEmployeeId,
            createdById,
            orderedAt,
            requestedDeliveryAt: dto.requestedDeliveryAt ? new Date(dto.requestedDeliveryAt) : null,
            currencyId: currency.id,
            exchangeRateSnapshot: exchangeRate,
            status: 'pending_approval',
            subtotal,
            discountTotal: ZERO,
            taxTotal: ZERO,
            total: subtotal,
            cancelReason: null,
            cancelledById: null,
            cancelledAt: null,
            notes: dto.notes ?? null,
          }),
        'Sales order number already exists',
      );
      const lines = await repository.createSalesOrderLines(
        preparedLines.map((line, index) => ({
          ...line,
          salesOrderId: order.id,
          lineNumber: index + 1,
        })),
      );
      return { order, lines };
    });
    return toSalesOrderResponse(result.order, result.lines);
  }

  async approveSalesOrder(id: number): Promise<SalesOrderResponseDto> {
    return this.repository.transaction(async (repository, manager) => {
      const order = await repository.findSalesOrderForUpdate(id);
      if (!order) {
        throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Sales order not found');
      }
      if (order.status !== 'pending_approval') {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only pending sales orders can be approved',
        );
      }
      const lines = await repository.findSalesOrderLinesForUpdate(order.id);
      await this.inventory.reserveSalesOrder(
        manager,
        lines.map((line) => ({
          id: line.id,
          itemId: line.itemId,
          unitId: line.unitId,
          quantity: line.quantity,
        })),
      );
      await repository.updateSalesOrderStatus(order.id, 'approved');
      const updated = await repository.findSalesOrder(order.id);
      if (!updated) {
        throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Sales order not found');
      }
      return toSalesOrderResponse(updated, lines);
    });
  }

  async cancelSalesOrder(
    id: number,
    userId: number,
    reason: string,
    canCancelAny: boolean,
  ): Promise<void> {
    await this.repository.transaction(async (repository) => {
      const order = await repository.findSalesOrderForUpdate(id);
      if (!order) {
        throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Sales order not found');
      }
      if (order.status !== 'pending_approval') {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only sales orders awaiting approval can be cancelled',
        );
      }
      if (!canCancelAny && order.createdById !== userId) {
        throw new ForbiddenError(
          ERROR_CODES.AUTH_FORBIDDEN,
          'Sales users can only cancel their own pending orders',
        );
      }
      await repository.cancelSalesOrder(order.id, userId, reason, new Date());
    });
  }

  async listSalesPrices(query: ListSalesPricesQueryDto) {
    const [rows, total] = await this.repository.findSalesPrices(query);
    return toPaginatedResult(rows.map(toSalesPriceResponse), total, query.page, query.limit);
  }

  async createSalesPrice(dto: CreateSalesPriceDto): Promise<SalesPriceResponseDto> {
    const item = await this.repository.findItem(dto.itemId);
    if (!item) {
      throw fieldError('itemId', 'Item does not exist or is inactive');
    }
    if (!(await this.repository.findUnit(dto.unitId))) {
      throw fieldError('unitId', 'Unit does not exist');
    }
    if (
      item.baseUnitId !== dto.unitId &&
      !(await this.repository.findItemUnitConversion(item.id, dto.unitId))
    ) {
      throw fieldError('unitId', 'Item has no conversion for this unit');
    }
    if (!(await this.repository.findCurrency(dto.currencyId))) {
      throw fieldError('currencyId', 'Currency does not exist');
    }
    if (dto.customerId && !(await this.repository.findCustomer(dto.customerId))) {
      throw fieldError('customerId', 'Customer does not exist or is inactive');
    }
    if (dto.customerTypeId && !(await this.repository.findCustomerType(dto.customerTypeId))) {
      throw fieldError('customerTypeId', 'Customer type does not exist');
    }
    const price = await this.repository.createSalesPrice({
      itemId: item.id,
      unitId: dto.unitId,
      customerTypeId: dto.customerTypeId ?? null,
      customerId: dto.customerId ?? null,
      currencyId: dto.currencyId,
      unitPrice: formatDecimal4(parseDecimal4(dto.unitPrice)),
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
    });
    return toSalesPriceResponse(price);
  }

  async listSalesInvoices(
    query: ListSalesInvoicesQueryDto,
  ): Promise<PaginatedResult<SalesInvoiceResponseDto>> {
    const [invoices, total] = await this.repository.findSalesInvoices(query);
    const lines = await this.repository.findSalesInvoiceLines(
      invoices.map((invoice) => invoice.id),
    );
    const byInvoice = new Map<number, SalesInvoiceLine[]>();
    for (const line of lines) {
      const current = byInvoice.get(line.salesInvoiceId) ?? [];
      current.push(line);
      byInvoice.set(line.salesInvoiceId, current);
    }
    return toPaginatedResult(
      invoices.map((invoice) => toSalesInvoiceResponse(invoice, byInvoice.get(invoice.id) ?? [])),
      total,
      query.page,
      query.limit,
    );
  }

  async getSalesInvoice(id: number): Promise<SalesInvoiceResponseDto> {
    const invoice = await this.repository.findSalesInvoice(id);
    if (!invoice) {
      throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Sales invoice not found');
    }
    return toSalesInvoiceResponse(invoice, await this.repository.findSalesInvoiceLines([id]));
  }

  async createPaymentReceipt(
    dto: CreatePaymentReceiptDto,
    receivedById: number,
  ): Promise<PaymentReceiptResponseDto> {
    return this.repository.transaction(async (repository) => {
      const customer = await repository.findCustomer(dto.customerId);
      if (!customer) {
        throw fieldError('customerId', 'Customer does not exist or is inactive');
      }
      const currency = await repository.findCurrency(dto.currencyId);
      if (!currency) {
        throw fieldError('currencyId', 'Currency does not exist');
      }
      const baseCurrency = await repository.findBaseCurrency();
      if (!baseCurrency) {
        throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, 'Base currency is not configured');
      }
      const receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : new Date();
      const exchangeRate =
        currency.id === baseCurrency.id
          ? '1.00000000'
          : (await repository.findExchangeRate(baseCurrency.id, currency.id, receivedAt))?.rate;
      if (!exchangeRate) {
        throw fieldError('currencyId', 'No active exchange rate exists for this currency');
      }
      const allocationIds = dto.allocations.map((allocation) => allocation.salesInvoiceId);
      if (new Set(allocationIds).size !== allocationIds.length) {
        throw fieldError('allocations', 'An invoice may appear only once in a receipt');
      }
      const allocated = dto.allocations.reduce(
        (sum, allocation) => sum + parseDecimal4(allocation.amount),
        0n,
      );
      if (allocated !== parseDecimal4(dto.receivedAmount)) {
        throw fieldError('allocations', 'Allocated amounts must equal the received amount');
      }

      const invoices = [];
      for (const invoiceId of [...allocationIds].sort((a, b) => a - b)) {
        const invoice = await repository.findSalesInvoiceForUpdate(invoiceId);
        if (!invoice) {
          throw fieldError('allocations', `Invoice ${invoiceId} does not exist`);
        }
        if (
          invoice.customerId !== customer.id ||
          invoice.currencyId !== dto.currencyId ||
          (invoice.status !== 'issued' && invoice.status !== 'partially_paid')
        ) {
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            `Invoice ${invoiceId} cannot receive this payment`,
          );
        }
        invoices.push(invoice);
      }
      const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
      for (const allocation of dto.allocations) {
        const invoice = invoiceById.get(allocation.salesInvoiceId);
        if (!invoice) {
          throw fieldError('allocations', 'Invoice could not be resolved');
        }
        const alreadyPaid = parseDecimal4(
          (await repository.sumAllocatedPayments(invoice.id))?.amount ?? ZERO,
        );
        const credited = parseDecimal4(
          (await repository.sumIssuedCreditNotes(invoice.id))?.amount ?? ZERO,
        );
        const outstanding = parseDecimal4(invoice.total) - alreadyPaid - credited;
        if (parseDecimal4(allocation.amount) > outstanding) {
          throw fieldError(
            'allocations',
            `Allocation exceeds the outstanding amount for invoice ${invoice.id}`,
          );
        }
      }

      const receipt = await this.saveUnique(
        () =>
          repository.createPaymentReceipt({
            receiptNumber: dto.receiptNumber,
            customerId: customer.id,
            currencyId: dto.currencyId,
            receivedAmount: formatDecimal4(parseDecimal4(dto.receivedAmount)),
            exchangeRateSnapshot: exchangeRate,
            paymentMethod: dto.paymentMethod,
            referenceNumber: dto.referenceNumber ?? null,
            receivedAt,
            receivedById,
            status: 'posted',
            voidReason: null,
          }),
        'Payment receipt number already exists',
      );
      await repository.createPaymentAllocations(
        dto.allocations.map((allocation) => ({
          paymentReceiptId: receipt.id,
          salesInvoiceId: allocation.salesInvoiceId,
          amount: formatDecimal4(parseDecimal4(allocation.amount)),
        })),
      );
      for (const invoice of invoices) {
        const [paidResult, creditResult] = await Promise.all([
          repository.sumAllocatedPayments(invoice.id),
          repository.sumIssuedCreditNotes(invoice.id),
        ]);
        const paid = parseDecimal4(paidResult?.amount ?? ZERO);
        const credited = parseDecimal4(creditResult?.amount ?? ZERO);
        await repository.updateSalesInvoiceStatus(
          invoice.id,
          paid + credited >= parseDecimal4(invoice.total) ? 'paid' : 'partially_paid',
        );
      }
      const allocations = await repository.findPaymentAllocations(receipt.id);
      return toPaymentReceiptResponse(receipt, allocations);
    });
  }

  async createInvoiceForDelivery(
    manager: EntityManager,
    input: {
      orderId: number;
      invoiceNumber: string;
      deliveredLines: Array<{ salesOrderLineId: number; quantity: string }>;
    },
  ): Promise<SalesInvoiceResponseDto> {
    const repository = this.repository.withManager(manager);
    const order = await repository.findSalesOrderForUpdate(input.orderId);
    if (!order || (order.status !== 'approved' && order.status !== 'partially_fulfilled')) {
      throw new ConflictError(
        ERROR_CODES.RESOURCE_CONFLICT,
        'Only approved orders can be invoiced for delivery',
      );
    }
    const orderLines = await repository.findSalesOrderLinesForUpdate(order.id);
    const orderLinesById = new Map(orderLines.map((line) => [line.id, line]));
    const issuedAt = new Date();
    const prepared: Array<{
      salesOrderLineId: number;
      itemId: number;
      unitId: number;
      itemNameSnapshot: string;
      itemSkuSnapshot: string;
      unitCodeSnapshot: string;
      quantity: string;
      unitPrice: string;
      discountAmount: string;
      taxRate: string;
      lineTotal: string;
    }> = [];
    let subtotal = ZERO;
    for (const [index, delivered] of input.deliveredLines.entries()) {
      const orderLine = orderLinesById.get(delivered.salesOrderLineId);
      if (!orderLine || parseDecimal4(delivered.quantity) <= 0n) {
        throw fieldError(`lines.${index}`, 'Delivered order line or quantity is invalid');
      }
      const previous = parseDecimal4(
        (await repository.findPreviouslyInvoicedQuantity(orderLine.id))?.quantity ?? ZERO,
      );
      if (previous + parseDecimal4(delivered.quantity) > parseDecimal4(orderLine.quantity)) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          `Delivered quantity exceeds the uninvoiced quantity for order line ${orderLine.id}`,
        );
      }
      const quantity = formatDecimal4(parseDecimal4(delivered.quantity));
      const lineTotal = multiplyDecimal4(quantity, orderLine.unitPrice);
      subtotal = addDecimal4(subtotal, lineTotal);
      prepared.push({
        salesOrderLineId: orderLine.id,
        itemId: orderLine.itemId,
        unitId: orderLine.unitId,
        itemNameSnapshot: orderLine.itemNameSnapshot,
        itemSkuSnapshot: orderLine.itemSkuSnapshot,
        unitCodeSnapshot: orderLine.unitCodeSnapshot,
        quantity,
        unitPrice: orderLine.unitPrice,
        discountAmount: ZERO,
        taxRate: orderLine.taxRate,
        lineTotal,
      });
    }
    if (prepared.length === 0) {
      throw fieldError('lines', 'At least one delivered item is required to issue an invoice');
    }
    const customer = await repository.findCustomer(order.customerId);
    if (!customer) {
      throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Sales order customer not found');
    }
    const invoice = await this.saveUnique(
      () =>
        repository.createSalesInvoice({
          invoiceNumber: input.invoiceNumber,
          salesOrderId: order.id,
          customerId: order.customerId,
          currencyId: order.currencyId,
          exchangeRateSnapshot: order.exchangeRateSnapshot,
          issuedAt,
          dueAt: new Date(issuedAt.getTime() + customer.creditTermDays * 86_400_000),
          status: 'issued',
          subtotal,
          discountTotal: ZERO,
          taxTotal: ZERO,
          total: subtotal,
          cancelledById: null,
          cancelledAt: null,
          cancelReason: null,
        }),
      'Sales invoice number already exists',
    );
    const invoiceLines = await repository.createSalesInvoiceLines(
      prepared.map((line, index) => ({
        ...line,
        salesInvoiceId: invoice.id,
        lineNumber: index + 1,
      })),
    );
    const invoicedQuantities = await Promise.all(
      orderLines.map(async (line) => ({
        quantity: parseDecimal4(
          (await repository.findPreviouslyInvoicedQuantity(line.id))?.quantity ?? ZERO,
        ),
        ordered: parseDecimal4(line.quantity),
      })),
    );
    await repository.updateSalesOrderStatus(
      order.id,
      invoicedQuantities.every((line) => line.quantity >= line.ordered)
        ? 'fulfilled'
        : 'partially_fulfilled',
    );
    return toSalesInvoiceResponse(invoice, invoiceLines);
  }

  async lockOrderForDelivery(manager: EntityManager, orderId: number) {
    const repository = this.repository.withManager(manager);
    const order = await repository.findSalesOrderForUpdate(orderId);
    if (!order) {
      throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Sales order not found');
    }
    if (order.status !== 'approved' && order.status !== 'partially_fulfilled') {
      throw new ConflictError(
        ERROR_CODES.RESOURCE_CONFLICT,
        'Only approved or partially fulfilled sales orders can be delivered',
      );
    }
    const lines = await repository.findSalesOrderLinesForUpdate(order.id);
    return { order, lines };
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
