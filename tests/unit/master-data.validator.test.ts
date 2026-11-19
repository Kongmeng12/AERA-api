import {
  createCustomerSchema,
  patchCustomerSchema,
  patchCustomerTypeSchema,
  patchItemCategorySchema,
  patchItemSchema,
  patchSupplierSchema,
  patchUnitSchema,
  patchWarehouseSchema,
  createItemSchema,
} from '../../src/modules/master-data/validators/master-data.validator';

describe('master-data validators', () => {
  it('rejects unknown customer properties', () => {
    const result = createCustomerSchema.safeParse({
      customerCode: 'CUS-1',
      customerTypeId: 1,
      name: 'Example Shop',
      isAdmin: true,
    });

    expect(result.success).toBe(false);
  });

  it.each([
    patchCustomerSchema,
    patchCustomerTypeSchema,
    patchSupplierSchema,
    patchUnitSchema,
    patchItemCategorySchema,
    patchItemSchema,
    patchWarehouseSchema,
  ])('rejects an empty patch', (schema) => {
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('does not inject create defaults into a patch and rejects over-precision decimals', () => {
    expect(patchCustomerSchema.parse({ name: 'Updated Shop' })).toEqual({
      name: 'Updated Shop',
    });

    const item = createItemSchema.safeParse({
      sku: 'ITEM-1',
      categoryId: 1,
      baseUnitId: 1,
      name: 'Mineral',
      itemType: 'finished_good',
      reorderPoint: '1.12345',
    });

    expect(item.success).toBe(false);
  });
});
