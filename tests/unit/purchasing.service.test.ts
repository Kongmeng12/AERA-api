import { ERROR_CODES } from '../../src/shared/constants/error-codes';
import type { CreateGoodsReceiptDto } from '../../src/modules/purchasing/dto/purchasing.dto';
import type { PurchasingRepository } from '../../src/modules/purchasing/repositories/purchasing.repository';
import { PurchasingService } from '../../src/modules/purchasing/services/purchasing.service';

function setup() {
  const orderLine = {
    id: 21,
    purchaseOrderId: 7,
    lineNumber: 1,
    itemId: 4,
    unitId: 3,
    itemNameSnapshot: 'Mineral',
    unitCodeSnapshot: 'KG',
    quantity: '10.0000',
    receivedQuantity: '0.0000',
    unitPrice: '5.0000',
  };
  const receipt = {
    id: 12,
    receiptNumber: 'GR-12',
    purchaseOrderId: 7,
    supplierId: 2,
    warehouseId: 8,
    receivedById: 9,
    receivedAt: new Date('2026-01-15T08:30:00.000Z'),
    status: 'posted',
    notes: null,
    createdAt: new Date('2026-01-15T08:30:00.000Z'),
    updatedAt: new Date('2026-01-15T08:30:00.000Z'),
  };
  const receiptLines: Array<Record<string, unknown>> = [];
  const repository: Record<string, jest.Mock> = {
    transaction: jest.fn((operation: (repo: unknown) => Promise<unknown>) => operation(repository)),
    findPurchaseOrderForUpdate: jest.fn().mockResolvedValue({
      id: 7,
      status: 'ordered',
    }),
    findSupplier: jest.fn().mockResolvedValue({ id: 2 }),
    findWarehouse: jest.fn().mockResolvedValue({ id: 8 }),
    findPurchaseOrderLinesForUpdate: jest.fn().mockResolvedValue([orderLine]),
    createGoodsReceipt: jest.fn().mockResolvedValue(receipt),
    findWarehouseZone: jest.fn().mockResolvedValue({ id: 5, warehouseId: 8 }),
    batchForUpdate: jest.fn().mockResolvedValue(null),
    createStockBatch: jest.fn().mockResolvedValue({ id: 15 }),
    addInventoryToQcHold: jest.fn().mockResolvedValue(undefined),
    createStockMovement: jest.fn().mockResolvedValue(undefined),
    updatePurchaseOrderLineReceived: jest.fn((_id: number, quantity: string) => {
      orderLine.receivedQuantity = quantity;
      return Promise.resolve();
    }),
    createGoodsReceiptLines: jest.fn((lines: Array<Record<string, unknown>>) => {
      receiptLines.push(...lines.map((line, index) => ({ ...line, id: index + 1 })));
      return Promise.resolve();
    }),
    findPurchaseOrderLines: jest.fn().mockImplementation(() => Promise.resolve([orderLine])),
    updatePurchaseOrderStatus: jest.fn().mockResolvedValue(undefined),
    findGoodsReceiptLines: jest.fn().mockImplementation(() => Promise.resolve(receiptLines)),
  };
  const service = new PurchasingService(repository as unknown as PurchasingRepository);
  return { service, repository };
}

describe('PurchasingService goods receipts', () => {
  it('posts accepted quantities into QC hold, excluding rejected stock', async () => {
    const { service, repository } = setup();
    const dto: CreateGoodsReceiptDto = {
      receiptNumber: 'GR-12',
      purchaseOrderId: 7,
      warehouseId: 8,
      lines: [
        {
          purchaseOrderLineId: 21,
          receivedQuantity: '2.0000',
          rejectedQuantity: '1.0000',
          batchNumber: 'BATCH-1',
          warehouseZoneId: 5,
        },
      ],
    };

    const result = await service.createGoodsReceipt(dto, 9);

    expect(repository.addInventoryToQcHold).toHaveBeenCalledWith({
      itemId: 4,
      batchId: 15,
      unitId: 3,
      warehouseId: 8,
      zoneId: 5,
      quantity: '2.0000',
    });
    expect(repository.createStockMovement).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: '2.0000', movementType: 'receipt' }),
    );
    expect(repository.updatePurchaseOrderLineReceived).toHaveBeenCalledWith(21, '2.0000');
    expect(result.lines[0]).toMatchObject({
      receivedQuantity: '2.0000',
      rejectedQuantity: '1.0000',
      stockBatchId: 15,
    });
  });

  it('rejects a receipt that exceeds the unreceived order quantity without posting stock', async () => {
    const { service, repository } = setup();
    const dto: CreateGoodsReceiptDto = {
      receiptNumber: 'GR-13',
      purchaseOrderId: 7,
      warehouseId: 8,
      lines: [
        {
          purchaseOrderLineId: 21,
          receivedQuantity: '10.0000',
          rejectedQuantity: '1.0000',
          batchNumber: 'BATCH-1',
          warehouseZoneId: 5,
        },
      ],
    };

    await expect(service.createGoodsReceipt(dto, 9)).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_ERROR,
      errors: [{ field: 'lines.0.receivedQuantity' }],
    });
    expect(repository.addInventoryToQcHold).not.toHaveBeenCalled();
    expect(repository.createStockMovement).not.toHaveBeenCalled();
  });
});
