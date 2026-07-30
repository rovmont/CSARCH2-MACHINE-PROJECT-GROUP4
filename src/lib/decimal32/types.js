/**
 * IEEE 754 decimal32 constants and shared result shapes (DPD encoding).
 * Keep these contracts stable so Feature 1–3 owners can plug in implementations.
 */

export const DECIMAL32 = {
  BITS: 32,
  PRECISION: 7,
  BIAS: 101,
  EMIN: -95,
  EMAX: 96,
  COMBINATION_BITS: 5,
  EXP_CONTINUATION_BITS: 6,
  SIGNIFICAND_CONTINUATION_BITS: 20,
};

/**
 * @typedef {'finite'|'zero'|'infinity'|'nan'} ValueKind
 *
 * @typedef {Object} Decimal32Value
 * @property {ValueKind} kind
 * @property {0|1} sign - 0 = +, 1 = -
 * @property {number} [exponent] - unbiased decimal exponent (for finite/zero)
 * @property {string} [coefficient] - up to 7 decimal digits as string (no sign)
 * @property {string} [payload] - optional NaN payload bits/digits
 *
 * @typedef {Object} ConversionResult
 * @property {Decimal32Value} value
 * @property {string} bits - 32-char binary string
 * @property {string} spacedBinary - fields: sign | combo(5) | expCont(6) | declet0(10) | declet1(10)
 * @property {string} hex - e.g. 0x225349B0
 * @property {string} decimal - human-readable decimal
 * @property {string[]} steps - step-by-step explanation for the UI
 * @property {string[]} flags - e.g. inexact, overflow, underflow
 */

/**
 * Placeholder result so pages render while logic is unfinished.
 * @param {string} ownerNote
 * @returns {ConversionResult}
 */
export function stubConversionResult(ownerNote) {
  return {
    value: { kind: 'nan', sign: 0 },
    bits: '0'.repeat(32),
    spacedBinary: '0 00000 000000 0000000000 0000000000',
    hex: '0x00000000',
    decimal: 'TODO',
    steps: [ownerNote],
    flags: ['not-implemented'],
  };
}

/**
 * @param {number|string} n
 * @param {number} width
 */
export function toBinary(n, width) {
  return BigInt(n).toString(2).padStart(width, '0').slice(-width);
}

/**
 * @param {string} bits32
 */
export function bitsToHex(bits32) {
  const clean = bits32.replace(/\s/g, '');
  const n = BigInt('0b' + clean);
  return '0x' + n.toString(16).toUpperCase().padStart(8, '0');
}
