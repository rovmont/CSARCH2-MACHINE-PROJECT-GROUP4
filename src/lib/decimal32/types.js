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

/** Plain exponent range for a 7-digit coefficient (Etiny … Qmax). */
export const Q_MIN = DECIMAL32.EMIN - (DECIMAL32.PRECISION - 1); // -101
export const Q_MAX = DECIMAL32.EMAX - (DECIMAL32.PRECISION - 1); // 90

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
 * @typedef {Object} BitFieldVisual
 * @property {'bitfields'} type
 * @property {string} sign
 * @property {string} combination
 * @property {string} expCont
 * @property {string} [coeffCont]
 * @property {string} [declet0]
 * @property {string} [declet1]
 * @property {'sign'|'combination'|'expCont'|'coeffCont'|null} [highlight]
 *
 * @typedef {Object} DigitsVisual
 * @property {'digits'} type
 * @property {string} digits - coefficient digits (may be longer than 7 before fitting)
 * @property {0|1} [sign]
 * @property {number} [exponent]
 * @property {boolean} [markMsd]
 * @property {boolean} [groupRest] - only meaningful for a 7-digit encoding view
 *
 * @typedef {Object} EquationVisual
 * @property {'equation'} type
 * @property {string} left
 * @property {string} right
 * @property {string} [note]
 *
 * @typedef {Object} PartsVisual
 * @property {'parts'} type
 * @property {{ label: string, value: string, tone?: string }[]} parts
 *
 * @typedef {Object} DpdVisual
 * @property {'dpd'} type
 * @property {string} group0
 * @property {string} group1
 * @property {string} declet0
 * @property {string} declet1
 *
 * @typedef {BitFieldVisual|DigitsVisual|EquationVisual|PartsVisual|DpdVisual} StepVisual
 *
 * @typedef {Object} ConversionStep
 * @property {string} title - short heading for the step card
 * @property {string} text - concise explanation
 * @property {StepVisual} [visual]
 *
 * @typedef {Object} ConversionResult
 * @property {Decimal32Value} value
 * @property {string} bits - 32-char binary string
 * @property {string} spacedBinary - fields: sign | combo(5) | expCont(6) | declet0(10) | declet1(10)
 * @property {string} hex - e.g. 0x225349B0
 * @property {string} decimal - human-readable decimal
 * @property {(string|ConversionStep)[]} steps - text and/or visual walkthrough for the UI
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
