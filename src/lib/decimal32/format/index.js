/**
 * Format helpers: display strings, DPD codec, encoding steps, UI result packing.
 */

export { spacedBinary, valueToDecimalString } from './display.js';
export { encodeDecimal32, decodeDecimal32 } from './codec.js';
export { explainEncodingProcess } from './explain.js';
export { packResult } from './pack.js';
export { step } from './step.js';