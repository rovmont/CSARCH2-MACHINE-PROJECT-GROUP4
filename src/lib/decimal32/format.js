import { bitsToHex, stubConversionResult } from './types.js';

/**
 * OWNER: Go, Justin (Feature 1 — encode/decode + display formatting)
 *
 * decimal32 DPD bit layout (32 bits):
 *   [sign 1] [combination 5] [exp continuation 6] [declet0 10] [declet1 10]
 *
 * Parameters (see types.js DECIMAL32): 7 significand digits, bias 101,
 * emin -95, emax 96. Specials: ±0, ±Inf, NaN.
 *
 * TODO(Justin):
 * 1. encodeDecimal32 — pack a Decimal32Value into a 32-bit binary string (use dpd.js).
 * 2. decodeDecimal32 — unpack bits or 0xHEX into a Decimal32Value.
 * 3. valueToDecimalString — pretty-print a Decimal32Value for the UI.
 * 4. spacedBinary / packResult can stay as thin helpers once bits exist.
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
 * @param {import('./types.js').Decimal32Value} value
 * @returns {string}
 */
export function valueToDecimalString(value) {
  // TODO(Justin): Format finite/zero/inf/nan (include sign) as a decimal string.
  void value;
  throw new Error('TODO(Justin): valueToDecimalString not implemented — see format.js');
}

/**
 * Pack Decimal32Value into 32-bit DPD encoding.
 * @param {import('./types.js').Decimal32Value} value
 * @returns {string} 32-bit binary string
 */
export function encodeDecimal32(value) {
  // TODO(Justin): Build sign, combination field, exp continuation, two DPD declets.
  // Handle kind === 'nan' | 'infinity' | 'zero' | 'finite'. Clamp/overflow to Inf as needed.
  void value;
  throw new Error('TODO(Justin): encodeDecimal32 not implemented — see format.js');
}

/**
 * Unpack 32-bit DPD (binary string or hex) into Decimal32Value.
 * @param {string} bitsOrHex
 * @returns {import('./types.js').Decimal32Value}
 */
export function decodeDecimal32(bitsOrHex) {
  // TODO(Justin): Accept "0x........", 8 hex digits, or 32-bit binary (optional spaces).
  // Decode combination field for finite vs Inf vs NaN; rebuild 7-digit coefficient + exponent.
  void bitsOrHex;
  throw new Error('TODO(Justin): decodeDecimal32 not implemented — see format.js');
}

/**
 * Build a ConversionResult for the UI once encode works.
 * @param {import('./types.js').Decimal32Value} value
 * @param {string[]} [steps]
 * @param {string[]} [flags]
 * @returns {import('./types.js').ConversionResult}
 */
export function packResult(value, steps = [], flags = []) {
  // TODO(Justin): Prefer implementing via encodeDecimal32 + valueToDecimalString.
  // Temporary stub so callers do not crash before encode exists:
  try {
    const bits = encodeDecimal32(value);
    return {
      value,
      bits,
      spacedBinary: spacedBinary(bits),
      hex: bitsToHex(bits),
      decimal: valueToDecimalString(value),
      steps,
      flags,
    };
  } catch {
    return stubConversionResult(
      'TODO(Justin): Implement encodeDecimal32 / valueToDecimalString so packResult can fill bits, hex, and decimal.'
    );
  }
}
