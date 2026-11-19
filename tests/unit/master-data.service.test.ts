import { ERROR_CODES } from '../../src/shared/constants/error-codes';
import type { MasterDataRepository } from '../../src/modules/master-data/repositories/master-data.repository';
import { MasterDataService } from '../../src/modules/master-data/services/master-data.service';

function setup(overrides: Record<string, jest.Mock> = {}) {
  const repository = {
    customerCodeTaken: jest.fn().mockResolvedValue(false),
    createCustomer: jest.fn(),
    customerTypeExists: jest.fn().mockResolvedValue(true),
    itemCategoryExists: jest.fn().mockResolvedValue(true),
    unitExists: jest.fn().mockResolvedValue(true),
    itemSkuTaken: jest.fn().mockResolvedValue(false),
    createItem: jest.fn(),
    findUnit: jest.fn().mockResolvedValue({ id: 8 }),
    hasItemsUsingUnit: jest.fn().mockResolvedValue(false),
    hasConversionsUsingUnit: jest.fn().mockResolvedValue(false),
    deleteUnit: jest.fn(),
    findItemCategory: jest.fn().mockResolvedValue({ id: 10, parentId: null }),
    updateItemCategory: jest.fn(),
    ...overrides,
  };
  return {
    service: new MasterDataService(repository as unknown as MasterDataRepository),
    repository,
  };
}

describe('MasterDataService', () => {
  it('rejects duplicate customer codes before writing', async () => {
    const { service, repository } = setup({
      customerCodeTaken: jest.fn().mockResolvedValue(true),
    });

    await expect(
      service.createCustomer({
        customerCode: 'CUS-1',
        customerTypeId: 1,
        name: 'Example Shop',
        creditLimit: '0.0000',
        creditTermDays: 0,
        status: 'active',
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.RESOURCE_CONFLICT });
    expect(repository.createCustomer).not.toHaveBeenCalled();
  });

  it('rejects an item whose category does not exist', async () => {
    const { service, repository } = setup({
      itemCategoryExists: jest.fn().mockResolvedValue(false),
    });

    await expect(
      service.createItem({
        sku: 'ITEM-1',
        categoryId: 99,
        baseUnitId: 8,
        name: 'Mineral',
        itemType: 'finished_good',
        reorderPoint: '0.0000',
        status: 'active',
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_ERROR,
      errors: [{ field: 'categoryId' }],
    });
    expect(repository.createItem).not.toHaveBeenCalled();
  });

  it('blocks deletion of units still used by items', async () => {
    const { service, repository } = setup({
      hasItemsUsingUnit: jest.fn().mockResolvedValue(true),
    });

    await expect(service.deleteUnit(8)).rejects.toMatchObject({
      code: ERROR_CODES.RESOURCE_CONFLICT,
    });
    expect(repository.deleteUnit).not.toHaveBeenCalled();
  });

  it('rejects a category parent that would create a cycle', async () => {
    const { service, repository } = setup();

    await expect(service.updateItemCategory(10, { parentId: 10 })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_ERROR,
      errors: [{ field: 'parentId' }],
    });
    expect(repository.updateItemCategory).not.toHaveBeenCalled();
  });
});
