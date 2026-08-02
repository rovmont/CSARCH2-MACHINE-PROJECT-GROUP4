/**
 * Public barrel for decimal32 modules.
 * UI pages import from here; feature owners work in the folders below.
 *
 * | Path                 | Owner              | Responsibility                          |
 * |----------------------|--------------------|-----------------------------------------|
 * | types.js             | shared             | Constants + result shapes (keep stable) |
 * | dpd.js               | Justin             | DPD declet encode/decode                |
 * | format/              | Justin             | Display, codec, explain steps, pack     |
 * | convert/             | Justin             | Parse + fit + convertToDecimal32        |
 * | rounding.js          | Jillianne          | Four rounding modes + demo API          |
 * | arithmetic/          | Jacoba / Jat       | Operands, subtract, divide              |
 */

export { DECIMAL32, Q_MIN, Q_MAX, bitsToHex, toBinary, stubConversionResult } from './types.js';
export { encodeDeclet, decodeDeclet } from './dpd.js';
export {
  spacedBinary,
  encodeDecimal32,
  decodeDecimal32,
  valueToDecimalString,
  packResult,
  explainEncodingProcess,
} from './format/index.js';
export { parseDecimalInput, fitToDecimal32, convertToDecimal32 } from './convert/index.js';
export {
  parseArithmeticOperand,
  subtractDecimal32,
  divideDecimal32,
} from './arithmetic/index.js';
export {
  roundDigitString,
  demonstrateRounding,
  ROUNDING_MODES,
} from './rounding.js';
