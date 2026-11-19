import { ERROR_CODES } from '../../src/shared/constants/error-codes';
import type {
  CreateSupplierBillDto,
  CreateSupplierPaymentDto,
} from '../../src/modules/finance/dto/finance.dto';
import type { FinanceRepository } from '../../src/modules/finance/repositories/finance.repository';
import { FinanceService } from '../../src/modules/finance/services/finance.service';

const now = new Date('2026-11-19T03:00:00.000Z');

function setup(overrides: Record<string, jest.Mock> = {}) {
  const bill = {
    id: 31,
    billNumber: 'AP-31',
    supplierInvoiceNumber: 'INV-31',
    supplierId: 2,
    purchaseOrderId: 7,
    currencyId: 5,
    invoiceDate: '2026-11-01',
    dueAt: null,
    status: 'posted',
    subtotal: '100.0000',
    taxTotal: '0.0000',
    total: '100.0000',
    recordedById: 9,
    createdAt: now,
    updatedAt: now,
  };
  const repository: Record<string, jest.Mock> = {
    transaction: jest.fn((operation: (repo: unknown) => Promise<unknown>) => operation(repository)),
    findSupplier: jest.fn().mockResolvedValue({ id: 2 }),
    findCurrency: jest.fn().mockResolvedValue({ id: 5 }),
    findBillsForUpdate: jest.fn().mockResolvedValue([bill]),
    findAllocationTotals: jest.fn().mockResolvedValue([]),
    createSupplierPayment: jest.fn((data: Record<string, unknown>) =>
      Promise.resolve({ ...data, id: 41, createdAt: now, updatedAt: now }),
    ),
    createPaymentAllocations: jest.fn((rows: Array<Record<string, unknown>>) =>
      Promise.resolve(rows.map((row) => ({ ...row, id: 51, createdAt: now, updatedAt: now }))),
    ),
    updateSupplierBillStatus: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return {
    repository,
    service: new FinanceService(repository as unknown as FinanceRepository),
    bill,
  };
}

describe('FinanceService supplier payments', () => {
  const payment: CreateSupplierPaymentDto = {
    paymentNumber: 'PAY-1',
    supplierId: 2,
    currencyId: 5,
    amount: '25.0000',
    paymentMethod: 'bank_transfer',
    allocations: [{ supplierBillId: 31, amount: '25.0000' }],
  };

  it('records partial bill allocations and updates the bill balance status', async () => {
    const { service, repository } = setup();

    const result = await service.createSupplierPayment(payment, 9);

    expect(result).toMatchObject({
      amount: '25.0000',
      allocations: [{ supplierBillId: 31, amount: '25.0000', balanceDue: '75.0000' }],
    });
    expect(repository.updateSupplierBillStatus).toHaveBeenCalledWith(31, 'partially_paid');
  });

  it('rejects allocations that would overpay a locked bill', async () => {
    const { service, repository } = setup({
      findAllocationTotals: jest.fn().mockResolvedValue([{ supplierBillId: 31, total: '90.0000' }]),
    });

    await expect(
      service.createSupplierPayment(
        { ...payment, amount: '15.0000', allocations: [{ supplierBillId: 31, amount: '15.0000' }] },
        9,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.RESOURCE_CONFLICT });
    expect(repository.createSupplierPayment).not.toHaveBeenCalled();
  });
});

describe('FinanceService supplier bills', () => {
  const createBill: CreateSupplierBillDto = {
    billNumber: 'AP-1',
    supplierInvoiceNumber: 'INV-1',
    supplierId: 2,
    purchaseOrderId: 7,
    currencyId: 5,
    invoiceDate: '2026-11-01',
    taxTotal: '0.0000',
    lines: [
      {
        purchaseOrderLineId: 21,
        itemId: 4,
        unitId: 3,
        quantity: '2.0000',
        unitPrice: '5.0000',
        receiptMatches: [{ goodsReceiptLineId: 12, matchedQuantity: '2.0000' }],
      },
    ],
  };

  function billSetup(overrides: Record<string, jest.Mock> = {}) {
    const receiptLine = {
      id: 12,
      goodsReceiptId: 8,
      purchaseOrderLineId: 21,
      itemId: 4,
      unitId: 3,
      receivedQuantity: '2.0000',
      goodsReceipt: { id: 8, purchaseOrderId: 7, supplierId: 2, status: 'posted' },
    };
    const repository: Record<string, jest.Mock> = {
      transaction: jest.fn((operation: (repo: unknown) => Promise<unknown>) =>
        operation(repository),
      ),
      findSupplier: jest.fn().mockResolvedValue({ id: 2 }),
      findCurrency: jest.fn().mockResolvedValue({ id: 5 }),
      findPurchaseOrderForUpdate: jest.fn().mockResolvedValue({
        id: 7,
        supplierId: 2,
        currencyId: 5,
        status: 'partially_received',
      }),
      findPurchaseOrderLinesForUpdate: jest
        .fn()
        .mockResolvedValue([
          { id: 21, purchaseOrderId: 7, itemId: 4, unitId: 3, quantity: '10.0000' },
        ]),
      findReceiptLinesForUpdate: jest.fn().mockResolvedValue([receiptLine]),
      findReceiptLineMatches: jest.fn().mockResolvedValue([]),
      findPurchaseOrderLineMatchTotals: jest.fn().mockResolvedValue([]),
      createSupplierBill: jest.fn((data: Record<string, unknown>) =>
        Promise.resolve({ ...data, id: 31, createdAt: now, updatedAt: now }),
      ),
      createSupplierBillLines: jest.fn((rows: Array<Record<string, unknown>>) =>
        Promise.resolve(rows.map((row) => ({ ...row, id: 41, createdAt: now, updatedAt: now }))),
      ),
      createReceiptMatches: jest.fn((rows: Array<Record<string, unknown>>) =>
        Promise.resolve(rows.map((row) => ({ ...row, id: 51, createdAt: now, updatedAt: now }))),
      ),
      ...overrides,
    };
    return { repository, service: new FinanceService(repository as unknown as FinanceRepository) };
  }

  it('creates a draft only after matching the supplier PO, item, unit and accepted receipt quantity', async () => {
    const { service, repository } = billSetup();

    const result = await service.createSupplierBill(createBill, 9);

    expect(repository.createSupplierBill).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft', subtotal: '10.0000', total: '10.0000' }),
    );
    expect(repository.createReceiptMatches).toHaveBeenCalledWith([
      expect.objectContaining({
        goodsReceiptLineId: 12,
        matchedQuantity: '2.0000',
        matchedUnitPrice: '5.0000',
      }),
    ]);
    expect(result.status).toBe('draft');
  });

  it('rejects matching accepted receipt quantities more than once across bills', async () => {
    const { service, repository } = billSetup({
      findReceiptLineMatches: jest
        .fn()
        .mockResolvedValue([{ goodsReceiptLineId: 12, total: '1.0000' }]),
    });

    await expect(service.createSupplierBill(createBill, 9)).rejects.toMatchObject({
      code: ERROR_CODES.RESOURCE_CONFLICT,
    });
    expect(repository.createSupplierBill).not.toHaveBeenCalled();
  });

  it('rejects bill lines whose matched receipt quantities do not equal their billed quantity', async () => {
    const { service, repository } = billSetup();

    await expect(
      service.createSupplierBill(
        {
          ...createBill,
          lines: [
            {
              ...createBill.lines[0],
              quantity: '3.0000',
            },
          ],
        },
        9,
      ),
    ).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_ERROR,
      errors: [{ field: 'lines.0.receiptMatches' }],
    });
    expect(repository.transaction).not.toHaveBeenCalled();
  });

  it('posts a draft only after revalidating its receipt matches', async () => {
    const bill = {
      id: 31,
      billNumber: 'AP-1',
      supplierInvoiceNumber: 'INV-1',
      supplierId: 2,
      purchaseOrderId: 7,
      currencyId: 5,
      invoiceDate: '2026-11-01',
      dueAt: null,
      status: 'draft',
      subtotal: '10.0000',
      taxTotal: '0.0000',
      total: '10.0000',
      recordedById: 9,
      createdAt: now,
      updatedAt: now,
    };
    const line = {
      id: 41,
      supplierBillId: 31,
      lineNumber: 1,
      purchaseOrderLineId: 21,
      itemId: 4,
      unitId: 3,
      quantity: '2.0000',
      unitPrice: '5.0000',
      lineTotal: '10.0000',
    };
    const match = {
      id: 51,
      supplierBillLineId: 41,
      goodsReceiptLineId: 12,
      matchedQuantity: '2.0000',
      matchedUnitPrice: '5.0000',
    };
    const receiptLine = {
      id: 12,
      purchaseOrderLineId: 21,
      itemId: 4,
      unitId: 3,
      receivedQuantity: '2.0000',
      goodsReceipt: { id: 8, purchaseOrderId: 7, supplierId: 2, status: 'posted' },
    };
    const { service, repository } = billSetup({
      findSupplierBillForUpdate: jest.fn().mockResolvedValue(bill),
      findSupplierBillLines: jest.fn().mockResolvedValue([line]),
      findReceiptMatches: jest.fn().mockResolvedValue([match]),
      findPurchaseOrderForUpdate: jest.fn().mockResolvedValue({
        id: 7,
        supplierId: 2,
        currencyId: 5,
        status: 'partially_received',
      }),
      findReceiptLinesForUpdate: jest.fn().mockResolvedValue([receiptLine]),
      findReceiptLineMatches: jest
        .fn()
        .mockResolvedValue([{ goodsReceiptLineId: 12, total: '2.0000' }]),
      findPurchaseOrderLineMatchTotals: jest
        .fn()
        .mockResolvedValue([{ purchaseOrderLineId: 21, total: '2.0000' }]),
      updateSupplierBillStatus: jest.fn().mockResolvedValue(undefined),
      findSupplierBill: jest.fn().mockResolvedValue({ ...bill, status: 'posted' }),
      findAllocationTotals: jest.fn().mockResolvedValue([]),
    });

    const result = await service.postSupplierBill(31);

    expect(repository.updateSupplierBillStatus).toHaveBeenCalledWith(31, 'posted');
    expect(result.status).toBe('posted');
  });
});
