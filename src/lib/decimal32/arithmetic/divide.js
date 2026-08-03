import { packResult } from '../format/pack.js';
import { roundDigitString } from '../rounding.js';
import { DECIMAL32, Q_MIN, Q_MAX } from '../types.js';
import { step } from '../format/step.js';

/**
 * OWNER: Teoxon, Jat (Feature 3b — Division)
 *
 * Inputs: decimal or IEEE hex operands (parsed via parseArithmeticOperand), operation,
 * rounding method.
 * Outputs: step-by-step + decimal / spaced binary / hex (incl. specials).
 *
 * Wire-up: arithmetic.astro → divideDecimal32(a, b, mode).
 *
 * TODO(Jat): Implement divideDecimal32; return ConversionResult with steps.
 */

/**
 * @param {string|import('../types.js').Decimal32Value} aInput
 * @param {string|import('../types.js').Decimal32Value} bInput
 * @param {import('../rounding.js').RoundingMode} [mode]
 * @returns {import('../types.js').ConversionResult}
 */

const PRECISION = DECIMAL32.PRECISION; 

export function divideDecimal32(aInput, bInput, mode = 'ties-to-even') {
  // TODO(Jat): Compute A ÷ B in decimal32 with rounding + step trace.

  const steps = [];
  const flags = [];

  const a = normalizeOperand(aInput);
  const b = normalizeOperand(bInput);

  steps.push(
    step(
      'Read operands',
      `A: ${a.coeff}, exponent: ${a.exp}, B: ${b.coeff}, exponent: ${b.exp}`,
      
      {  type: 'parts',
        parts: [
          { label: 'A', value: partValue(a), tone: 'msd'},
          { label: 'B', value: partValue(b), tone: 'exp'},
        ],
      }
    )
  );

  const sign = (a.sign ^ b.sign);
  
  steps.push(
    step(
      'Determine sign', `sign(A) XOR sign(B) = ${a.sign} XOR ${b.sign} = ${sign ? '-' : '+'}`
    )
  );

  //Special Cases
  if (a.kind === 'nan' || b.kind === 'nan'){
    const nan = a.kind === 'nan' ? a : b;
    
    steps.push(step('NaN operand', 'Result is just NaN'));

    return packResult({ kind: 'nan', sign: nan.sign }, steps, ['nan']);
  }

  const aInf = a.kind === 'infinity';
  const bInf = b.kind === 'infinity';
  const aZero = isZero(a);
  const bZero = isZero(b);

  if(aInf && bInf){
    
    flags.push('invalid');
    steps.push(step('division between two infinities', '∞ ÷ ∞ is undefined → NaN (invalid operation).'));

    return packResult({ kind: 'nan', sign: 0 }, steps, flags);
  }
  if(aZero && bZero){
    
    flags.push('invalid');
    steps.push(step('division by zero', '0 ÷ 0 is undefined → NaN (invalid operation).'));
    
    return packResult({ kind: 'nan', sign: 0 }, steps, flags);
  }
  if(aInf){
    steps.push(step('∞ ÷ finite', 'Infinity divided by any finite number is infinity'));
    return packResult({ kind: 'infinity', sign: 0 }, steps, flags);
  }
  if(bInf){
    const q = clampExp(a.exp - b.exp);
    
    steps.push(step('finite ÷ ∞', `A finite number divided by infinity is zero (exponent clamped to ${q}).`));
    return packResult({ kind: 'zero', sign, exponent: q, coefficient: '0' }, steps, flags);
  }
  if(bZero){
    flags.push('divide-by-zero');
    steps.push(step('finite ÷ 0', 'A nonzero finite number divided by zero is infinity (divide-by-zero).'));
    return packResult({ kind: 'infinity', sign }, steps, flags);
  }
  if(aZero){
    const q = clampExp(a.exp - b.exp);
    steps.push(step('0 ÷ finite', `Zero divided by a finite number is zero. Exponent = clamp(${a.exp} − ${b.exp}) = ${q}.`));
    
    return packResult({ kind: 'zero', sign, exponent: q, coefficient: '0' }, steps, flags);
  }

  
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  
  const cA = BigInt(a.coeff);
  const cB = BigInt(b.coeff);
  const idealExp = a.exp - b.exp;
  
  steps.push(
    step(
      'Set up division',
      `A/B = (cA/cB) × 10^(eA − eB). Ideal exponent = ${a.exp} − ${b.exp} = ${idealExp}.`,
      { type: 'equation',
        left: `${cA} ÷ ${cB}`,
        right: `scale to ${PRECISION + 1} significant digits`,
        note: 'One guard digit beyond the 7 kept lets us round correctly.',
      }
    )
  );

  const LOW = 10n ** BigInt(PRECISION); //10^7
  const HIGH = 10n ** BigInt(PRECISION + 1); //10^8
  let num = cA;
  let den = cB;
  let s = 0;

  while (num < den * LOW){
    num *= 10n; 
    s += 1; 
  }

  while (num >= den * HIGH){
    den *= 10n;
    s -= 1;
  }

  const q = num / den;  //Bigint, floor
  const r = num % den;  //Remainder

  const sticky = r !== 0n;
  const guardExp = idealExp - s; //Exponent of the 8-digit quotient
  const qStr = q.toString(); //No leading zero

  steps.push(
    step(
      'Long division',
      `${qStr} x 10^${guardExp}` + (sticky ? ', nonzero remainder (sticky = 1).' : ', remainder 0 (exact so far).'),
      { type: 'digits', digits: qStr, sign, exponent: guardExp }
    )
  );

  const feed = sticky ? qStr + '1' : qStr;
  const rounding = roundDigitString(feed, PRECISION, mode, sign, 'decimal');

  for(const st of rounding.steps){
    steps.push(st);
  }

  let coeffStr = rounding.digits;
  let exp = guardExp + 1;  //Guard digit is dropped so up by one

  //Carry outs
  while (coeffStr.length > PRECISION){
    coeffStr = coeffStr.slice(0, -1);
    exp += 1;
  }

  //In case if guard digit or sticky is nonzero
  const inexact = rounding.changed;
  if(inexact){
    flags.push('inexact');
  } else {
    const before = exp;
    
    while(exp < idealExp && coeffStr.length > 1 && coeffStr.endsWith('0')){
      coeffStr = coeffStr.slice(0, -1);
      exp += 1;
    }

    if(exp !== before){
      steps.push(step('Canonical form', `Exact result: trimmed trailing zeros toward ideal exponent → ${coeffStr} × 10^${exp}.`));
    }
  }

  
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const divisionResult = {
    kind: coeffStr === '0' ? 'zero' : 'finite',
    sign,
    coefficient: coeffStr,
    exponent: exp,
  };

  steps.push(
    step(
      'Final result',
      `${sign ? '-' : ''}${coeffStr} x 10^${exp}`,
      {  type: 'parts',
         parts: [
           { label: 'Sign', value: sign ? '-' : '+', tone: 'msd'},
           { label: 'Coefficient', value: coeffStr, tone: 'combo'},
           { label: 'Exponent', value: String(exp), tone: 'exp'},
         ],
      }
    )
  );

  const result = packResult(divisionResult, steps, flags);

  if(divisionResult.kind === 'finite' && result.value.kind === 'infinity'){
    result.flags.push('overflow', 'inexact');
    result.steps.push(step('Overflow', 'Value exceeds decimal32 range; rounded to infinity'));
  } else if(divisionResult.kind === 'finite' && result.value.kind === 'zero'){
    result.flags.push('underflow');
    result.steps.push(step('Underflow', 'Value is too small to represent in decimal32; rounded to zero'));
  }

  return result;
}

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // --------------------     HELPERS     -------------------- //

function normalizeOperand(v){
    
  const kind = v.kind ?? (v.coefficient && BigInt(v.coefficient) !== 0n ? 'finite' : 'zero');
  return {
    kind,
    sign: (v.sign === 1 ? 1 : 0),
    exp: v.exponent ?? 0,
    coeff: v.coefficient ?? '0',
  };
}

function isZero(o){
  return o.kind === 'zero' || (o.kind === 'finite' && /^0*$/.test(o.coeff));
}

function clampExp(e){
  return Math.max(Q_MIN, Math.min(Q_MAX, e));
}

function partValue(o){
  if(o.kind === 'nan'){
    return 'NaN';
  }
  if(o.kind === 'infinity'){
    return `${o.sign ? '−' : '+'}∞`;
  }

  return `${o.sign ? '−' : ''}${o.coeff} × 10^${o.exp}`;
}
