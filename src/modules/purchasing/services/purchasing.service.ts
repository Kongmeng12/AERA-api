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
  toGoodsReceiptResponse,
  toPurchaseOrderResponse,
  type CreateGoodsReceiptDto,
  type CreatePurchaseOrderDto,
  type GoodsReceiptResponseDto,
  type ListGoodsReceiptsQueryDto,
  type ListPurchaseOrdersQueryDto,
  type PurchaseOrderResponseDto,
} from '../dto/purchasing.dto';
import type { GoodsReceiptLine, PurchaseOrderLine } from '../entities/purchase.entity';
import type { PurchasingRepository } from '../repositories/purchasing.repository';

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

export class PurchasingService {
  constructor(private readonly repository: PurchasingRepository) {}

  async listPurchaseOrders(
    query: ListPurchaseOrdersQueryDto,
  ): Promise<PaginatedResult<PurchaseOrderResponseDto>> {
    const [orders, total] = await this.repository.findPurchaseOrders(query);
    const lines = await this.repository.findPurchaseOrderLines(orders.map((order) => order.id));
    const linesByOrder = new Map<number, PurchaseOrderLine[]>();
    for (const line of lines) {
      const current = linesByOrder.get(line.purchaseOrderId) ?? [];
      current.push(line);
      linesByOrder.set(line.purchaseOrderId, current);
    }
    return toPaginatedResult(
      orders.map((order) => toPurchaseOrderResponse(order, linesByOrder.get(order.id) ?? [])),
      total,
      query.page,
      query.limit,
    );
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrderResponseDto> {
    const order = await this.repository.findPurchaseOrder(id);
    if (!order) {
      throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Purchase order not found');
    }
    const lines = await this.repository.findPurchaseOrderLines([id]);
    return toPurchaseOrderResponse(order, lines);
  }

  async createPurchaseOrder(
    dto: CreatePurchaseOrderDto,
    orderedById: number,
  ): Promise<PurchaseOrderResponseDto> {
    const supplier = await this.repository.findSupplier(dto.supplierId);
    if (!supplier) {
      throw fieldError('supplierId', 'Supplier does not exist or is inactive');
    }
    if (!(await this.repository.findCurrency(dto.currencyId))) {
      throw fieldError('currencyId', 'Currency does not exist');
    }
    if (dto.requisitionId !== undefined && dto.requisitionId !== null) {
      const requisition = await this.repository.findPurchaseRequisition(dto.requisitionId);
      if (!requisition) {
        throw fieldError('requisitionId', 'Purchase requisition does not exist');
      }
      if (requisition.status !== 'approved') {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only approved purchase requisitions can be ordered',
        );
      }
    }

    const itemIds = [...new Set(dto.lines.map((line) => line.itemId))];
    const unitIds = [...new Set(dto.lines.map((line) => line.unitId))];
    const [items, units, conversions] = await Promise.all([
      this.repository.findItems(itemIds),
      this.repository.findUnits(unitIds),
      this.repository.findItemUnitConversions(itemIds),
    ]);
    const itemsById = new Map(items.map((item) => [item.id, item]));
    const unitsById = new Map(units.map((unit) => [unit.id, unit]));
    const conversionsByPair = new Map(
      conversions.map((conversion) => [`${conversion.itemId}:${conversion.unitId}`, conversion]),
    );
    const preparedLines: Array<{
      itemId: number;
      unitId: number;
      itemSkuSnapshot: string;
      itemNameSnapshot: string;
      unitCodeSnapshot: string;
      conversionToBaseSnapshot: string;
      quantity: string;
      unitPrice: string;
      receivedQuantity: string;
      lineTotal: string;
    }> = [];
    let subtotal = ZERO;

    for (const [index, input] of dto.lines.entries()) {
      const item = itemsById.get(input.itemId);
      if (!item) {
        throw fieldError(`lines.${index}.itemId`, 'Item does not exist or is inactive');
      }
      const unit = unitsById.get(input.unitId);
      if (!unit) {
        throw fieldError(`lines.${index}.unitId`, 'Unit does not exist');
      }
      const conversion =
        item.baseUnitId === input.unitId
          ? '1.000000'
          : conversionsByPair.get(`${item.id}:${input.unitId}`)?.factorToBase;
      if (!conversion) {
        throw fieldError(`lines.${index}.unitId`, 'Item has no conversion for this unit');
      }
      const quantity = formatDecimal4(parseDecimal4(input.quantity));
      const unitPrice = formatDecimal4(parseDecimal4(input.unitPrice));
      const lineTotal = multiplyDecimal4(quantity, unitPrice);
      if (parseDecimal4(lineTotal) > MAX_DECIMAL4) {
        throw fieldError(`lines.${index}.unitPrice`, 'Line total exceeds the supported amount');
      }
      subtotal = addDecimal4(subtotal, lineTotal);
      if (parseDecimal4(subtotal) > MAX_DECIMAL4) {
        throw fieldError('lines', 'Purchase order total exceeds the supported amount');
      }
      preparedLines.push({
        itemId: item.id,
        unitId: unit.id,
        itemSkuSnapshot: item.sku,
        itemNameSnapshot: item.name,
        unitCodeSnapshot: unit.code,
        conversionToBaseSnapshot: conversion,
        quantity,
        unitPrice,
        receivedQuantity: ZERO,
        lineTotal,
      });
    }

    const result = await this.repository.transaction(async (repository) => {
      const order = await this.saveUnique(
        () =>
          repository.createPurchaseOrder({
            purchaseOrderNumber: dto.purchaseOrderNumber,
            requisitionId: dto.requisitionId ?? null,
            supplierId: supplier.id,
            currencyId: dto.currencyId,
            orderedById,
            orderedAt: new Date(),
            expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
            deliveryAddressSnapshot: dto.deliveryAddressSnapshot ?? null,
            status: 'draft',
            subtotal,
            discountTotal: ZERO,
            taxTotal: ZERO,
            total: subtotal,
            notes: dto.notes ?? null,
          }),
        'Purchase order number already exists',
      );
      const lines = await repository.createPurchaseOrderLines(
        preparedLines.map((line, index) => ({
          ...line,
          purchaseOrderId: order.id,
          lineNumber: index + 1,
        })),
      );
      return { order, lines };
    });
    return toPurchaseOrderResponse(result.order, result.lines);
  }

