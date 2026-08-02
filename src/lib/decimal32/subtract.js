import { stubConversionResult } from './types.js';

/**
 * OWNER: Luna, Jacoba (Feature 3a — Subtraction)
 *
 * Inputs: decimal or IEEE hex operands (parsed via parseArithmeticOperand), operation,
 * rounding method.
 * Outputs: step-by-step + decimal / spaced binary / hex.
 *
 * Wire-up: arithmetic.astro → subtractDecimal32(a, b, mode).
 *
 * TODO(Jacoba): Implement subtractDecimal32; return ConversionResult with steps.
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
