import { bitsToHex, stubConversionResult, DECIMAL32 } from './types.js';
import { encodeDeclet, decodeDeclet } from './dpd.js';

// Valid plain-exponent range (q, as used in coefficient * 10^q), derived from
// the standard's Emin/Emax (which are the *adjusted*/scientific exponent):
//   Q_MIN (a.k.a. Etiny) = EMIN - (PRECISION - 1) = -101
//   Q_MAX                = EMAX - (PRECISION - 1) =   90
const Q_MIN = DECIMAL32.EMIN - (DECIMAL32.PRECISION - 1);
const Q_MAX = DECIMAL32.EMAX - (DECIMAL32.PRECISION - 1);

/**
 * OWNER: Go, Justin (Feature 1 — encode/decode + display formatting)
 *
 * decimal32 DPD bit layout (32 bits):
 *   [sign 1] [combination 5] [exp continuation 6] [declet0 10] [declet1 10]
 *
 * Parameters (see types.js DECIMAL32): 7 significand digits, bias 101,
 * emin -95, emax 96. Specials: ±0, ±Inf, NaN.
 *
 *
 * TODO(Justin):
 * 1. encodeDecimal32 — pack a Decimal32Value into a 32-bit binary string (use dpd.js).
 * 2. decodeDecimal32 — unpack IEEE hex / bit string into a Decimal32Value.
 * 3. valueToDecimalString — pretty-print a Decimal32Value for the UI.
 * 4. spacedBinary / packResult helpers once bits exist.
 */

/**
 * Format 32-bit string with field spacing for the UI.
 * @param {string} bits
 */
export function spacedBinary(bits) {
  const b = bits.replace(/\s/g, '').padStart(32, '0').slice(-32);
  return [
    b.slice(0, 1),
    b.slice(1, 6),
    b.slice(6, 12),
    b.slice(12, 22),
    b.slice(22, 32),
  ].join(' ');
}

/**
 * @param {import('./types.js').Decimal32Value} value
 * @returns {string}
 */
export function valueToDecimalString(value) {
  const negative = value.sign === 1;

  if (value.kind === 'nan') {
    const label = value.signaling ? 'sNaN' : 'NaN';
    return negative ? `-${label}` : label;
  }
  if (value.kind === 'infinity') {
    return negative ? '-Infinity' : 'Infinity';
  }

  // 'zero' and 'finite' both carry a coefficient + exponent.
  const digits = String(value.coefficient ?? '0').replace(/^0+(?=\d)/, '') || '0';
  const exponent = value.exponent ?? 0;

  let body;
  if (digits === '0') {
    body = exponent === 0 ? '0' : `0E${exponent >= 0 ? '+' : ''}${exponent}`;
  } else if (exponent >= 0) {
    body = digits + '0'.repeat(exponent);
  } else {
    const pointPos = digits.length + exponent; // position of decimal point from the left
    if (pointPos <= 0) {
      body = `0.${'0'.repeat(-pointPos)}${digits}`;
    } else {
      body = `${digits.slice(0, pointPos)}.${digits.slice(pointPos)}`;
    }
  }

  return negative ? `-${body}` : body;
}

/**
 * Pack Decimal32Value into 32-bit DPD encoding.
 * @param {import('./types.js').Decimal32Value} value
 * @returns {string} 32-bit binary string
 */
export function encodeDecimal32(value) {
  const sign = value.sign === 1 ? '1' : '0';

  if (value.kind === 'nan') {
    // combination = 11111; next bit distinguishes signaling(1)/quiet(0);
    // remaining 25 bits left as 0 (no diagnostic payload encoded).
    const signalBit = value.signaling ? '1' : '0';
    return sign + '11111' + signalBit + '0'.repeat(25);
  }
  if (value.kind === 'infinity') {
    // combination = 11110; canonical infinity has all remaining bits 0.
    return sign + '11110' + '0'.repeat(26);
  }

  // 'zero' and 'finite': both use a coefficient (possibly all-zero) + exponent.
  let coeff = parseInt(String(value.coefficient ?? '0'), 10);
  if (!Number.isFinite(coeff) || coeff < 0) coeff = 0;
  let exp = Number.isInteger(value.exponent) ? value.exponent : 0;

  if (coeff > 0) {
    const sigDigits = String(coeff).length;
    if (sigDigits > DECIMAL32.PRECISION) {
      throw new RangeError(
        `encodeDecimal32: coefficient has ${sigDigits} significant digits, ` +
        `exceeds decimal32's ${DECIMAL32.PRECISION} — round with fitToDecimal32 first.`
      );
    }
  }

  // Normalize exponent into the valid plain-exponent range [Q_MIN, Q_MAX] by
  // trading factors of ten between the coefficient and the exponent, without
  // changing the represented value.
  if (coeff === 0) {
    // Signed zero still carries a (clamped) exponent/cohort.
    exp = Math.max(Q_MIN, Math.min(Q_MAX, exp));
  } else {
    while (exp > Q_MAX && coeff * 10 <= 9999999) {
      coeff *= 10;
      exp -= 1;
    }
    if (exp > Q_MAX) {
      // True overflow: cannot bring the exponent into range without exceeding
      // 7 significant digits. Round to signed infinity.
      return sign + '11110' + '0'.repeat(26);
    }
    while (exp < Q_MIN && coeff % 10 === 0 && coeff !== 0) {
      coeff /= 10;
      exp += 1;
    }
    if (exp < Q_MIN) {
      // True underflow: cannot raise the exponent into range without losing
      // significant (non-zero) digits. Flush to signed zero.
      coeff = 0;
      exp = Q_MIN;
    }
  }

  const coeffDigits = String(coeff).padStart(DECIMAL32.PRECISION, '0');
  const msd = Number(coeffDigits[0]);
  const rest = coeffDigits.slice(1); // 6 digits -> two DPD declets
  const declet1 = encodeDeclet(Number(rest[0]), Number(rest[1]), Number(rest[2]));
  const declet2 = encodeDeclet(Number(rest[3]), Number(rest[4]), Number(rest[5]));

  const E = exp + DECIMAL32.BIAS; // biased 8-bit exponent field, valid range [0, 191]
  const expTop2 = (E >> 6) & 0b11;
  const expCont6 = E & 0b111111;

  let combination;
  if (msd <= 7) {
    // G0 G1 = top 2 exponent bits, G2 G3 G4 = 3-bit MSD (0-7)
    combination = expTop2.toString(2).padStart(2, '0') + msd.toString(2).padStart(3, '0');
  } else {
    // G0 G1 = '11', G2 G3 = top 2 exponent bits, G4 = MSD - 8 (0 or 1)
    combination = '11' + expTop2.toString(2).padStart(2, '0') + (msd - 8).toString(2);
  }

  const expContBits = expCont6.toString(2).padStart(6, '0');
  const declet1Bits = declet1.toString(2).padStart(10, '0');
  const declet2Bits = declet2.toString(2).padStart(10, '0');

  return sign + combination + expContBits + declet1Bits + declet2Bits;
}

