import { packResult } from '../format/pack.js';
import { roundDigitString } from '../rounding.js';
import { DECIMAL32 } from '../types.js';

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

  const a = normalizeOperandOutput(aInput);
  const b = normalizeOperandOutput(bInput);

  steps.push(describe('A', a));
  steps.push(describe('B', b));

  const sign = (a.sign ^ b.sign);
  
  steps.push(`Result sign = sign(A) XOR sign(B) = ${a.sign} ⊕ ${b.sign} = ${sign ? '−' : '+'}.`);

  //Special Cases
  if (a.kind === 'nan' || b.kind === 'nan'){
    
    steps.push('At least one operand is NaN → result is NaN.');

    return packResult({ kind: 'nan', sign: 0 }, steps, flags);
  }

  const aInf = a.kind === 'infinity';
  const bInf = b.kind === 'infinity';
  const aZero = isZero(a);
  const bZero = isZero(b);

  if(aInf && bInf){
    
    flags.push('invalid');
    steps.push('∞ ÷ ∞ is undefined → NaN (invalid operation).');

    return packResult({ kind: 'nan', sign: 0 }, steps, flags);
  }
  if(aZero && bZero){
    
    flags.push('invalid');
    steps.push('0 ÷ 0 is undefined → NaN (invalid operation).');
    
    return packResult({ kind: 'nan', sign: 0 }, steps, flags);
  }
  if(aInf){
    steps.push('∞ ÷ finite → ∞.');
    return packResult({ kind: 'infinity', sign: 0 }, steps, flags);
  }
  if(bInf){
    const clampedValue = clampExp(a.exp - b.exp);
    
    steps.push(`finite ÷ ∞ → 0 (exponent clamped to ${clampedValue}).`);
    return packResult({ kind: 'zero', sign, exponent: clampedValue, coefficient: '0' }, steps, flags);
  }
  if(bZero){
    flags.push('divide-by-zero');
    steps.push('finite ÷ 0 → ∞ (divide-by-zero).');
    return packResult({ kind: 'infinity', sign }, steps, flags);
  }
  if(aZero){
    const clampedValue = clampExp(a.exp - b.exp);
    steps.push(`0 ÷ finite → 0. Exponent = clamp(eA − eB) = clamp(${a.exp} − ${b.exp}) = ${clampedValue}.`);
    
    return packResult({ kind: 'zero', sign, exponent: clampedValue, coefficient: '0' }, steps, flags);
  }

  
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  
  const cA = BigInt(a.coeff);
  const cB = BigInt(b.coeff);
  
  const idealExp = a.exp - b.exp;
  
  steps.push(`Ideal (exact) exponent = eA − eB = ${a.exp} − ${b.exp} = ${idealExp}.`);
  steps.push(`Divide coefficients ${cA} ÷ ${cB}, scaling to obtain ${PRECISION + 1} significant digits.`);

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

  const q = num / den;
  const r = num % den;  //Remainder

  const sticky = r !== 0n;
  const guardExp = idealExp - s; //Exponent of the 8-digit quotient
  const qStr = q.toString(); //No leading zero

  steps.push(
    `Long division → ${qStr} × 10^${guardExp}` +
    (sticky ? ', nonzero remainder (sticky = 1).' : ', remainder 0 (exact so far).')
  );

  const feed = sticky ? qStr + '1' : qStr;
  const rounding = roundDigitString(feed, PRECISION, mode, sign, 'decimal');

  for(const st of rounding.steps){
    steps.push(st);
  }

  let coeffStr = rounding.digits;
  let exp = guardExp + 1;  //Guard digit is dropped so up by one

  while (coeffStr.length > PRECISION){
    coeffStr = coeffStr.slice(0, -1);
    exp += 1;
  }

  const inexact = rounding.changed;
  
  if(inexact){
    flags.push('inexact');
  }

  
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


  const adjExp = exp + (coeffStr.length - 1);

  if(adjExp > DECIMAL32.EMAX){
    
    flags.push('overflow', 'inexact');
    steps.push(`Adjusted exponent ${adjExp} > Emax ${DECIMAL32.EMAX} → overflow → ±∞.`);
    
    return packResult({ kind: 'infinity', sign }, steps, flags);
  }
  
  if(adjExp < DECIMAL32.EMIN){
    
    flags.push('underflow');
    steps.push(`Adjusted exponent ${adjExp} < Emin ${DECIMAL32.EMIN} → subnormal; fold to tiny = ${Q_MIN}.`);
    
    const drop = Q_MIN - exp;

    if(drop > 0){    //Rounded here again because denormalizig ends up messing with the sticky digits
      const sub = roundDigitString(coeffStr, Math.max(0, coeffStr.length - drop), mode, sign, 'decimal');

      for(const st of sub.steps){
        steps.push(st);
      }

      coeffStr = sub.digits || '0';

      if(sub.changed){
        flags.push('inexact');
      }

      exp = Q_MIN;

      while (coeffStr.length > PRECISION){
        coeffStr = coeffStr.slice(0, -1);
        exp += 1;
      }
    }

    if(/^0*$/.test(coeffStr)){
      steps.push('Subnormal rounding collapsed to zero.');
      return packResult({ kind: 'zero', sign, exponent: Q_MIN, coefficient: '0' }, steps, flags);
    }
  }

  exp = clampExp(exp);

  const divisionResult = {
    kind: 'finite',
    sign,
    coefficient: coeffStr,
    exponent: exp,
  };

  steps.push(`Final result: ${sign ? '−' : ''}${coeffStr} × 10^${exp}.`);

  return packResult(finalResult, steps, flags);
  

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
}

  function isZero(o){
    return o.kind === 'zero' || (o.kind === 'finite' && /^0*$/.test(o.coeff));
  }

  function clampExp(e){
    return Math.max(Q_MIN, Math.min(Q_MAX, e));
  }

  function describe(name, o){
    
    if (o.kind === 'nan'){
      return `Input ${name}: NaN.`;
    }
    if (o.kind === 'infinity'){ 
      return `Input ${name}: ${o.sign ? '−' : '+'}∞.`;
    }
    
    return `Input ${name}: sign ${o.sign ? '−' : '+'}, coefficient ${o.coeff}, exponent ${o.exp}.`;
  }
