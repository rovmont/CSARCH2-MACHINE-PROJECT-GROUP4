/**
 * OWNER: Go, Justin (Feature 1 — DPD packing)
 *
 * Densely Packed Decimal: pack/unpack 3 decimal digits <-> 10-bit declet.
 * Spec/reference: IEEE 754 DPD / Cowlishaw tables.
 *
 * TODO(Justin): Implement encodeDeclet and decodeDeclet using the DPD mapping
 * tables (small digits 0–7 vs large digits 8–9). These are building blocks for
 * encodeDecimal32 / decodeDecimal32 in format.js.
 */

/**
 * Encode three digits (each 0–9) into a 10-bit DPD value (0..1023).
 * @param {number} d2 - hundreds digit of the triplet
 * @param {number} d1 - tens digit
 * @param {number} d0 - ones digit
 * @returns {number}
 */
export function encodeDeclet(d2, d1, d0) {
  // TODO(Justin): Map (d2,d1,d0) → 10-bit DPD integer per IEEE 754 DPD rules.
  void d2;
  void d1;
  void d0;
  throw new Error('TODO(Justin): encodeDeclet not implemented — see dpd.js');
}

/**
 * Decode a 10-bit DPD value into three decimal digits.
 * @param {number} declet - 0..1023
 * @returns {[number, number, number]} [d2, d1, d0]
 */
export function decodeDeclet(declet) {
  // TODO(Justin): Inverse of encodeDeclet.
  void declet;
  throw new Error('TODO(Justin): decodeDeclet not implemented — see dpd.js');
}
