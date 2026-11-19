import { ERROR_CODES } from '../../src/shared/constants/error-codes';
import { StockOperationsService } from '../../src/modules/stock-operations/services/stock-operations.service';
import type { StockOperationsRepository } from '../../src/modules/stock-operations/repositories/stock-operations.repository';

const now = new Date('2026-11-19T03:00:00.000Z');

function setup(overrides: Record<string, jest.Mock> = {}) {
  const repository: Record<string, jest.Mock> = {
    transaction: jest.fn((operation: (repo: unknown) => Promise<unknown>) => operation(repository)),
    ...overrides,
  };
  return {
    service: new StockOperationsService(repository as unknown as StockOperationsRepository),
    repository,
  };
}

describe('Stock operations workflows', () => {
  it('records partial transfer receipts without completing the transfer', async () => {
    const transfer = {
      id: 8,
      transferNumber: 'ST-8',
      fromWarehouseId: 1,
      fromZoneId: 2,
      toWarehouseId: 3,
      toZoneId: 4,
      requestedById: 5,
      requestedAt: now,
      completedAt: null,
      status: 'in_transit',
      notes: null,
      createdAt: now,
      updatedAt: now,
    };
    const line = {
      id: 9,
      transferId: 8,
      lineNumber: 1,
      itemId: 10,
      batchId: 11,
      unitId: 12,
      quantity: '10.0000',
      receivedQuantity: '0.0000',
    };
    const { service, repository } = setup({
      findTransferForUpdate: jest.fn().mockResolvedValue(transfer),
      findTransferLinesForUpdate: jest.fn().mockResolvedValue([line]),
      addAvailableBalance: jest.fn().mockResolvedValue(undefined),
      createMovement: jest.fn().mockResolvedValue(undefined),
      saveTransferLine: jest.fn().mockResolvedValue(line),
      saveTransfer: jest.fn(),
      findTransfer: jest.fn().mockResolvedValue(transfer),
      findTransferLines: jest.fn().mockResolvedValue([line]),
    });

    const result = await service.receiveTransfer(
      8,
      { lines: [{ transferLineId: 9, receivedQuantity: '4.0000' }] },
      6,
    );

    expect(result.status).toBe('in_transit');
    expect(result.lines[0].receivedQuantity).toBe('4.0000');
    expect(repository.addAvailableBalance).toHaveBeenCalledWith(
      expect.objectContaining({ warehouseId: 3, zoneId: 4, quantity: '4.0000' }),
    );
    expect(repository.saveTransfer).not.toHaveBeenCalled();
  });

  it('requires a recount when stock moved in the counted zone after the snapshot', async () => {
    const count = {
      id: 15,
      countNumber: 'SC-15',
      warehouseId: 1,
      zoneId: 2,
      startedById: 3,
      startedAt: now,
      completedAt: now,
      approvedById: null,
      status: 'pending_approval',
    };
    const { service, repository } = setup({
      findCountForUpdate: jest.fn().mockResolvedValue(count),
      hasCountMovementAfter: jest.fn().mockResolvedValue(true),
      findCountLinesForUpdate: jest.fn(),
      saveBalance: jest.fn(),
    });

    await expect(service.approveCount(15, 4)).rejects.toMatchObject({
      code: ERROR_CODES.RESOURCE_CONFLICT,
    });
    expect(repository.findCountLinesForUpdate).not.toHaveBeenCalled();
    expect(repository.saveBalance).not.toHaveBeenCalled();
  });

  it('applies approved count discrepancies as stock adjustments', async () => {
    const count = {
      id: 16,
      countNumber: 'SC-16',
      warehouseId: 1,
      zoneId: 2,
      startedById: 3,
      startedAt: now,
      completedAt: now,
      approvedById: null,
      status: 'pending_approval',
      createdAt: now,
      updatedAt: now,
    };
    const line = {
      id: 17,
      stockCountId: 16,
      lineNumber: 1,
      itemId: 5,
      batchId: 6,
      unitId: 7,
      expectedQuantity: '5.0000',
      countedQuantity: '3.0000',
      discrepancyReason: 'Damaged during storage',
    };
    const balance = {
      warehouseId: 1,
      zoneId: 2,
      itemId: 5,
      batchId: 6,
      unitId: 7,
      quantityOnHand: '5.0000',
      quantityReserved: '1.0000',
    };
    const { service, repository } = setup({
      findCountForUpdate: jest.fn().mockResolvedValue(count),
      hasCountMovementAfter: jest.fn().mockResolvedValue(false),
      findCountLinesForUpdate: jest.fn().mockResolvedValue([line]),
      findCountBalanceForUpdate: jest.fn().mockResolvedValue(balance),
      saveBalance: jest.fn().mockResolvedValue(balance),
      createMovement: jest.fn().mockResolvedValue(undefined),
      saveCount: jest.fn().mockResolvedValue(count),
      findCount: jest.fn().mockResolvedValue(count),
      findCountLines: jest.fn().mockResolvedValue([line]),
    });

    const result = await service.approveCount(16, 4);

    expect(balance.quantityOnHand).toBe('3.0000');
    expect(repository.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: 'stock_count_adjustment',
        quantity: '2.0000',
        fromWarehouseId: 1,
        toWarehouseId: null,
      }),
    );
    expect(result.status).toBe('approved');
  });

  it('prevents a write-off requester from approving their own request', async () => {
    const { service, repository } = setup({
      findWriteoffForUpdate: jest.fn().mockResolvedValue({
        id: 20,
        requestedById: 7,
        status: 'pending_approval',
      }),
      findWriteoffLinesForUpdate: jest.fn(),
      saveWriteoff: jest.fn(),
    });

    await expect(service.approveWriteoff(20, 7)).rejects.toMatchObject({
      code: ERROR_CODES.RESOURCE_CONFLICT,
    });
    expect(repository.findWriteoffLinesForUpdate).not.toHaveBeenCalled();
    expect(repository.saveWriteoff).not.toHaveBeenCalled();
  });
});