/**
 * Unpack 32-bit DPD (binary string or hex) into Decimal32Value.
 * @param {string} bitsOrHex
 * @returns {import('./types.js').Decimal32Value}
 */
export function decodeDecimal32(bitsOrHex) {
  const bits = normalizeTo32Bits(bitsOrHex);

  const sign = bits[0] === '1' ? 1 : 0;
  const combo = bits.slice(1, 6);
  const expContBits = bits.slice(6, 12);
  const declet1Bits = bits.slice(12, 22);
  const declet2Bits = bits.slice(22, 32);

  if (combo === '11111') {
    return { kind: 'nan', sign, signaling: expContBits[0] === '1' };
  }
  if (combo === '11110') {
    return { kind: 'infinity', sign };
  }

  let msd;
  let expTop2;
  if (combo.slice(0, 2) !== '11') {
    expTop2 = parseInt(combo.slice(0, 2), 2);
    msd = parseInt(combo.slice(2, 5), 2);
  } else {
    expTop2 = parseInt(combo.slice(2, 4), 2);
    msd = 8 + parseInt(combo[4], 10);
  }

  const E = (expTop2 << 6) | parseInt(expContBits, 2);
  const exponent = E - DECIMAL32.BIAS;

  const [d1, d2, d3] = decodeDeclet(parseInt(declet1Bits, 2));
  const [d4, d5, d6] = decodeDeclet(parseInt(declet2Bits, 2));
  const coefficient = String(msd) + String(d1) + String(d2) + String(d3) + String(d4) + String(d5) + String(d6);
  const coeffValue = parseInt(coefficient, 10);

  return {
    kind: coeffValue === 0 ? 'zero' : 'finite',
    sign,
    coefficient: String(coeffValue),
    exponent,
  };
}

/**
 * Accept "0x" + 8 hex digits, bare 8 hex digits, or a 32-bit binary string
 * (spaces allowed, e.g. the output of spacedBinary) and return a plain
 * 32-character '0'/'1' string.
 * @param {string} input
 * @returns {string}
 */
function normalizeTo32Bits(input) {
  const trimmed = String(input).trim();

  const hexMatch = trimmed.match(/^(?:0x|0X)?([0-9a-fA-F]{8})$/);
  if (hexMatch) {
    return hexMatch[1]
      .split('')
      .map((c) => parseInt(c, 16).toString(2).padStart(4, '0'))
      .join('');
  }

  const clean = trimmed.replace(/\s/g, '');
  if (/^[01]{32}$/.test(clean)) {
    return clean;
  }

  throw new RangeError(
    `decodeDecimal32: expected "0x" + 8 hex digits, 8 bare hex digits, or a 32-bit binary string; got: ${input}`
  );
}

/**
 * Build a ConversionResult for the UI once encode works.
 * @param {import('./types.js').Decimal32Value} value
 * @param {string[]} [steps]
 * @param {string[]} [flags]
 * @returns {import('./types.js').ConversionResult}
 */
export function packResult(value, steps = [], flags = []) {
  // TODO(Justin): Prefer implementing via encodeDecimal32 + valueToDecimalString.
  // Temporary stub so callers do not crash before encode exists:
  try {
    const bits = encodeDecimal32(value);
    // Decode back so `value`/`decimal` reflect what was actually encoded
    // (encodeDecimal32 may normalize overflow -> Infinity or underflow -> 0,
    // and NaN/Infinity payloads are canonicalized) rather than echoing the
    // pre-normalization input.
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
      'TODO(Justin): Implement encodeDecimal32 / valueToDecimalString so packResult can fill bits, hex, and decimal.'
    );
  }
}