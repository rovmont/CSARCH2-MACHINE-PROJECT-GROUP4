import { DECIMAL32, Q_MIN, Q_MAX, bitsToHex } from '../types.js';
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
 * Final teaching step: regroup the 32-bit word into nibbles → hex.
 * @param {string} bits
 * @returns {import('../types.js').ConversionStep}
 */
function hexFromBitsStep(bits) {
  const clean = bits.replace(/\s/g, '').padStart(32, '0').slice(-32);
  const hex = bitsToHex(clean);
  const nibbles = [];
  for (let i = 0; i < 32; i += 4) nibbles.push(clean.slice(i, i + 4));
  const hexDigits = hex.replace(/^0x/i, '');
  return step(
    'Binary → hexadecimal',
    `Split the 32-bit word into eight groups of 4 bits (nibbles). Each nibble is one hex digit (0000=0 … 1111=F), so the encoding is ${hex}.`,
    {
      type: 'hex',
      bits: clean,
      hex,
      nibbles,
      hexDigits,
    }
  );
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
    const bits = signBit + '11111' + rem;
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
    steps.push(hexFromBitsStep(bits));
    return steps;
  }

  if (value.kind === 'infinity') {
    const bits = signBit + '11110' + '0'.repeat(26);
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
    steps.push(hexFromBitsStep(bits));
    return steps;
  }

  let coeff = parseInt(String(value.coefficient ?? '0'), 10);
  if (!Number.isFinite(coeff) || coeff < 0) coeff = 0;
  let exp = Number.isInteger(value.exponent) ? value.exponent : 0;

  const p = DECIMAL32.PRECISION;
  const bias = DECIMAL32.BIAS;

  steps.push(
    step(
      'decimal32 bit layout',
      `IEEE-754 decimal32 is 32 bits: 1 sign · 5 combination · 6 exponent continuation · 20 coefficient continuation (two 10-bit DPD declets). ` +
        `The 5-bit combination field is shared: for finite numbers it holds either (2 MSBs of the biased exponent e′ + 3 bits of the MSD) when MSD is 0…7, ` +
        `or the pattern 11 + (2 MSBs of e′) + (1 bit selecting MSD 8 or 9). The specials NaN and Infinity use combination 11111 and 11110.`,
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
      const bits = signBit + '11110' + '0'.repeat(26);
      steps.push(
        step(
          'Overflow → Infinity',
          `Plain exponent ${exp} is above Qmax = ${Q_MAX}. Encode signed Infinity instead.`,
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
      steps.push(hexFromBitsStep(bits));
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
          `Plain exponent ${exp} is below Qmin = ${Q_MIN}; flush to signed zero at Etiny.`
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
      `Pad the significand to ${p} digits: ${coeffDigits}. That is the coefficient field used by the bit layout.`,
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
  const msdBits4 = msd.toString(2).padStart(4, '0');

  steps.push(
    step(
      'Split the significand',
      `MSD = ${msd} (binary ${msdBits4}) goes into the combination field. The other six digits ${rest} split into DPD groups ${g0} and ${g1}.`,
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
      `Lecture rule: 0 = positive, 1 = negative. The value is ${signWord}, so the sign bit is ${signBit}.`,
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

  const E = exp + bias;
  const expTop2 = (E >> 6) & 0b11;
  const expCont6 = E & 0b111111;
  const expTopBits = expTop2.toString(2).padStart(2, '0');
  const expContBits = expCont6.toString(2).padStart(6, '0');
  const Ebits = E.toString(2).padStart(8, '0');

  steps.push(
    step(
      'Biased exponent e′',
      `Bias is ${bias} because the smallest plain exponent for a ${p}-digit coefficient is Qmin = ${Q_MIN}, and bias = −Qmin so e′ starts at 0. ` +
        `Here e′ = e + bias = ${exp} + ${bias} = ${E}. In 8 bits that is ${Ebits}. ` +
        `The top 2 bits (${expTopBits}) go into the combination field; the low 6 bits (${expContBits}) become the exponent-continuation field.`,
      {
        type: 'parts',
        parts: [
          { label: 'e (plain)', value: String(exp), tone: 'neutral' },
          { label: '+ bias', value: String(bias), tone: 'combo' },
          { label: 'e′', value: `${E} = ${Ebits}`, tone: 'exp' },
          { label: 'top 2', value: expTopBits, tone: 'combo' },
          { label: 'low 6', value: expContBits, tone: 'exp' },
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
        `For MSD 0…7 the combination packs (e′ top 2) then the three low bits of the MSD. ` +
          `MSD ${msd} → binary ${msdBits4}, so the three bits used are ${msd3}. ` +
          `Combination = ${expTopBits} ∥ ${msd3} = ${combination}.`,
        {
          type: 'parts',
          parts: [
            { label: 'MSD', value: `${msd} → ${msdBits4}`, tone: 'msd' },
            { label: 'e′ top 2', value: expTopBits, tone: 'exp' },
            { label: 'MSD low 3', value: msd3, tone: 'msd' },
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
        `For MSD 8 or 9 the row starts with 11, then e′ top 2, then one bit: 0 for 8, 1 for 9. ` +
          `MSD ${msd} → select bit ${msdLow}. Combination = 11 ∥ ${expTopBits} ∥ ${msdLow} = ${combination}.`,
        {
          type: 'parts',
          parts: [
            { label: 'MSD', value: String(msd), tone: 'msd' },
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
      `Place the low six bits of e′ here: ${expContBits}. Together with the two exponent bits already stored in the combination field, that rebuilds the full 8-bit e′ = ${Ebits}.`,
      {
        type: 'bitfields',
        sign: signBit,
        combination,
        expCont: expContBits,
        declet0: '··········',
        declet1: '··········',
        highlight: ['combination', 'expCont'],
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
      `Each group of three decimal digits compresses into a 10-bit densely-packed-BCD declet: ` +
        `${g0} → ${declet1Bits}, ${g1} → ${declet2Bits}.`,
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
      `Working form was ${shown}. Concatenate sign | combination | exp continuation | two declets.`,
      {
        type: 'bitfields',
        sign: signBit,
        combination,
        expCont: expContBits,
        declet0: declet1Bits,
        declet1: declet2Bits,
        highlight: 'coeffCont',
      }
    )
  );

  steps.push(hexFromBitsStep(bits));

  void opts;
  return steps;
}
