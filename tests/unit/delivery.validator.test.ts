import { completeDeliverySchema } from '../../src/modules/delivery/validators/delivery.validator';

describe('delivery validators', () => {
  it('requires an invoice number when some quantity was delivered', () => {
    const result = completeDeliverySchema.safeParse({
      lines: [{ deliveryLineId: 1, deliveredQuantity: '1.0000' }],
    });

    expect(result.success).toBe(false);
  });

  it('allows a failed delivery to be recorded without an invoice', () => {
    const result = completeDeliverySchema.safeParse({
      lines: [
        {
          deliveryLineId: 1,
          deliveredQuantity: '0.0000',
          returnedQuantity: '1.0000',
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
