import {
  approveSalesReturnSchema,
  createSalesReturnSchema,
  rejectSalesReturnSchema,
} from '../../src/modules/returns/validators/returns.validator';

describe('sales return validators', () => {
  const validReturn = {
    returnNumber: 'SR-1',
    salesInvoiceId: 10,
    reason: 'Damaged packaging',
    lines: [{ salesInvoiceLineId: 20, batchId: 30, quantity: '1.0000' }],
  };

  it('requires a batch and positive quantity for each return line', () => {
    expect(
      createSalesReturnSchema.safeParse({
        ...validReturn,
        lines: [{ salesInvoiceLineId: 20, batchId: 30, quantity: '0.0000' }],
      }).success,
    ).toBe(false);
    expect(
      createSalesReturnSchema.safeParse({
        ...validReturn,
        lines: [{ salesInvoiceLineId: 20, quantity: '1.0000' }],
      }).success,
    ).toBe(false);
  });

  it('allows only one entry per invoice line', () => {
    expect(
      createSalesReturnSchema.safeParse({
        ...validReturn,
        lines: [
          { salesInvoiceLineId: 20, batchId: 30, quantity: '1.0000' },
          { salesInvoiceLineId: 20, batchId: 31, quantity: '1.0000' },
        ],
      }).success,
    ).toBe(false);
  });

  it('requires a credit note number to approve and a reason to reject', () => {
    expect(approveSalesReturnSchema.safeParse({ creditNoteNumber: 'CN-1' }).success).toBe(true);
    expect(rejectSalesReturnSchema.safeParse({ reason: 'Not eligible' }).success).toBe(true);
    expect(rejectSalesReturnSchema.safeParse({ reason: ' ' }).success).toBe(false);
  });
});
