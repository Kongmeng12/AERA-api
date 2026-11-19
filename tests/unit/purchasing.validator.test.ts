import { createGoodsReceiptSchema } from '../../src/modules/purchasing/validators/purchasing.validator';

const receipt = {
  receiptNumber: 'GR-1',
  purchaseOrderId: 1,
  warehouseId: 1,
  lines: [
    {
      purchaseOrderLineId: 1,
      receivedQuantity: '1.0000',
      rejectedQuantity: '0.0000',
      batchNumber: 'BATCH-1',
      warehouseZoneId: 1,
    },
  ],
};

describe('purchasing validators', () => {
  it('requires a batch and a warehouse zone for accepted quantities', () => {
    const result = createGoodsReceiptSchema.safeParse({
      ...receipt,
      lines: [{ ...receipt.lines[0], batchNumber: null, warehouseZoneId: null }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects expiration dates before the manufacturing date', () => {
    const result = createGoodsReceiptSchema.safeParse({
      ...receipt,
      lines: [
        {
          ...receipt.lines[0],
          manufacturedAt: '2026-03-01',
          expiresAt: '2026-02-28',
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
