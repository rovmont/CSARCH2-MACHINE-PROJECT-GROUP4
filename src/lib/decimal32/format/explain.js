import { DECIMAL32, Q_MIN, Q_MAX } from '../types.js';
import { encodeDeclet } from '../dpd.js';
import { spacedBinary } from './display.js';

/**
 * Hand-worked decimal32 conversion steps aligned with the CSARCH lecture
 * (IEEE-754 decimal-32 format): normalize to 7 whole digits, then fill
 * sign / combination / exponent continuation / coefficient continuation.
 *
 * @param {import('../types.js').Decimal32Value} value
 * @param {{ originalForm?: string }} [opts]
 * @returns {string[]}
 */
export function explainEncodingProcess(value, opts = {}) {
  const steps = [];
  const signBit = value.sign === 1 ? '1' : '0';
  const signWord = value.sign === 1 ? 'negative' : 'positive';

  if (value.kind === 'nan') {
    steps.push(
      'Classify the value as NaN (Not a Number). In decimal32, NaN is not encoded as an ordinary significand × 10^e form.'
    );
    steps.push(
      'From the combination-field table, NaN uses combination = 11111. The sign bit may still be 0 or 1; ' +
        `here the sign is ${signWord}, so the sign bit is ${signBit}.`
    );
    const signal = value.signaling ? '1' : '0';
    steps.push(
      `After the combination field, the remaining 26 bits hold NaN payload / signaling information. ` +
        `This encoding uses signaling bit = ${signal} and zeros for the rest (canonical quiet/signaling pattern).`
    );
    steps.push(
      `Final field layout (sign | combination | remainder): ${signBit} 11111 ${signal}${'0'.repeat(5)} ${'0'.repeat(10)} ${'0'.repeat(10)}.`
    );
    return steps;
  }

  if (value.kind === 'infinity') {
    steps.push(
      'Classify the value as Infinity. Infinity is a special encoding, not a finite significand × 10^e.'
    );
    steps.push(
      'From the combination-field table, Infinity uses combination = 11110. ' +
        `The sign is ${signWord}, so the sign bit is ${signBit} (0 = +, 1 = −).`
    );
    steps.push(
      'The exponent continuation and coefficient continuation bits are set to 0 in the canonical Infinity encoding.'
    );
    steps.push(
      `Final field layout: ${signBit} 11110 000000 0000000000 0000000000.`
    );
    return steps;
  }

  let coeff = parseInt(String(value.coefficient ?? '0'), 10);
  if (!Number.isFinite(coeff) || coeff < 0) coeff = 0;
  let exp = Number.isInteger(value.exponent) ? value.exponent : 0;

  if (opts.originalForm) {
    steps.push(
      `IEEE-754 decimal32 is a 32-bit layout: 1 sign bit, 5 combination bits, 6 exponent-continuation bits, ` +
        `and 20 coefficient-continuation bits (the remaining 6 significand digits as densely-packed BCD). Bias = ${DECIMAL32.BIAS}.`
    );
  } else {
    steps.push(
      'IEEE-754 decimal floating-point uses base 10: the significand is decimal, and the power is a power of ten.'
    );
  }

  if (coeff === 0) {
    exp = Math.max(Q_MIN, Math.min(Q_MAX, exp));
  } else {
    while (exp > Q_MAX && coeff * 10 <= 9999999) {
      coeff *= 10;
      exp -= 1;
    }
    if (exp > Q_MAX) {
      steps.push(
        `After placing the value in significand × 10^e form, the exponent e = ${exp} exceeds the largest ` +
          `representable plain exponent (${Q_MAX} for the 7-digit form). That is overflow, so encode signed Infinity instead.`
      );
      steps.push(
        `Infinity: sign bit = ${signBit}, combination = 11110, remaining bits = 0 → ${signBit} 11110 000000 0000000000 0000000000.`
      );
      return steps;
    }
    while (exp < Q_MIN && coeff % 10 === 0 && coeff !== 0) {
      coeff /= 10;
      exp += 1;
    }
    if (exp < Q_MIN) {
      steps.push(
        `The exponent e = ${exp} is below the smallest plain exponent (${Q_MIN}). ` +
          'Without dropping nonzero digits we cannot raise e into range, so the value underflows to signed zero.'
      );
      coeff = 0;
      exp = Q_MIN;
    }
  }

  const coeffDigits = String(coeff).padStart(DECIMAL32.PRECISION, '0');
  const shown = `${value.sign === 1 ? '−' : ''}${coeff === 0 ? '0' : String(parseInt(coeffDigits, 10))} × 10^${exp}`;

  steps.push(
    `Working form for the bit fields: ${shown}. ` +
      `Use the 7-digit coefficient field ${coeffDigits} (leading zeros pad the significand when it has fewer than 7 digits).`
  );

  const msd = Number(coeffDigits[0]);
  const msdBits4 = msd.toString(2).padStart(4, '0');
  const rest = coeffDigits.slice(1);
  const g0 = rest.slice(0, 3);
  const g1 = rest.slice(3, 6);

  steps.push(
    `Identify the most-significant digit (MSD) of the 7-digit significand ${coeffDigits}: MSD = ${msd} ` +
      `(binary ${msdBits4}). The remaining six digits are ${rest}, which will later fill the coefficient continuation field ` +
      `as two 3-digit groups ${g0} and ${g1}.`
  );

  steps.push(
    `Determine the sign bit from the lecture rule: 0 → positive, 1 → negative. ` +
      `The value is ${signWord}, therefore the sign bit is ${signBit}.`
  );

  const E = exp + DECIMAL32.BIAS;
  const expTop2 = (E >> 6) & 0b11;
  const expCont6 = E & 0b111111;
  const expTopBits = expTop2.toString(2).padStart(2, '0');
  const expContBits = expCont6.toString(2).padStart(6, '0');
  const Ebits = E.toString(2).padStart(8, '0');

  steps.push(
    `Form the biased exponent used in the bit fields: e′ = e + bias = ${exp} + ${DECIMAL32.BIAS} = ${E}. ` +
      `In 8 bits that is ${Ebits}. The lecture places the two most-significant bits of e′ in the combination field ` +
      `(here ${expTopBits}; only 00, 01, or 10 are used for finite numbers) and the remaining six bits ` +
      `${expContBits} in the exponent continuation field. ` +
      `(For the 7-digit form, the usable plain exponents run from about ${Q_MIN} up to ${Q_MAX}; Emax/Emin in the format table are 96/−95 for the adjusted view.)`
  );

  let combination;
  if (msd <= 7) {
    const msd3 = msd.toString(2).padStart(3, '0');
    combination = expTopBits + msd3;
    steps.push(
      `Build the 5-bit combination field using the finite-number row for MSD 0…7. ` +
        `That row packs (two MSBs of e′) followed by the three low bits of the MSD. ` +
        `MSD ${msd} is in 0…7, so its three-bit form is ${msd3}. ` +
        `Combination = ${expTopBits} ∥ ${msd3} = ${combination}.`
    );
  } else {
    const msdLow = (msd - 8).toString(2);
    combination = '11' + expTopBits + msdLow;
    steps.push(
      `Build the 5-bit combination field using the finite-number row for MSD 8 or 9. ` +
        `That row starts with 11, then the two MSBs of e′, then one bit selecting 8 (0) or 9 (1). ` +
        `MSD ${msd} gives trailing bit ${msdLow}. ` +
        `Combination = 11 ∥ ${expTopBits} ∥ ${msdLow} = ${combination}.`
    );
  }

  steps.push(
    `Record the exponent continuation field as the low six bits of e′: ${expContBits}. ` +
      'Together with the two exponent bits already stored in the combination field, this reconstructs the full biased exponent e′.'
  );

  const declet1 = encodeDeclet(Number(g0[0]), Number(g0[1]), Number(g0[2]));
  const declet2 = encodeDeclet(Number(g1[0]), Number(g1[1]), Number(g1[2]));
  const declet1Bits = declet1.toString(2).padStart(10, '0');
  const declet2Bits = declet2.toString(2).padStart(10, '0');

  steps.push(
    `Fill the 20-bit coefficient continuation field. The MSD already sits in the combination field; ` +
      `the other six decimal digits are stored as densely-packed BCD (DPD): each group of three decimal digits ` +
      `compresses into a 10-bit declet. ` +
      `Group ${g0} (digits ${g0[0]}, ${g0[1]}, ${g0[2]}) → ${declet1Bits}. ` +
      `Group ${g1} (digits ${g1[0]}, ${g1[1]}, ${g1[2]}) → ${declet2Bits}. ` +
      `Concatenating those two declets gives the 20-bit coefficient continuation ${declet1Bits}${declet2Bits}.`
  );

  const bits = signBit + combination + expContBits + declet1Bits + declet2Bits;
  steps.push(
    `Concatenate the decimal32 fields in order — ` +
      `1 sign bit | 5 combination bits | 6 exponent-continuation bits | 20 coefficient-continuation bits: ` +
      `${signBit} | ${combination} | ${expContBits} | ${declet1Bits} | ${declet2Bits}.`
  );
  steps.push(
    `With spacing for readability (sign | combination | exponent continuation | coeff. continuation): ${spacedBinary(bits)}.`
  );

  return steps;
}
