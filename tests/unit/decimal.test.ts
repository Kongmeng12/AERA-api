import {
  addDecimal4,
  formatDecimal4,
  multiplyDecimal4,
  parseDecimal4,
} from '../../src/shared/helpers/decimal';

describe('scale-4 decimal helpers', () => {
  it('preserves exact large sums and rounds multiplication to four decimal places', () => {
    expect(addDecimal4('999999999999999.9999', '0.0001')).toBe('1000000000000000.0000');
    expect(multiplyDecimal4('0.3333', '3.0000')).toBe('0.9999');
    expect(formatDecimal4(parseDecimal4('12.5'))).toBe('12.5000');
  });
});
