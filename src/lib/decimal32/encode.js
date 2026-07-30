// encode.js
import { stubConversionResult, DECIMAL32 } from './types.js';
import { packResult, decodeDecimal32 } from './format.js';

/**
 * OWNER: Go, Justin (Feature 1 — Convert page)
 *
 * Spec: Convert a decimal number to IEEE 754 decimal32 (DPD).
 * Output: specials + binary with spacing + hexadecimal (+ steps for teaching UI).
 *
 * Wire-up: src/pages/convert.astro already calls convertToDecimal32(input).
 *
 * TODO(Justin):
 * 1. parseDecimalInput — accept decimal (incl. sci notation), ±Inf, NaN, hex, 32-bit binary.
 * 2. fitToDecimal32 — normalize to 7 digits + exponent; apply rounding (import from rounding.js
 *    once Jillianne finishes; until then you may temporarily chop / use ties-to-even yourself).
 * 3. convertToDecimal32 — public API for the Convert page; return ConversionResult via packResult.
 * 4. Cover specials: ±0, ±Inf, NaN, overflow → Inf, underflow → 0 / subnormal path.
 */

/**
 * Validate that input contains only a valid decimal number
 * @param {string} input - The input string to validate
 * @throws {SyntaxError} If input contains invalid characters
 */
function validateDecimalInput(input) {
  const trimmed = input.trim();
  
  // Allow: optional sign, digits, optional decimal point with digits
  // Decimal format: [+-]?digits[.digits] or [+-]?.digits
  const decimalPattern = /^[+-]?(\d+\.?\d*|\.\d+)$/;
  
  // Special values (case insensitive)
  const specialPattern = /^[+-]?(infinity|inf|nan|snan)$/i;
  
  // Check for special values (Infinity, NaN)
  if (specialPattern.test(trimmed)) {
    return; // Valid special value
  }
  
  // Check if it's a valid decimal number
  if (!decimalPattern.test(trimmed)) {
    // Check for invalid characters
    const invalidChars = input.replace(/[+\-0-9.]/g, '');
    if (invalidChars.length > 0) {
      throw new SyntaxError(
        `Invalid character(s) in input: "${invalidChars}". Only digits, decimal point, and optional sign are allowed.`
      );
    }
  }
  
  // Additional validation: prevent multiple decimal points
  const decimalCount = (trimmed.match(/\./g) || []).length;
  if (decimalCount > 1) {
    throw new SyntaxError('Invalid input: multiple decimal points found.');
  }
  
  // Prevent multiple signs
  const signCount = (trimmed.match(/[+-]/g) || []).length;
  if (signCount > 1) {
    throw new SyntaxError('Invalid input: multiple sign symbols found.');
  }
  
  // Prevent sign in wrong position
  if (trimmed.includes('+') && trimmed.indexOf('+') !== 0) {
    throw new SyntaxError('Invalid input: plus sign must be at the beginning.');
  }
  if (trimmed.includes('-') && trimmed.indexOf('-') !== 0) {
    throw new SyntaxError('Invalid input: minus sign must be at the beginning.');
  }
  
  // Check for empty input after validation
  if (trimmed === '' || trimmed === '+' || trimmed === '-' || trimmed === '.') {
    throw new SyntaxError('Invalid input: empty or incomplete number.');
  }
  
  // Check for decimal point with no digits on either side
  if (trimmed === '.' || trimmed === '+.' || trimmed === '-.') {
    throw new SyntaxError('Invalid input: decimal point with no digits.');
  }
}

/**
 * @param {string} input
 * @returns {import('./types.js').Decimal32Value}
 */
export function parseDecimalInput(input) {
  const trimmed = String(input).trim();
  if (trimmed === '') {
    throw new SyntaxError('parseDecimalInput: empty input');
  }

  // Validate input before processing
  validateDecimalInput(trimmed);

  // ±Infinity / Inf
  const infMatch = trimmed.match(/^([+-]?)(infinity|inf)$/i);
  if (infMatch) {
    return { kind: 'infinity', sign: infMatch[1] === '-' ? 1 : 0 };
  }

  // ±NaN / ±sNaN (signaling)
  const nanMatch = trimmed.match(/^([+-]?)(s)?nan$/i);
  if (nanMatch) {
    return { kind: 'nan', sign: nanMatch[1] === '-' ? 1 : 0, signaling: !!nanMatch[2] };
  }

  // Decimal number: [+-]digits[.digits]
  const numMatch = trimmed.match(/^([+-]?)(\d+)?(?:\.(\d+))?$/);
  if (!numMatch || (!numMatch[2] && !numMatch[3])) {
    throw new SyntaxError(`parseDecimalInput: could not parse "${input}" as a decimal32 value`);
  }

  const sign = numMatch[1] === '-' ? 1 : 0;
  const intPart = numMatch[2] || '0';
  const fracPart = numMatch[3] || '';

  // Validate that integer part doesn't have leading zeros (except for zero itself)
  if (intPart.length > 1 && intPart.startsWith('0')) {
    throw new SyntaxError('Invalid input: integer part cannot have leading zeros unless it is zero.');
  }

  const rawDigits = (intPart + fracPart).replace(/^0+(?=\d)/, '');
  const exponent = -fracPart.length;
  const coefficient = rawDigits === '' ? '0' : rawDigits;

  return {
    kind: coefficient === '0' ? 'zero' : 'finite',
    sign,
    coefficient,
    exponent,
  };
}

