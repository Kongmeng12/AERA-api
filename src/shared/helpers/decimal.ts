const DECIMAL_SCALE = 4;
const SCALE_FACTOR = 10n ** BigInt(DECIMAL_SCALE);

export function parseDecimal4(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole + fraction.padEnd(DECIMAL_SCALE, '0'));
}

export function formatDecimal4(value: bigint): string {
  const whole = value / SCALE_FACTOR;
  const fraction = (value % SCALE_FACTOR).toString().padStart(DECIMAL_SCALE, '0');
  return `${whole}.${fraction}`;
}

export function addDecimal4(left: string, right: string): string {
  return formatDecimal4(parseDecimal4(left) + parseDecimal4(right));
}

export function multiplyDecimal4(left: string, right: string): string {
  const product = parseDecimal4(left) * parseDecimal4(right);
  return formatDecimal4((product + SCALE_FACTOR / 2n) / SCALE_FACTOR);
}
