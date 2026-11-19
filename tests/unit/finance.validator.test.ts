import {
  createSupplierBillSchema,
  createSupplierPaymentSchema,
} from '../../src/modules/finance/validators/finance.validator';

describe('finance request validators', () => {
  it('requires supplier bill receipt matches for every line', () => {
    const result = createSupplierBillSchema.safeParse({
      billNumber: 'AP-1',
      supplierInvoiceNumber: 'INV-1',
      supplierId: 2,
      purchaseOrderId: 7,
      currencyId: 5,
      invoiceDate: '2026-11-01',
      lines: [
        {
          purchaseOrderLineId: 21,
          itemId: 4,
          unitId: 3,
          quantity: '2.0000',
          unitPrice: '5.0000',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate bill allocations in a payment receipt', () => {
    const result = createSupplierPaymentSchema.safeParse({
      paymentNumber: 'PAY-1',
      supplierId: 2,
      currencyId: 5,
      amount: '10.0000',
      paymentMethod: 'bank_transfer',
      allocations: [
        { supplierBillId: 31, amount: '4.0000' },
        { supplierBillId: 31, amount: '6.0000' },
      ],
    });
    expect(result.success).toBe(false);
  });
});
