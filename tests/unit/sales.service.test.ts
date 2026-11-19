import type { EntityManager } from 'typeorm';
import type { InventoryService } from '../../src/modules/inventory/services/inventory.service';
import type { SalesRepository } from '../../src/modules/sales/repositories/sales.repository';
import { SalesService } from '../../src/modules/sales/services/sales.service';

const now = new Date('2026-11-19T03:00:00.000Z');

function setup(overrides: Record<string, jest.Mock> = {}) {
  const order = {
    id: 12,
    orderNumber: 'SO-1',
    customerId: 2,
    customerAddressId: null,
    deliveryAddressSnapshot: null,
    salesEmployeeId: null,
    createdById: 11,
    orderedAt: now,
    requestedDeliveryAt: null,
    currencyId: 5,
    exchangeRateSnapshot: '1.00000000',
    createdAt: now,
    updatedAt: now,
    status: 'pending_approval',
    subtotal: '10.0000',
    discountTotal: '0.0000',
    taxTotal: '0.0000',
    total: '10.0000',
    notes: null,
  };
  const orderLine = {
    id: 25,
    salesOrderId: 12,
    lineNumber: 1,
    itemId: 3,
    unitId: 4,
    itemSkuSnapshot: 'SKU-3',
    itemNameSnapshot: 'Mineral',
    unitCodeSnapshot: 'KG',
    quantity: '2.5000',
    conversionToBaseSnapshot: '1.000000',
    priceId: 8,
    promotionId: null,
    unitPrice: '4.0000',
    discountType: null,
    discountValue: '0.0000',
    discountAmount: '0.0000',
    taxRate: '0.0000',
    lineTotal: '10.0000',
    createdAt: now,
    updatedAt: now,
  };
  const manager = {} as unknown as EntityManager;
  const repository: Record<string, jest.Mock> = {
    transaction: jest.fn((operation: (repo: unknown, manager: unknown) => Promise<unknown>) =>
      operation(repository, manager),
    ),
    findCustomer: jest.fn().mockResolvedValue({
      id: 2,
      customerTypeId: 1,
      salesEmployeeId: null,
    }),
    findCurrency: jest.fn().mockResolvedValue({ id: 5 }),
    findBaseCurrency: jest.fn().mockResolvedValue({ id: 5 }),
    findItem: jest.fn().mockResolvedValue({
      id: 3,
      baseUnitId: 4,
      sku: 'SKU-3',
      name: 'Mineral',
    }),
    findUnit: jest.fn().mockResolvedValue({ id: 4, code: 'KG' }),
    findSalesPrice: jest.fn().mockResolvedValue({ id: 8, unitPrice: '4.0000' }),
    createSalesOrder: jest.fn((data: Record<string, unknown>) =>
      Promise.resolve({ ...data, id: 12, createdAt: now, updatedAt: now }),
    ),
    createSalesOrderLines: jest.fn((lines: Array<Record<string, unknown>>) =>
      Promise.resolve(lines.map((line) => ({ ...line, id: 25, createdAt: now, updatedAt: now }))),
    ),
    findSalesOrderForUpdate: jest.fn().mockResolvedValue(order),
    findSalesOrderLinesForUpdate: jest.fn().mockResolvedValue([orderLine]),
    updateSalesOrderStatus: jest.fn((_id: number, status: string) => {
      order.status = status;
      return Promise.resolve();
    }),
    findSalesOrder: jest.fn().mockImplementation(() => Promise.resolve(order)),
    ...overrides,
  };
  const inventory = {
    reserveSalesOrder: jest.fn().mockResolvedValue(undefined),
  };
  return {
    service: new SalesService(
      repository as unknown as SalesRepository,
      inventory as unknown as InventoryService,
    ),
    repository,
    inventory,
  };
}

describe('SalesService', () => {
  it('creates a pending order priced from the selected customer catalog price', async () => {
    const { service, repository } = setup();
    const result = await service.createSalesOrder(
      {
        orderNumber: 'SO-1',
        customerId: 2,
        currencyId: 5,
        lines: [{ itemId: 3, unitId: 4, quantity: '2.5000' }],
      },
      11,
    );

    expect(repository.findSalesPrice).toHaveBeenCalledWith(3, 4, 5, 2, 1, expect.any(Date));
    expect(repository.createSalesOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending_approval',
        subtotal: '10.0000',
        total: '10.0000',
      }),
    );
    expect(result.lines[0]).toMatchObject({
      priceId: 8,
      unitPrice: '4.0000',
      lineTotal: '10.0000',
    });
  });

  it('reserves full QC-passed stock before approving the order', async () => {
    const { service, inventory, repository } = setup();

    const result = await service.approveSalesOrder(12);

    expect(inventory.reserveSalesOrder).toHaveBeenCalledWith(expect.anything(), [
      { id: 25, itemId: 3, unitId: 4, quantity: '2.5000' },
    ]);
    expect(repository.updateSalesOrderStatus).toHaveBeenCalledWith(12, 'approved');
    expect(result.status).toBe('approved');
  });
});
