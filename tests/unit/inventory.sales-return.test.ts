import type { EntityManager } from 'typeorm';
import { InventoryBalance, StockBatch, StockMovement } from '../../src/modules/inventory/entities/stock.entity';
import type { InventoryRepository } from '../../src/modules/inventory/repositories/inventory.repository';
import { InventoryService } from '../../src/modules/inventory/services/inventory.service';

function createMovementQuery(result: object[]) {
  const query: Record<string, jest.Mock> = {};
  query.where = jest.fn().mockReturnValue(query);
  query.andWhere = jest.fn().mockReturnValue(query);
  query.orderBy = jest.fn().mockReturnValue(query);
  query.getMany = jest.fn().mockResolvedValue(result);
  return query;
}

describe('InventoryService customer return receipt', () => {
  it('creates an isolated pending-QC batch for returned stock', async () => {
    const movementQuery = createMovementQuery([
      {
        quantity: '2.0000',
        fromWarehouseId: 6,
        fromZoneId: 7,
      },
    ]);
    const returnedQuery = createMovementQuery([]);
    const movementRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(movementQuery)
        .mockReturnValueOnce(returnedQuery),
      create: jest.fn((value: object) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const batchRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 30,
        itemId: 5,
        manufacturedAt: '2026-01-01',
        expiresAt: '2027-01-01',
      }),
      create: jest.fn((value: object) => value),
      save: jest.fn((value: object) => Promise.resolve({ id: 31, ...value })),
    };
    const balanceRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: object) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === StockMovement) return movementRepository;
        if (entity === StockBatch) return batchRepository;
        if (entity === InventoryBalance) return balanceRepository;
        throw new Error('Unexpected repository');
      }),
    } as unknown as EntityManager;
    const service = new InventoryService({} as InventoryRepository);

    const returnedBatchId = await service.receiveSalesReturn(manager, {
      returnId: 21,
      returnLineNumber: 1,
      salesOrderLineId: 12,
      itemId: 5,
      batchId: 30,
      unitId: 6,
      quantity: '1.0000',
      actorId: 7,
    });

    expect(returnedBatchId).toBe(31);
    expect(batchRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 5,
        batchNumber: 'SR-21-1',
        qcStatus: 'pending',
        sourceType: 'sales_return',
        sourceId: '21:1:source-batch-30',
      }),
    );
    expect(balanceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ batchId: 31, stockStatus: 'qc_hold' }),
    );
    expect(movementRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ batchId: 31, movementType: 'sales_return' }),
    );
  });
});