  async issuePurchaseOrder(id: number): Promise<PurchaseOrderResponseDto> {
    return this.repository.transaction(async (repository) => {
      const order = await repository.findPurchaseOrderForUpdate(id);
      if (!order) {
        throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Purchase order not found');
      }
      if (order.status !== 'draft') {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only draft purchase orders can be issued',
        );
      }
      await repository.updatePurchaseOrderStatus(order.id, 'ordered');
      const updated = await repository.findPurchaseOrder(order.id);
      if (!updated) {
        throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Purchase order not found');
      }
      const lines = await repository.findPurchaseOrderLines([order.id]);
      return toPurchaseOrderResponse(updated, lines);
    });
  }

  async listGoodsReceipts(
    query: ListGoodsReceiptsQueryDto,
  ): Promise<PaginatedResult<GoodsReceiptResponseDto>> {
    const [receipts, total] = await this.repository.findGoodsReceipts(query);
    const lines = await this.repository.findGoodsReceiptLines(
      receipts.map((receipt) => receipt.id),
    );
    const linesByReceipt = new Map<number, GoodsReceiptLine[]>();
    for (const line of lines) {
      const current = linesByReceipt.get(line.goodsReceiptId) ?? [];
      current.push(line);
      linesByReceipt.set(line.goodsReceiptId, current);
    }
    return toPaginatedResult(
      receipts.map((receipt) =>
        toGoodsReceiptResponse(receipt, linesByReceipt.get(receipt.id) ?? []),
      ),
      total,
      query.page,
      query.limit,
    );
  }

  async getGoodsReceipt(id: number): Promise<GoodsReceiptResponseDto> {
    const receipt = await this.repository.findGoodsReceipt(id);
    if (!receipt) {
      throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Goods receipt not found');
    }
    const lines = await this.repository.findGoodsReceiptLines([id]);
    return toGoodsReceiptResponse(receipt, lines);
  }

  async createGoodsReceipt(
    dto: CreateGoodsReceiptDto,
    receivedById: number,
  ): Promise<GoodsReceiptResponseDto> {
    return this.repository.transaction(async (repository) => {
      const order = await repository.findPurchaseOrderForUpdate(dto.purchaseOrderId);
      if (!order) {
        throw fieldError('purchaseOrderId', 'Purchase order does not exist');
      }
      if (order.status !== 'ordered' && order.status !== 'partially_received') {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Goods can only be received against an issued purchase order',
        );
      }
      const warehouse = await repository.findWarehouse(dto.warehouseId);
      if (!warehouse) {
        throw fieldError('warehouseId', 'Warehouse does not exist or is inactive');
      }

      const lineIds = dto.lines.map((line) => line.purchaseOrderLineId);
      if (new Set(lineIds).size !== lineIds.length) {
        throw fieldError('lines', 'A purchase order line may appear only once per receipt');
      }
      const purchaseLines = await repository.findPurchaseOrderLinesForUpdate(order.id, lineIds);
      if (purchaseLines.length !== lineIds.length) {
        throw fieldError('lines', 'One or more purchase order lines do not belong to this order');
      }
      const purchaseLinesById = new Map(purchaseLines.map((line) => [line.id, line]));
      const receipt = await this.saveUnique(
        () =>
          repository.createGoodsReceipt({
            receiptNumber: dto.receiptNumber,
            purchaseOrderId: order.id,
            supplierId: order.supplierId,
            warehouseId: warehouse.id,
            receivedById,
            receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
            status: 'posted',
            notes: dto.notes ?? null,
          }),
        'Goods receipt number already exists',
      );
      const receiptLines: Array<Partial<GoodsReceiptLine>> = [];
      const updatedReceived = new Map<number, string>();

      for (const [index, input] of dto.lines.entries()) {
        const orderLine = purchaseLinesById.get(input.purchaseOrderLineId);
        if (!orderLine) {
          throw fieldError(`lines.${index}.purchaseOrderLineId`, 'Purchase order line not found');
        }
        const receivedQuantity = formatDecimal4(parseDecimal4(input.receivedQuantity));
        const rejectedQuantity = formatDecimal4(parseDecimal4(input.rejectedQuantity));
        const remaining =
          parseDecimal4(orderLine.quantity) - parseDecimal4(orderLine.receivedQuantity);
        if (parseDecimal4(receivedQuantity) + parseDecimal4(rejectedQuantity) > remaining) {
          throw fieldError(
            `lines.${index}.receivedQuantity`,
            'Accepted and rejected quantities exceed the unreceived order quantity',
          );
        }

        const batchNumber = input.batchNumber ?? null;
        const manufacturedAt = input.manufacturedAt ?? null;
        const expiresAt = input.expiresAt ?? null;
        let batchId: number | null = null;
        let zoneId: number | null = input.warehouseZoneId ?? null;
        if (parseDecimal4(receivedQuantity) > 0n) {
          if (zoneId === null || batchNumber === null) {
            throw fieldError(
              `lines.${index}`,
              'Accepted stock requires a batch number and warehouse zone',
            );
          }
          const zone = await repository.findWarehouseZone(zoneId);
          if (!zone || zone.warehouseId !== warehouse.id) {
            throw fieldError(
              `lines.${index}.warehouseZoneId`,
              'Warehouse zone must be active and belong to the selected warehouse',
            );
          }
          const existingBatch = await repository.batchForUpdate(orderLine.itemId, batchNumber);
          if (!existingBatch) {
            const batch = await this.saveUnique(
              () =>
                repository.createStockBatch({
                  itemId: orderLine.itemId,
                  batchNumber,
                  manufacturedAt,
                  expiresAt,
                  qcStatus: 'pending',
                  sourceType: 'goods_receipt',
                  sourceId: String(receipt.id),
                  status: 'active',
                }),
              'Stock batch already exists',
            );
            batchId = batch.id;
          } else {
            if (existingBatch.qcStatus !== 'pending' || existingBatch.status !== 'active') {
              throw new ConflictError(
                ERROR_CODES.RESOURCE_CONFLICT,
                `Batch ${batchNumber} has already completed QC or is inactive; use a new batch number`,
              );
            }
            if (
              (existingBatch.manufacturedAt &&
                manufacturedAt &&
                existingBatch.manufacturedAt !== manufacturedAt) ||
              (existingBatch.expiresAt && expiresAt && existingBatch.expiresAt !== expiresAt)
            ) {
              throw new ConflictError(
                ERROR_CODES.RESOURCE_CONFLICT,
                `Batch ${batchNumber} dates do not match the existing batch`,
              );
            }
            const mergedManufacturedAt = existingBatch.manufacturedAt ?? manufacturedAt;
            const mergedExpiresAt = existingBatch.expiresAt ?? expiresAt;
            if (
              mergedManufacturedAt !== existingBatch.manufacturedAt ||
              mergedExpiresAt !== existingBatch.expiresAt
            ) {
              await repository.updateStockBatch(existingBatch.id, {
                manufacturedAt: mergedManufacturedAt,
                expiresAt: mergedExpiresAt,
              });
            }
            batchId = existingBatch.id;
          }

          await repository.addInventoryToQcHold({
            itemId: orderLine.itemId,
            batchId,
            unitId: orderLine.unitId,
            warehouseId: warehouse.id,
            zoneId: zone.id,
            quantity: receivedQuantity,
          });
          await repository.createStockMovement({
            movementNumber: `GR-${receipt.id}-${index + 1}`,
            movementType: 'receipt',
            itemId: orderLine.itemId,
            batchId,
            unitId: orderLine.unitId,
            quantity: receivedQuantity,
            fromWarehouseId: null,
            fromZoneId: null,
            toWarehouseId: warehouse.id,
            toZoneId: zone.id,
            sourceType: 'goods_receipt',
            sourceId: String(receipt.id),
            actorId: receivedById,
            reason: null,
          });
        } else {
          zoneId = null;
        }

        const nextReceived = addDecimal4(orderLine.receivedQuantity, receivedQuantity);
        updatedReceived.set(orderLine.id, nextReceived);
        await repository.updatePurchaseOrderLineReceived(orderLine.id, nextReceived);
        receiptLines.push({
          goodsReceiptId: receipt.id,
          purchaseOrderLineId: orderLine.id,
          lineNumber: index + 1,
          stockBatchId: batchId,
          warehouseZoneId: zoneId,
          itemId: orderLine.itemId,
          unitId: orderLine.unitId,
          itemNameSnapshot: orderLine.itemNameSnapshot,
          unitCodeSnapshot: orderLine.unitCodeSnapshot,
          orderedQuantity: orderLine.quantity,
          receivedQuantity,
          rejectedQuantity,
          unitCost: orderLine.unitPrice,
          batchNumber,
          manufacturedAt,
          expiresAt,
        });
      }

      await repository.createGoodsReceiptLines(receiptLines);
      const allLines = await repository.findPurchaseOrderLines([order.id]);
      const fullyReceived = allLines.every((line) => {
        const received = updatedReceived.get(line.id) ?? line.receivedQuantity;
        return parseDecimal4(received) >= parseDecimal4(line.quantity);
      });
      const hasAcceptedQuantity = allLines.some((line) => {
        const received = updatedReceived.get(line.id) ?? line.receivedQuantity;
        return parseDecimal4(received) > 0n;
      });
      const nextStatus = fullyReceived
        ? 'received'
        : hasAcceptedQuantity
          ? 'partially_received'
          : 'ordered';
      await repository.updatePurchaseOrderStatus(order.id, nextStatus);
      const lines = await repository.findGoodsReceiptLines([receipt.id]);
      return toGoodsReceiptResponse(receipt, lines);
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
