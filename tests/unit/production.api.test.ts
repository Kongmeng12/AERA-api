import { ERROR_CODES } from '../../src/shared/constants/error-codes';
import { ProductionService } from '../../src/modules/production/services/production.service';
import type { ProductionRepository } from '../../src/modules/production/repositories/production.repository';
import { QualityControlService } from '../../src/modules/quality-control/services/quality-control.service';
import type { QualityControlRepository } from '../../src/modules/quality-control/repositories/quality-control.repository';
import { createTestDefinitionSchema } from '../../src/modules/quality-control/validators/quality-control.validator';

describe('Production and QC workflows', () => {
  it('does not issue raw material from stock that is not available and QC-passed', async () => {
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

  it('evaluates numeric test results using configured bounds and preserves a passed batch status on failure', async () => {
    const batch = { id: 4, qcStatus: 'passed', status: 'active' };
    const repository: Record<string, jest.Mock> = {
      findBatchForUpdate: jest.fn().mockResolvedValue(batch),
      findQcHoldBalances: jest.fn().mockResolvedValue([
        {
          quantityOnHand: '2.0000',
          stockStatus: 'qc_hold',
        },
      ]),
      findUnreleasedPassingInspection: jest.fn().mockResolvedValue(null),
      findActiveDefinitions: jest.fn().mockResolvedValue([
        {
          id: 7,
          code: 'GRADE',
          minimumValue: '1.000000',
          maximumValue: '3.000000',
          isRequired: true,
        },
      ]),
      createInspection: jest.fn().mockImplementation((value: Record<string, unknown>) =>
        Promise.resolve({
          id: 12,
          ...value,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      createResults: jest
        .fn()
        .mockImplementation((values: Array<Record<string, unknown>>) =>
          Promise.resolve(
            values.map((value, index) => ({ id: index + 1, inspectionId: 12, ...value })),
          ),
        ),
      saveBatch: jest.fn(),
    };
    repository.transaction = jest.fn((operation: (repo: unknown) => Promise<unknown>) =>
      operation(repository),
    );
    const service = new QualityControlService(repository as unknown as QualityControlRepository);
    const inspection = await service.createInspection(
      {
        inspectionNumber: 'QC-12',
        batchId: 4,
        results: [{ testDefinitionId: 7, numericValue: '3.000001' }],
      },
      5,
    );

    expect(inspection.status).toBe('failed');
    expect(inspection.results[0].passed).toBe(false);
    expect(batch.qcStatus).toBe('passed');
    expect(repository.saveBatch).not.toHaveBeenCalled();
  });

  it('requires an inspector-supplied text outcome for qualitative tests', async () => {
    const repository: Record<string, jest.Mock> = {
      findBatchForUpdate: jest
        .fn()
        .mockResolvedValue({ id: 4, qcStatus: 'pending', status: 'active' }),
      findQcHoldBalances: jest.fn().mockResolvedValue([{ quantityOnHand: '1.0000' }]),
      findUnreleasedPassingInspection: jest.fn().mockResolvedValue(null),
      findActiveDefinitions: jest.fn().mockResolvedValue([
        {
          id: 3,
          code: 'VISUAL',
          minimumValue: null,
          maximumValue: null,
          isRequired: true,
        },
      ]),
    };
    repository.transaction = jest.fn((operation: (repo: unknown) => Promise<unknown>) =>
      operation(repository),
    );
    const service = new QualityControlService(repository as unknown as QualityControlRepository);

    await expect(
      service.createInspection(
        {
          inspectionNumber: 'QC-13',
          batchId: 4,
          results: [{ testDefinitionId: 3 }],
        },
        5,
      ),
    ).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_ERROR,
      errors: [{ field: 'results.0' }],
    });
  });

  it('allows QC definitions without numeric limits rather than assuming standards', () => {
    expect(
      createTestDefinitionSchema.safeParse({
        code: 'VISUAL',
        name: 'Visual check',
      }).success,
    ).toBe(true);
    expect(
      createTestDefinitionSchema.safeParse({
        code: 'ASSAY',
        name: 'Assay',
        minimumValue: '1.000000',
      }).success,
    ).toBe(false);
  });

  it('releases only QC-hold quantities and leaves previously available batch stock alone', async () => {
    const inspection = {
      id: 21,
      batchId: 4,
      status: 'passed',
      releasedAt: null,
      releasedById: null,
      inspectedAt: new Date(),
      inspectedById: 5,
      inspectionNumber: 'QC-21',
      rejectedQuantity: '0.0000',
      holdReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const batch = { id: 4, qcStatus: 'passed', status: 'active' };
    const holdBalance = {
      id: 15,
      itemId: 8,
      batchId: 4,
      unitId: 2,
      warehouseId: 6,
      zoneId: 7,
      stockStatus: 'qc_hold',
      quantityOnHand: '2.5000',
      quantityReserved: '0.0000',
    };
    const repository: Record<string, jest.Mock> = {
      findInspectionForUpdate: jest.fn().mockResolvedValue(inspection),
      findInspection: jest.fn().mockResolvedValue(inspection),
      findResults: jest.fn().mockResolvedValue([]),
      findBatchForUpdate: jest.fn().mockResolvedValue(batch),
      findQcHoldBalances: jest.fn().mockResolvedValue([holdBalance]),
      addAvailableBalance: jest.fn().mockResolvedValue(undefined),
      saveBalance: jest.fn().mockResolvedValue(undefined),
      createMovement: jest.fn().mockResolvedValue(undefined),
      saveBatch: jest.fn().mockResolvedValue(undefined),
      saveInspection: jest.fn().mockResolvedValue(undefined),
    };
    repository.transaction = jest.fn((operation: (repo: unknown) => Promise<unknown>) =>
      operation(repository),
    );
    const service = new QualityControlService(repository as unknown as QualityControlRepository);

    await service.releaseInspection(21, 11);

    expect(repository.addAvailableBalance).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: '2.5000',
        itemId: 8,
        batchId: 4,
        warehouseId: 6,
        zoneId: 7,
      }),
    );
    expect(holdBalance.quantityOnHand).toBe('0.0000');
    expect(repository.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: 'qc_release',
        quantity: '2.5000',
        sourceType: 'qc_inspection',
      }),
    );
    expect(repository.saveBatch).not.toHaveBeenCalled();
    expect(inspection.releasedById).toBe(11);
  });
});
