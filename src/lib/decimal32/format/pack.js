import { bitsToHex, stubConversionResult } from '../types.js';
import { encodeDecimal32, decodeDecimal32 } from './codec.js';
import { spacedBinary, valueToDecimalString } from './display.js';

/**
 * Build a ConversionResult for the UI once encode works.
 * @param {import('../types.js').Decimal32Value} value
 * @param {(string|import('../types.js').ConversionStep)[]} [steps]
 * @param {string[]} [flags]
 * @returns {import('../types.js').ConversionResult}
 */
export function packResult(value, steps = [], flags = []) {
  try {
    const bits = encodeDecimal32(value);
    const canonicalValue = decodeDecimal32(bits);
    return {
      value: canonicalValue,
      bits,
      spacedBinary: spacedBinary(bits),
      hex: bitsToHex(bits),
      decimal: valueToDecimalString(canonicalValue),
      steps,
      flags,
    };
  } catch {
    return stubConversionResult(
      'encodeDecimal32 failed while packing the conversion result.'
    );
  }
}
