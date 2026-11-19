import {
  createSalesOrderSchema,
  createSalesPriceSchema,
} from '../../src/modules/sales/validators/sales.validator';

describe('sales validators', () => {
  it('rejects a sales price scoped to both a customer and customer type', () => {
    const result = createSalesPriceSchema.safeParse({
      itemId: 1,
      unitId: 1,
      customerId: 5,
      customerTypeId: 2,
      currencyId: 1,
      unitPrice: '10.0000',
      effectiveFrom: '2026-01-01T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('rejects non-positive sales order quantities', () => {
    const result = createSalesOrderSchema.safeParse({
      orderNumber: 'SO-1',
      customerId: 1,
      currencyId: 1,
      lines: [{ itemId: 1, unitId: 1, quantity: '0.0000' }],
    });

    expect(result.success).toBe(false);
  });
});
