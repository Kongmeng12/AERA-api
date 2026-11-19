import { ERROR_CODES } from '../../src/shared/constants/error-codes';
import { ProductionService } from '../../src/modules/production/services/production.service';
import type { ProductionRepository } from '../../src/modules/production/repositories/production.repository';

describe('Production workflows', () => {
  it('does not issue raw material when the selected batch has no available stock', async () => {
    const repository: Record<string, jest.Mock> = {
      findOrderForUpdate: jest.fn().mockResolvedValue({
        id: 8,
        status: 'planned',
        billOfMaterialsId: 3,
        plannedQuantity: '2.0000',
        startedById: null,
        actualStartAt: null,
      }),
      findBomLinesForUpdate: jest.fn().mockResolvedValue([
        {
          materialItemId: 4,
          unitId: 1,
          quantity: '1.000000',
          scrapPercent: '0.0000',
        },
      ]),
      findIssuesForUpdate: jest.fn().mockResolvedValue([]),
      findAvailableBalances: jest.fn().mockResolvedValue([]),
      createMovement: jest.fn(),
      findOrder: jest.fn(),
    };
    repository.transaction = jest.fn((operation: (repo: unknown) => Promise<unknown>) =>
      operation(repository),
    );
    const service = new ProductionService(repository as unknown as ProductionRepository);

    await expect(
      service.issueMaterials(
        8,
        {
          lines: [{ materialItemId: 4, batchId: 9, quantity: '1.0000' }],
        },
        2,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.RESOURCE_CONFLICT });
    expect(repository.createMovement).not.toHaveBeenCalled();
  });

  it('rejects alternate output units until production conversion is supported', async () => {
    const repository: Record<string, jest.Mock> = {
      findBom: jest.fn().mockResolvedValue({
        id: 3,
        itemId: 5,
        status: 'active',
        effectiveFrom: '2025-01-01',
        effectiveTo: null,
      }),
      findItem: jest.fn().mockResolvedValue({ id: 5, baseUnitId: 1 }),
      findUnits: jest.fn().mockResolvedValue([{ id: 2 }]),
      createOrder: jest.fn(),
    };
    const service = new ProductionService(repository as unknown as ProductionRepository);

    await expect(
      service.createOrder({
        productionOrderNumber: 'PO-ALT',
        billOfMaterialsId: 3,
        plannedQuantity: '2.0000',
        outputUnitId: 2,
        plannedStartAt: '2026-11-19T03:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_ERROR,
      errors: [{ field: 'outputUnitId' }],
    });
    expect(repository.createOrder).not.toHaveBeenCalled();
  });

  it('records production output as available stock', async () => {
    const order = {
      id: 8,
      productionOrderNumber: 'PO-8',
      billOfMaterialsId: 3,
      itemId: 5,
      plannedQuantity: '2.0000',
      actualQuantity: '0.0000',
      outputUnitId: 1,
      plannedStartAt: new Date('2026-11-19T03:00:00.000Z'),
      actualStartAt: new Date('2026-11-19T03:00:00.000Z'),
      completedAt: null,
      startedById: 2,
      status: 'in_progress',
      notes: null,
      createdAt: new Date('2026-11-19T03:00:00.000Z'),
      updatedAt: new Date('2026-11-19T03:00:00.000Z'),
    };
    const repository: Record<string, jest.Mock> = {
      findOrderForUpdate: jest.fn().mockResolvedValue(order),
      findOrder: jest.fn().mockResolvedValue(order),
      findBomLinesForUpdate: jest.fn().mockResolvedValue([
        {
          materialItemId: 4,
          unitId: 1,
          quantity: '1.000000',
          scrapPercent: '0.0000',
        },
      ]),
      findIssuesForUpdate: jest.fn().mockResolvedValue([
        {
          materialItemId: 4,
          issuedQuantity: '2.0000',
          returnedQuantity: '0.0000',
        },
      ]),
      findIssues: jest.fn().mockResolvedValue([]),
      findOutputs: jest.fn().mockResolvedValue([]),
      findWarehouse: jest.fn().mockResolvedValue({ id: 6 }),
      findZone: jest.fn().mockResolvedValue({ id: 7, warehouseId: 6 }),
      findBatchByNumber: jest.fn().mockResolvedValue(null),
      createBatch: jest.fn().mockResolvedValue({ id: 31 }),
      createOutput: jest.fn().mockResolvedValue({ id: 39 }),
      addAvailableBalance: jest.fn().mockResolvedValue(undefined),
      createMovement: jest.fn().mockResolvedValue(undefined),
      saveOrder: jest.fn().mockResolvedValue(order),
    };
    repository.transaction = jest.fn((operation: (repo: unknown) => Promise<unknown>) =>
      operation(repository),
    );
    const service = new ProductionService(repository as unknown as ProductionRepository);

    await service.recordOutput(
      8,
      {
        batchNumber: 'OUTPUT-8',
        quantity: '1.0000',
        warehouseId: 6,
        warehouseZoneId: 7,
      },
      2,
    );

    expect(repository.createBatch).toHaveBeenCalledWith(
      expect.objectContaining({ qcStatus: 'not_tracked', sourceType: 'production_order' }),
    );
    expect(repository.addAvailableBalance).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: 31,
        quantity: '1.0000',
      }),
    );
  });
});
