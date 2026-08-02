/**
 * Display helpers for decimal32 values (UI strings).
 */

/**
 * Format 32-bit string with field spacing for the UI.
 * @param {string} bits
 */
export function spacedBinary(bits) {
  const b = bits.replace(/\s/g, '').padStart(32, '0').slice(-32);
  return [
    b.slice(0, 1),
    b.slice(1, 6),
    b.slice(6, 12),
    b.slice(12, 22),
    b.slice(22, 32),
  ].join(' ');
}

/**
 * @param {import('../types.js').Decimal32Value} value
 * @returns {string}
 */
export function valueToDecimalString(value) {
  const negative = value.sign === 1;

  if (value.kind === 'nan') {
    const label = value.signaling ? 'sNaN' : 'NaN';
    return negative ? `-${label}` : label;
  }
  if (value.kind === 'infinity') {
    return negative ? '-Infinity' : 'Infinity';
  }

  const digits = String(value.coefficient ?? '0').replace(/^0+(?=\d)/, '') || '0';
  const exponent = value.exponent ?? 0;

  let body;
  if (digits === '0') {
    body = exponent === 0 ? '0' : `0E${exponent >= 0 ? '+' : ''}${exponent}`;
  } else if (exponent >= 0) {
    body = digits + '0'.repeat(exponent);
  } else {
    const pointPos = digits.length + exponent;
    if (pointPos <= 0) {
      body = `0.${'0'.repeat(-pointPos)}${digits}`;
    } else {
      body = `${digits.slice(0, pointPos)}.${digits.slice(pointPos)}`;
    }
  }

  return negative ? `-${body}` : body;
}