/**
 * Fit an arbitrary-precision finite value into decimal32 (7 digits).
 * @param {import('./types.js').Decimal32Value} parsed
 * @param {import('./rounding.js').RoundingMode} [mode]
 * @returns {import('./types.js').ConversionResult}
 */
export function fitToDecimal32(parsed, mode = 'ties-to-even') {
  if (parsed.kind === 'nan' || parsed.kind === 'infinity') {
    return packResult(parsed, [`${parsed.kind === 'nan' ? 'NaN' : 'Infinity'} passes through unchanged.`]);
  }

  const steps = [];
  const maxDigits = DECIMAL32.PRECISION;
  let digits = String(parsed.coefficient ?? '0');
  let exponent = parsed.exponent ?? 0;

  if (digits.length > maxDigits) {
    const before = digits;
    const rounded = roundDigitString(digits, maxDigits, mode);
    digits = rounded.digits;
    exponent += rounded.exponentAdjustment;
    steps.push(
      `Rounded coefficient ${before} (${before.length} digits) to ${digits} ` +
      `using "${mode}", adjusting exponent by +${rounded.exponentAdjustment}.`
    );
  }

  return packResult(
    { kind: digits === '0' ? 'zero' : 'finite', sign: parsed.sign, coefficient: digits, exponent },
    steps
  );
}

/**
 * Round a decimal digit string down to `keep` significant digits.
 *
 * TEMPORARY (Justin): Feature 2 (Jillianne, rounding.js) owns the shared
 * `roundDigitString` API with all four rounding methods. Until that lands,
 * this local helper covers 'chop' and 'ties-to-even' only, per the TODO note
 * in this file. Swap this out for an import from './rounding.js' once it
 * exists — the call site (above) will not need to change.
 *
 * @param {string} digitString - digits only, no sign, e.g. "123456789"
 * @param {number} keep - how many leading digits to keep
 * @param {'chop'|'ties-to-even'} mode
 * @returns {{ digits: string, exponentAdjustment: number }}
 */
function roundDigitString(digitString, keep, mode) {
  const dropped = digitString.length - keep;
  let kept = digitString.slice(0, keep);
  const remainder = digitString.slice(keep);
  let exponentAdjustment = dropped;

  if (mode === 'chop') {
    return { digits: stripLeadingZeros(kept), exponentAdjustment };
  }

  if (mode !== 'ties-to-even') {
    throw new Error(`roundDigitString: unsupported mode "${mode}" (only 'chop'/'ties-to-even' available until rounding.js lands)`);
  }

  // Ties-to-even (banker's rounding) on the first dropped digit.
  const firstDropped = Number(remainder[0] ?? '0');
  const restNonZero = /[1-9]/.test(remainder.slice(1));
  const roundUp =
    firstDropped > 5 ||
    (firstDropped === 5 && restNonZero) ||
    (firstDropped === 5 && !restNonZero && Number(kept[kept.length - 1]) % 2 === 1);

  if (roundUp) {
    const incremented = (BigInt(kept) + 1n).toString();
    if (incremented.length > kept.length) {
      // Carry overflowed digit count (e.g. "999" -> "1000"): drop the new
      // trailing digit (it's always 0) and bump the exponent once more.
      kept = incremented.slice(0, keep);
      exponentAdjustment += 1;
    } else {
      kept = incremented.padStart(keep, '0');
    }
  }

  return { digits: stripLeadingZeros(kept), exponentAdjustment };
}

function stripLeadingZeros(digits) {
  const stripped = digits.replace(/^0+(?=\d)/, '');
  return stripped === '' ? '0' : stripped;
}

/**
 * Feature 1 entry point used by the Convert page.
 * @param {string} input
 * @returns {import('./types.js').ConversionResult}
 */
export function convertToDecimal32(input) {
  try {
    return fitToDecimal32(parseDecimalInput(input), 'ties-to-even');
  } catch (err) {
    // Return a proper error result instead of stub
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