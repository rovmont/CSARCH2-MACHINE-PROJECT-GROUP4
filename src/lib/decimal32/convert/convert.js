import { DECIMAL32 } from '../types.js';
import { packResult } from '../format/pack.js';
import { explainEncodingProcess } from '../format/explain.js';
import { roundDigitString } from '../rounding.js';
import { parseDecimalInput } from './parse.js';

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
 * Fit an arbitrary-precision finite value into decimal32 (7 digits).
 * Precision fitting uses Jillianne's shared roundDigitString from rounding.js.
 *
 * @param {import('../types.js').Decimal32Value} parsed
 * @param {import('../rounding.js').RoundingMode} [mode]
 * @param {{ sourceText?: string }} [opts]
 * @returns {import('../types.js').ConversionResult}
 */
export function fitToDecimal32(parsed, mode = 'ties-to-even', opts = {}) {
  if (parsed.kind === 'nan' || parsed.kind === 'infinity') {
    return packResult(parsed, explainEncodingProcess(parsed, { originalForm: opts.sourceText }));
  }

  /** @type {import('../types.js').ConversionStep[]} */
  const steps = [];
  const maxDigits = DECIMAL32.PRECISION;
  let digits = String(parsed.coefficient ?? '0').replace(/^0+(?=\d)/, '') || '0';
  let exponent = parsed.exponent ?? 0;
  const sign = /** @type {0|1} */ (parsed.sign ?? 0);
  const signPrefix = sign ? '−' : '';
  const source = opts.sourceText ? String(opts.sourceText).trim() : '';

  if (digits !== '0' && /[.]/.test(source) && digits.length <= maxDigits) {
    const scientificExp = exponent + (digits.length - 1);
    const scientificSig =
      digits.length === 1 ? digits : `${digits[0]}.${digits.slice(1)}`;
    steps.push(
      step(
        'Normalize the input',
        'Scientific form is rewritten into an integer significand × 10^e (7 whole digits when possible).',
        {
          type: 'equation',
          left: `${signPrefix}${scientificSig} × 10^${scientificExp}`,
          right: `${signPrefix}${digits} × 10^${exponent}`,
          note: 'Move the radix point → integer coefficient',
        }
      )
    );
  } else if (digits !== '0') {
    const encodingReady = digits.length === maxDigits;
    const tooLong = digits.length > maxDigits;
    let text;
    if (tooLong) {
      text = `Significand has ${digits.length} digits. decimal32 only stores 7 coefficient digits, so the next step rounds it down.`;
    } else if (encodingReady) {
      text = 'Already 7 whole digits — ready for the bit fields.';
    } else {
      text = `Significand has ${digits.length} digit(s); the encoding field will pad to 7 digits with leading zeros.`;
    }
    steps.push(
      step('Start from decimal form', text, {
        type: 'digits',
        // Show the full parsed coefficient — never truncate here.
        digits: tooLong ? digits : digits.padStart(maxDigits, '0'),
        sign,
        exponent,
        markMsd: encodingReady,
        groupRest: encodingReady,
      })
    );
  }

  if (digits.length > maxDigits) {
    const before = digits;
    const beforeLen = before.length;
    const rounded = roundDigitString(before, maxDigits, mode, sign, 'decimal');

    let fitted = rounded.digits.replace(/^0+(?=\d)/, '') || '0';
    let expAdj = beforeLen - maxDigits;
    if (fitted.length > maxDigits) {
      const extra = fitted.length - maxDigits;
      fitted = fitted.slice(0, maxDigits);
      expAdj += extra;
    }

    digits = fitted;
    exponent += expAdj;
    steps.push(
      step(
        'Fit to 7 digits',
        `Round-to-nearest, ties-to-even; raise the power of ten by ${expAdj}.`,
        {
          type: 'equation',
          left: `${signPrefix}${before} × 10^${exponent - expAdj}`,
          right: `${signPrefix}${digits} × 10^${exponent}`,
          note: 'decimal32 stores only 7 coefficient digits',
        }
      )
    );
  }

  const value = {
    kind: digits === '0' ? 'zero' : 'finite',
    sign,
    coefficient: digits,
    exponent,
  };

  return packResult(
    value,
    [...steps, ...explainEncodingProcess(value, { originalForm: source || undefined })]
  );
}

/**
 * Feature 1 entry point used by the Convert page.
 * @param {string} input
 * @returns {import('../types.js').ConversionResult}
 */
export function convertToDecimal32(input) {
  try {
    return fitToDecimal32(parseDecimalInput(input), 'ties-to-even', { sourceText: input });
  } catch (err) {
    return {
      value: { kind: 'nan', sign: 0 },
      bits: '0'.repeat(32),
      spacedBinary: '0 00000 000000 0000000000 0000000000',
      hex: '0x00000000',
      decimal: 'Error',
      steps: [{ title: 'Error', text: err.message }],
      flags: ['error'],
    };
  }
}
