import { DECIMAL32 } from '../types.js';
import { packResult } from '../format/pack.js';
import { explainEncodingProcess } from '../format/explain.js';
import { roundDigitString } from '../rounding.js';
import { parseDecimalInput } from './parse.js';

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
      `The input is first viewed in scientific form as ${signPrefix}${scientificSig} × 10^${scientificExp}. ` +
        `Significand in decimal? Yes. Base-10? Yes. Normalized to 7 whole digits? No. ` +
        `Rewrite by moving the radix point to get an integer significand: ${signPrefix}${digits} × 10^${exponent}.`
    );
  } else if (digits !== '0') {
    steps.push(
      `Take the decimal value as ${signPrefix}${digits} × 10^${exponent}. ` +
        `Significand in decimal? Yes. Base-10? Yes. ` +
        (digits.length === maxDigits
          ? 'Normalized to 7 whole digits? Yes.'
          : `The significand currently has ${digits.length} digit(s); the encoding field will use a 7-digit coefficient (with leading zeros if needed).`)
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
      `The significand has more than 7 whole digits (${before}). ` +
        `decimal32 only stores 7 coefficient digits, so reduce it to ${digits} using round-to-nearest, ties-to-even, ` +
        `and raise the power of ten by ${expAdj}. Normalized form: ${signPrefix}${digits} × 10^${exponent}.`
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
      steps: [`Error: ${err.message}`],
      flags: ['error'],
    };
  }
}
