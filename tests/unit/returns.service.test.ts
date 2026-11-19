import type { EntityManager } from 'typeorm';
import type { InventoryService } from '../../src/modules/inventory/services/inventory.service';
import type { ReturnsRepository } from '../../src/modules/returns/repositories/returns.repository';
import { ReturnsService } from '../../src/modules/returns/services/returns.service';

const now = new Date('2026-11-19T03:00:00.000Z');

function setup(overrides: Record<string, jest.Mock> = {}) {
  const invoice = {
    id: 8,
    customerId: 4,
    currencyId: 3,
    status: 'issued',
    total: '15.0000',
  };
  const invoiceLine = {
    id: 20,
    salesInvoiceId: 8,
    salesOrderLineId: 12,
    itemId: 5,
    unitId: 6,
    quantity: '3.0000',
    unitPrice: '5.0000',
    lineTotal: '15.0000',
  };
  const salesReturn = {
    id: 21,
    returnNumber: 'SR-1',
    salesInvoiceId: 8,
    customerId: 4,
    requestedById: 9,
    requestedAt: now,
    status: 'draft',
    reason: 'Damaged packaging',
    creditNoteId: null,
    createdAt: now,
    updatedAt: now,
  };
  const returnLine = {
    id: 22,
    salesReturnId: 21,
    salesInvoiceLineId: 20,
    lineNumber: 1,
    itemId: 5,
    batchId: 30,
    unitId: 6,
    quantity: '1.0000',
    disposition: 'qc_hold',
    unitPriceSnapshot: '5.0000',
    lineCreditAmount: '5.0000',
    reason: null,
    createdAt: now,
    updatedAt: now,
  };
  const manager = {} as unknown as EntityManager;
  const repository: Record<string, jest.Mock> = {
    transaction: jest.fn((operation: (repo: unknown, manager: unknown) => Promise<unknown>) =>
      operation(repository, manager),
    ),
    findSalesInvoiceForUpdate: jest.fn().mockResolvedValue(invoice),
    findSalesInvoiceLineForUpdate: jest.fn().mockResolvedValue(invoiceLine),
    findSalesReturn: jest.fn().mockResolvedValue({
      ...salesReturn,
      status: 'approved',
      creditNoteId: 23,
    }),
    sumReturnQuantities: jest.fn().mockResolvedValue({ quantity: '0.0000' }),
    createSalesReturn: jest.fn().mockResolvedValue(salesReturn),
    createSalesReturnLines: jest.fn().mockResolvedValue([returnLine]),
    saveSalesReturnLine: jest.fn().mockResolvedValue(returnLine),
    findSalesReturnForUpdate: jest.fn().mockResolvedValue(salesReturn),
    findReturnsLines: jest.fn().mockResolvedValue([returnLine]),
    sumApprovedReturnQuantities: jest.fn().mockResolvedValue({ quantity: '0.0000' }),
    createCreditNote: jest.fn().mockResolvedValue({ id: 23 }),
    createCreditNoteLines: jest.fn().mockResolvedValue([]),
    updateSalesReturn: jest.fn().mockResolvedValue(undefined),
    sumPostedPayments: jest.fn().mockResolvedValue({ amount: '0.0000' }),
    sumIssuedCreditNotes: jest.fn().mockResolvedValue({ amount: '5.0000' }),
    updateSalesInvoiceStatus: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const inventory = { receiveSalesReturn: jest.fn().mockResolvedValue(31) };
  return {
    service: new ReturnsService(
      repository as unknown as ReturnsRepository,
      inventory as unknown as InventoryService,
    ),
    repository,
    inventory,
    invoice,
    invoiceLine,
    salesReturn,
    returnLine,
    manager,
  };
}

describe('ReturnsService', () => {
  it('creates a draft and reserves the invoice quantity against duplicate requests', async () => {
    const { service, repository } = setup({
      sumReturnQuantities: jest.fn().mockResolvedValue({ quantity: '2.5000' }),
    });

    await expect(
      service.create(
        {
          returnNumber: 'SR-1',
          salesInvoiceId: 8,
          reason: 'Damaged packaging',
          lines: [{ salesInvoiceLineId: 20, batchId: 30, quantity: '1.0000' }],
        },
        9,
      ),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(repository.createSalesReturn).not.toHaveBeenCalled();
  });

  it('approves the return atomically with QC hold stock and an issued credit note', async () => {
    const { service, repository, inventory, manager } = setup();

    const result = await service.approve(21, { creditNoteNumber: 'CN-1' }, 7);

    expect(inventory.receiveSalesReturn).toHaveBeenCalledWith(manager, {
      returnId: 21,
      returnLineNumber: 1,
      salesOrderLineId: 12,
      itemId: 5,
      batchId: 30,
      unitId: 6,
      quantity: '1.0000',
      actorId: 7,
    });
    expect(repository.createCreditNote).toHaveBeenCalledWith(
      expect.objectContaining({ salesInvoiceId: 8, status: 'issued', amount: '5.0000' }),
    );
    expect(repository.saveSalesReturnLine).toHaveBeenCalledWith(
      expect.objectContaining({ id: 22, batchId: 31 }),
    );
    expect(repository.updateSalesReturn).toHaveBeenCalledWith(21, {
      status: 'approved',
      creditNoteId: 23,
      reason: 'Damaged packaging',
    });
    expect(repository.sumIssuedCreditNotes).toHaveBeenCalledWith(8);
    expect(repository.updateSalesInvoiceStatus).not.toHaveBeenCalled();
    expect(result.creditNoteId).toBe(23);
  });
});
