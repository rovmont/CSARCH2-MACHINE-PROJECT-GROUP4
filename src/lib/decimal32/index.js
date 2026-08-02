/**
 * Public barrel for decimal32 modules.
 * UI pages import from here; feature owners implement the files listed below.
 *
 * | File            | Owner              | Responsibility                          |
 * |-----------------|--------------------|-----------------------------------------|
 * | types.js        | shared             | Constants + result shapes (keep stable) |
 * | dpd.js          | Justin             | DPD declet encode/decode                |
 * | format.js       | Justin             | Pack/unpack bits, hex, decimal string   |
 * | encode.js       | Justin             | Convert: decimal-only parse + fit       |
 * | operands.js     | shared (Feature 3) | Operand parse by UI format (decimal|hex) |
 * | rounding.js     | Jillianne          | Four rounding modes + demo API          |
 * | subtract.js     | Jacoba             | A − B with steps                        |
 * | divide.js       | Jat                | A ÷ B with steps                        |
 */

export { DECIMAL32, bitsToHex, toBinary, stubConversionResult } from './types.js';
export { encodeDeclet, decodeDeclet } from './dpd.js';
export {
  spacedBinary,
  encodeDecimal32,
  decodeDecimal32,
  valueToDecimalString,
  packResult,
} from './format.js';
export { parseDecimalInput, fitToDecimal32, convertToDecimal32 } from './encode.js';
export { parseArithmeticOperand } from './operands.js';
export {
  roundDigitString,
  demonstrateRounding,
  ROUNDING_MODES,
} from './rounding.js';
export { subtractDecimal32 } from './subtract.js';
export { divideDecimal32 } from './divide.js';
