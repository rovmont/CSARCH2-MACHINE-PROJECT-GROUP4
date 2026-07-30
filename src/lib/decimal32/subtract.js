import { stubConversionResult } from './types.js';

/**
 * OWNER: Luna, Jacoba (Feature 3a — Subtraction)
 *
 * Spec: Subtract two operands (decimal or IEEE hex). Apply a rounding method.
 * Output step-by-step solution and final result in decimal, spaced binary, and hex
 * (including special cases).
 *
 * Wire-up: src/pages/arithmetic.astro calls subtractDecimal32(a, b, mode) when
 * operation === "subtract".
 *
 * Suggested approach:
 * 1. Reuse parseDecimalInput / decode from Feature 1 (Justin) for operands.
 * 2. Handle specials first (NaN, ±Inf combinations).
 * 3. Align exponents, subtract signed coefficients, then fitToDecimal32 with `mode`
 *    (Jillianne’s roundDigitString / Justin’s fit helper).
 *
 * TODO(Jacoba): Implement subtractDecimal32 fully; return ConversionResult-shaped object
 * with a detailed `steps` array for the UI.
 */

/**
 * @param {string|import('./types.js').Decimal32Value} aInput
 * @param {string|import('./types.js').Decimal32Value} bInput
 * @param {import('./rounding.js').RoundingMode} [mode]
 * @returns {import('./types.js').ConversionResult}
 */
export function subtractDecimal32(aInput, bInput, mode = 'ties-to-even') {
  // TODO(Jacoba): Compute A − B in decimal32 with rounding + step trace.
  void aInput;
  void bInput;
  void mode;
  return stubConversionResult(
    'TODO(Jacoba): Implement subtractDecimal32 in subtract.js — parse operands, handle specials, align exponents, subtract, round, pack decimal/binary/hex + steps.'
  );
}
