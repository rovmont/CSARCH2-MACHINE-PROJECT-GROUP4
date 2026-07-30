import { stubConversionResult } from './types.js';

/**
 * OWNER: Go, Justin (Feature 1 — Convert page)
 *
 * Spec: Convert a decimal number to IEEE 754 decimal32 (DPD).
 * Output: specials + binary with spacing + hexadecimal (+ steps for teaching UI).
 *
 * Wire-up: src/pages/convert.astro already calls convertToDecimal32(input).
 *
 * TODO(Justin):
 * 1. parseDecimalInput — accept decimal (incl. sci notation), ±Inf, NaN, hex, 32-bit binary.
 * 2. fitToDecimal32 — normalize to 7 digits + exponent; apply rounding (import from rounding.js
 *    once Jillianne finishes; until then you may temporarily chop / use ties-to-even yourself).
 * 3. convertToDecimal32 — public API for the Convert page; return ConversionResult via packResult.
 * 4. Cover specials: ±0, ±Inf, NaN, overflow → Inf, underflow → 0 / subnormal path.
 */

/**
 * @param {string} input
 * @returns {import('./types.js').Decimal32Value}
 */
export function parseDecimalInput(input) {
  // TODO(Justin): Parse user text into Decimal32Value (kind/sign/coefficient/exponent).
  void input;
  throw new Error('TODO(Justin): parseDecimalInput not implemented — see encode.js');
}

/**
 * Fit an arbitrary-precision finite value into decimal32 (7 digits).
 * @param {import('./types.js').Decimal32Value} parsed
 * @param {import('./rounding.js').RoundingMode} [mode]
 * @returns {import('./types.js').ConversionResult}
 */
export function fitToDecimal32(parsed, mode = 'ties-to-even') {
  // TODO(Justin): Round/clamp into decimal32 range, then packResult(...).
  void parsed;
  void mode;
  return stubConversionResult(
    'TODO(Justin): Implement fitToDecimal32 — normalize coefficient to 7 digits, adjust exponent, handle overflow/underflow/specials.'
  );
}

/**
 * Feature 1 entry point used by the Convert page.
 * @param {string} input
 * @returns {import('./types.js').ConversionResult}
 */
export function convertToDecimal32(input) {
  // TODO(Justin): return fitToDecimal32(parseDecimalInput(input), 'ties-to-even')
  void input;
  return stubConversionResult(
    'TODO(Justin): Implement convertToDecimal32 in encode.js (parse → fit → pack). Called by /convert/.'
  );
}
