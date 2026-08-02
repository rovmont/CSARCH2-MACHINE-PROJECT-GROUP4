import { DECIMAL32, Q_MIN, Q_MAX } from '../types.js';
import { encodeDeclet } from '../dpd.js';

/**
 * @param {string} title
 * @param {string} text
 * @param {import('../types.js').StepVisual} [visual]
 * @returns {import('../types.js').ConversionStep}
 */
function step(title, text, visual) {
  return visual ? { title, text, visual } : { title, text };
}

/**
 * Hand-worked decimal32 conversion steps with visuals for the Convert UI.
 *
 * @param {import('../types.js').Decimal32Value} value
 * @param {{ originalForm?: string }} [opts]
 * @returns {import('../types.js').ConversionStep[]}
 */
export function explainEncodingProcess(value, opts = {}) {
  const steps = [];
  const signBit = value.sign === 1 ? '1' : '0';
  const signWord = value.sign === 1 ? 'negative' : 'positive';

  if (value.kind === 'nan') {
    const signal = value.signaling ? '1' : '0';
    const rem = signal + '0'.repeat(25);
    steps.push(
      step(
        'Special: NaN',
        'NaN is not encoded as significand × 10^e. Combination 11111 marks NaN.'
      )
    );
    steps.push(
      step(
        'Sign + combination',
        `Sign is ${signWord} → bit ${signBit}. Combination = 11111.`,
        {
          type: 'bitfields',
          sign: signBit,
          combination: '11111',
          expCont: rem.slice(0, 6),
          declet0: rem.slice(6, 16),
          declet1: rem.slice(16, 26),
          highlight: 'combination',
        }
      )
    );
    steps.push(
      step(
        'Payload bits',
        `Signaling bit = ${signal}; remaining bits are 0 in this canonical encoding.`,
        {
          type: 'bitfields',
          sign: signBit,
          combination: '11111',
          expCont: rem.slice(0, 6),
          declet0: rem.slice(6, 16),
          declet1: rem.slice(16, 26),
          highlight: 'expCont',
        }
      )
    );
    return steps;
  }

  if (value.kind === 'infinity') {
    steps.push(
      step(
        'Special: Infinity',
        'Infinity uses combination 11110. Exponent and coefficient continuation are all zeros.'
      )
    );
    steps.push(
      step(
        'Canonical Infinity layout',
        `Sign is ${signWord} → bit ${signBit}.`,
        {
          type: 'bitfields',
          sign: signBit,
          combination: '11110',
          expCont: '000000',
          declet0: '0000000000',
          declet1: '0000000000',
          highlight: 'combination',
        }
      )
    );
    return steps;
  }

  let coeff = parseInt(String(value.coefficient ?? '0'), 10);
  if (!Number.isFinite(coeff) || coeff < 0) coeff = 0;
  let exp = Number.isInteger(value.exponent) ? value.exponent : 0;

  steps.push(
    step(
      'decimal32 bit layout',
      `32 bits: 1 sign · 5 combination · 6 exponent continuation · 20 coefficient continuation (DPD). Bias = ${DECIMAL32.BIAS}.`,
      {
        type: 'bitfields',
        sign: 'S',
        combination: 'G₀…G₄',
        expCont: 'e′ low 6',
        declet0: 'declet 0',
        declet1: 'declet 1',
      }
    )
  );

  if (coeff === 0) {
    exp = Math.max(Q_MIN, Math.min(Q_MAX, exp));
  } else {
    while (exp > Q_MAX && coeff * 10 <= 9999999) {
      coeff *= 10;
      exp -= 1;
    }
    if (exp > Q_MAX) {
      steps.push(
        step(
          'Overflow → Infinity',
          `Plain exponent ${exp} is above ${Q_MAX}. Encode signed Infinity instead.`,
          {
            type: 'bitfields',
            sign: signBit,
            combination: '11110',
            expCont: '000000',
            declet0: '0000000000',
            declet1: '0000000000',
            highlight: 'combination',
          }
        )
      );
      return steps;
    }
    while (exp < Q_MIN && coeff % 10 === 0 && coeff !== 0) {
      coeff /= 10;
      exp += 1;
    }
    if (exp < Q_MIN) {
      steps.push(
        step(
          'Underflow → signed zero',
          `Plain exponent ${exp} is below ${Q_MIN}; flush to signed zero at Etiny.`
        )
      );
      coeff = 0;
      exp = Q_MIN;
    }
  }

  const coeffDigits = String(coeff).padStart(DECIMAL32.PRECISION, '0');
  const shown = `${value.sign === 1 ? '−' : ''}${coeff === 0 ? '0' : String(parseInt(coeffDigits, 10))} × 10^${exp}`;

  steps.push(
    step(
      'Working form',
      `Pad the significand to 7 digits: ${coeffDigits}.`,
      {
        type: 'digits',
        digits: coeffDigits,
        sign: /** @type {0|1} */ (value.sign ?? 0),
        exponent: exp,
        markMsd: true,
        groupRest: true,
      }
    )
  );

  const msd = Number(coeffDigits[0]);
  const rest = coeffDigits.slice(1);
  const g0 = rest.slice(0, 3);
  const g1 = rest.slice(3, 6);

  steps.push(
    step(
      'Split the significand',
      `MSD = ${msd} goes into the combination field. The other six digits split into two DPD groups.`,
      {
        type: 'digits',
        digits: coeffDigits,
        sign: /** @type {0|1} */ (value.sign ?? 0),
        exponent: exp,
        markMsd: true,
        groupRest: true,
      }
    )
  );

  steps.push(
    step(
      'Sign bit',
      `0 = positive, 1 = negative. Value is ${signWord} → ${signBit}.`,
      {
        type: 'bitfields',
        sign: signBit,
        combination: '·····',
        expCont: '······',
        declet0: '··········',
        declet1: '··········',
        highlight: 'sign',
      }
    )
  );

  const E = exp + DECIMAL32.BIAS;
  const expTop2 = (E >> 6) & 0b11;
  const expCont6 = E & 0b111111;
  const expTopBits = expTop2.toString(2).padStart(2, '0');
  const expContBits = expCont6.toString(2).padStart(6, '0');
  const Ebits = E.toString(2).padStart(8, '0');

  steps.push(
    step(
      'Biased exponent e′',
      `e′ = e + ${DECIMAL32.BIAS} = ${exp} + ${DECIMAL32.BIAS} = ${E}. Split into top 2 bits (combination) and low 6 bits (exponent continuation).`,
      {
        type: 'parts',
        parts: [
          { label: 'e′ (8 bits)', value: Ebits, tone: 'neutral' },
          { label: 'top 2 → combo', value: expTopBits, tone: 'combo' },
          { label: 'low 6 → exp cont', value: expContBits, tone: 'exp' },
        ],
      }
    )
  );

  let combination;
  if (msd <= 7) {
    const msd3 = msd.toString(2).padStart(3, '0');
    combination = expTopBits + msd3;
    steps.push(
      step(
        'Combination field (MSD 0…7)',
        `Pack top-2 of e′ with the 3-bit MSD: ${expTopBits} ∥ ${msd3}.`,
        {
          type: 'parts',
          parts: [
            { label: 'e′ top 2', value: expTopBits, tone: 'exp' },
            { label: 'MSD (3 bits)', value: msd3, tone: 'msd' },
            { label: 'combination', value: combination, tone: 'combo' },
          ],
        }
      )
    );
  } else {
    const msdLow = (msd - 8).toString(2);
    combination = '11' + expTopBits + msdLow;
    steps.push(
      step(
        'Combination field (MSD 8 or 9)',
        `Row starts with 11, then e′ top 2, then 0/1 for MSD 8/9.`,
        {
          type: 'parts',
          parts: [
            { label: 'prefix', value: '11', tone: 'combo' },
            { label: 'e′ top 2', value: expTopBits, tone: 'exp' },
            { label: 'MSD select', value: msdLow, tone: 'msd' },
            { label: 'combination', value: combination, tone: 'combo' },
          ],
        }
      )
    );
  }

  steps.push(
    step(
      'Exponent continuation',
      `Low six bits of e′ sit here: ${expContBits}.`,
      {
        type: 'bitfields',
        sign: signBit,
        combination,
        expCont: expContBits,
        declet0: '··········',
        declet1: '··········',
        highlight: 'expCont',
      }
    )
  );

  const declet1 = encodeDeclet(Number(g0[0]), Number(g0[1]), Number(g0[2]));
  const declet2 = encodeDeclet(Number(g1[0]), Number(g1[1]), Number(g1[2]));
  const declet1Bits = declet1.toString(2).padStart(10, '0');
  const declet2Bits = declet2.toString(2).padStart(10, '0');

  steps.push(
    step(
      'DPD coefficient continuation',
      'Each trio of decimal digits compresses into a 10-bit declet.',
      {
        type: 'dpd',
        group0: g0,
        group1: g1,
        declet0: declet1Bits,
        declet1: declet2Bits,
      }
    )
  );

  const bits = signBit + combination + expContBits + declet1Bits + declet2Bits;
  steps.push(
    step(
      'Assemble the 32-bit word',
      `Working form was ${shown}. Fields concatenate in order.`,
      {
        type: 'bitfields',
        sign: signBit,
        combination,
        expCont: expContBits,
        declet0: declet1Bits,
        declet1: declet2Bits,
      }
    )
  );

  void bits;
  void opts;
  return steps;
}
