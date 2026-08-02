/**
 * Decimal / scientific-notation parsing for Feature 1 convert input.
 */

/**
 * Collapse whitespace and normalize × / ⋅ to x for scientific forms.
 * @param {string} input
 */
function normalizeDecimalText(input) {
  return String(input)
    .trim()
    .replace(/\u00d7/g, 'x')
    .replace(/\u22c5/g, 'x')
    .replace(/\s+/g, ' ');
}

/**
 * Validate plain decimal / specials.
 * Scientific forms are validated by their own matchers in parseDecimalInput.
 * @param {string} input
 */
function validateDecimalInput(input) {
  const trimmed = input.trim();

  const decimalPattern = /^[+-]?(\d+\.?\d*|\.\d+)$/;
  const specialPattern = /^[+-]?(infinity|inf|nan|snan)$/i;

  if (specialPattern.test(trimmed)) {
    return;
  }

  if (!decimalPattern.test(trimmed)) {
    const invalidChars = input.replace(/[+\-0-9.]/g, '');
    if (invalidChars.length > 0) {
      throw new SyntaxError(
        `Invalid character(s) in input: "${invalidChars}". Only digits, decimal point, and optional sign are allowed.`
      );
    }
  }

  const decimalCount = (trimmed.match(/\./g) || []).length;
  if (decimalCount > 1) {
    throw new SyntaxError('Invalid input: multiple decimal points found.');
  }

  const signCount = (trimmed.match(/[+-]/g) || []).length;
  if (signCount > 1) {
    throw new SyntaxError('Invalid input: multiple sign symbols found.');
  }

  if (trimmed.includes('+') && trimmed.indexOf('+') !== 0) {
    throw new SyntaxError('Invalid input: plus sign must be at the beginning.');
  }
  if (trimmed.includes('-') && trimmed.indexOf('-') !== 0) {
    throw new SyntaxError('Invalid input: minus sign must be at the beginning.');
  }

  if (trimmed === '' || trimmed === '+' || trimmed === '-' || trimmed === '.') {
    throw new SyntaxError('Invalid input: empty or incomplete number.');
  }

  if (trimmed === '.' || trimmed === '+.' || trimmed === '-.') {
    throw new SyntaxError('Invalid input: decimal point with no digits.');
  }
}

/**
 * Build coefficient + exponent from mantissa parts and a power-of-ten.
 * @param {0|1} sign
 * @param {string} intPart
 * @param {string} fracPart
 * @param {number} power10
 */
function fromMantissa(sign, intPart, fracPart, power10) {
  const int = intPart === '' ? '0' : intPart;
  const frac = fracPart || '';

  if (int.length > 1 && int.startsWith('0')) {
    throw new SyntaxError('Invalid input: integer part cannot have leading zeros unless it is zero.');
  }

  const rawDigits = (int + frac).replace(/^0+(?=\d)/, '');
  const coefficient = rawDigits === '' ? '0' : rawDigits;
  const exponent = power10 - frac.length;

  return {
    kind: coefficient === '0' ? 'zero' : 'finite',
    sign,
    coefficient,
    exponent,
  };
}

/**
 * @param {string} mant
 */
function splitMantissa(mant) {
  const dot = mant.indexOf('.');
  if (dot === -1) return { intPart: mant, fracPart: '' };
  return { intPart: mant.slice(0, dot), fracPart: mant.slice(dot + 1) };
}

/**
 * @param {string} input
 * @returns {import('../types.js').Decimal32Value}
 */
export function parseDecimalInput(input) {
  const trimmed = normalizeDecimalText(input);
  if (trimmed === '') {
    throw new SyntaxError('parseDecimalInput: empty input');
  }

  const infMatch = trimmed.match(/^([+-]?)(infinity|inf)$/i);
  if (infMatch) {
    return { kind: 'infinity', sign: infMatch[1] === '-' ? 1 : 0 };
  }

  const nanMatch = trimmed.match(/^([+-]?)(s)?nan$/i);
  if (nanMatch) {
    return { kind: 'nan', sign: nanMatch[1] === '-' ? 1 : 0, signaling: !!nanMatch[2] };
  }

  let sci = trimmed.match(/^([+-])?(\d+\.?\d*|\.\d+)\s*[eE]\s*([+-]?\d+)$/);
  if (sci) {
    const { intPart, fracPart } = splitMantissa(sci[2]);
    return fromMantissa(sci[1] === '-' ? 1 : 0, intPart, fracPart, Number(sci[3]));
  }

  sci = trimmed.match(/^([+-])?(\d+\.?\d*|\.\d+)\s*[x*]\s*10\s*\^\s*([+-]?\d+)$/i);
  if (sci) {
    const { intPart, fracPart } = splitMantissa(sci[2]);
    return fromMantissa(sci[1] === '-' ? 1 : 0, intPart, fracPart, Number(sci[3]));
  }

  validateDecimalInput(trimmed);

  const numMatch = trimmed.match(/^([+-]?)(\d+)?(?:\.(\d+))?$/);
  if (!numMatch || (!numMatch[2] && !numMatch[3])) {
    throw new SyntaxError(`parseDecimalInput: could not parse "${input}" as a decimal32 value`);
  }

  const sign = numMatch[1] === '-' ? 1 : 0;
  const intPart = numMatch[2] || '0';
  const fracPart = numMatch[3] || '';

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
