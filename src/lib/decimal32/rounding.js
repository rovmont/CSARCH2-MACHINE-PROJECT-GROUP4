/**
 * OWNER: Leung, Jillianne (Feature 2 — Rounding)
 *
 * Spec: Given a number (decimal or binary digit string) and a target digit count,
 * show results for all four methods:
 *   - chopping (truncation toward 0)
 *   - round-up (toward +∞)
 *   - round-down (toward −∞)
 *   - round-to-nearest ties-to-even
 *
 * Wire-up: src/pages/round.astro calls demonstrateRounding(...).
 * Also export roundDigitString for Jacoba/Jat to use in subtract/divide.
 */

import { step } from './format/step.js';

/**
 * @typedef {'chopping'|'round-up'|'round-down'|'ties-to-even'} RoundingMode
 */
export const ROUNDING_MODES = /** @type {const} */ ([
  'chopping',
  'round-up',
  'round-down',
  'ties-to-even',
]);

/** @param {'decimal'|'binary'} radix */
function radixBase(radix) {
  return radix === 'binary' ? 2 : 10;
}


/**
 * Add 1 to a digit string in the given base, handle carry-out
 * @param {string} digits
 * @param {number} base
 * @returns {{ digits: string, carried: boolean }}
 */
function incrementDigits(digits, base) {
  const arr = digits.split('').map(Number);
  let carry = 1;
  for (let i = arr.length - 1; i >= 0 && carry; i--) {
    arr[i] += carry;
    if (arr[i] >= base) {
      arr[i] -= base;
      carry = 1;
    } else {
      carry = 0;
    }
  }
  return { digits: (carry ? '1' : '') + arr.join(''), carried: Boolean(carry) };
}

/**
 * Format rounded digits back into a display string with decimal point and sign
 * @param {string} digits
 * @param {number} pointPosition - number of digits that belong before the decimal point
 * @param {0|1} sign
 * @returns {string}
 */
function formatRoundedValue(digits, pointPosition, sign) {
  let intPart;
  let fracPart = '';

  if (pointPosition <= 0) {
    intPart = '0';
    fracPart = '0'.repeat(-pointPosition) + digits;
  } else if (pointPosition >= digits.length) {
    intPart = digits + '0'.repeat(pointPosition - digits.length);
  } else {
    intPart = digits.slice(0, pointPosition);
    fracPart = digits.slice(pointPosition);
  }

  const body = fracPart ? `${intPart}.${fracPart}` : intPart;
  return sign === 1 ? `-${body}` : body;
}


/**
 * Round a digit string to `targetDigits` leading digits
 * @param {string} digits - unsigned digit characters only (no sign and dot)
 * @param {number} targetDigits
 * @param {RoundingMode} mode
 * @param {0|1} [sign] - 0 positive, 1 negative (needed for directed rounding)
 * @param {'decimal'|'binary'} [radix]
 * @returns {{ digits: string, steps: import('./types.js').ConversionStep[], changed: boolean }}
 */
export function roundDigitString(digits, targetDigits, mode, sign = 0, radix = 'decimal') {
  const base = radixBase(radix);
  const clean = String(digits).trim() || '0';
  /** @type {import('./types.js').ConversionStep[]} */
  const steps = [];
  const signedClean = sign === 1 ? `-${clean}` : clean;

  const safeTarget = Math.max(0, targetDigits);

  if (safeTarget >= clean.length) {
    steps.push(
      step(
        'Check digit count',
        `Digit string "${clean}" already fits within ${safeTarget} digit(s); no rounding needed.`,
        { type: 'parts', parts: [{ label: 'Digits', value: signedClean, tone: 'neutral' }] }
      )
    );
    return { digits: clean, steps, changed: false };
  }

  const kept = clean.slice(0, safeTarget) || '0';
  const discarded = clean.slice(safeTarget);
  steps.push(
    step(
      'Split the digits',
      `Keeping the first ${safeTarget} digit(s), discarding the rest.`,
      {
        type: 'parts',
        parts: [
          { label: 'Kept', value: kept, tone: 'msd' },
          { label: 'Discarded', value: discarded, tone: 'danger' },
        ],
      }
    )
  );

  const allZero = /^0*$/.test(discarded);
  const changed = !allZero;
  let roundUpMagnitude = false;

  switch (mode) {
    case 'chopping': {
      steps.push(
        step(
          'Chopping (truncation toward 0)',
          'Drop the discarded digits and never increment the kept digits.'
        )
      );
      break;
    }
    case 'round-up': { //toward +∞
      if (allZero) {
        steps.push(step('Exact value', 'Discarded portion is all zeros — value is exact, no change needed.'));
      } else if (sign === 0) {
        steps.push(
          step(
            'Round toward +∞',
            'Positive number with nonzero discarded digits: increment the kept digits.'
          )
        );
        roundUpMagnitude = true;
      } else {
        steps.push(
          step(
            'Round toward +∞',
            'Negative number: moving toward +∞ shrinks the magnitude, so just truncate.'
          )
        );
      }
      break;
    }
    case 'round-down': { //toward −∞
      if (allZero) {
        steps.push(step('Exact value', 'Discarded portion is all zeros — value is exact, no change needed.'));
      } else if (sign === 1) {
        steps.push(
          step(
            'Round toward −∞',
            'Negative number with nonzero discarded digits: increment the magnitude.'
          )
        );
        roundUpMagnitude = true;
      } else {
        steps.push(
          step(
            'Round toward −∞',
            'Positive number: moving toward −∞ shrinks the magnitude, so just truncate.'
          )
        );
      }
      break;
    }
    case 'ties-to-even': {
      if (allZero) {
        steps.push(step('Exact value', 'Discarded portion is all zeros — value is exact, no change needed.'));
        break;
      }
      const half = String(base / 2) + '0'.repeat(discarded.length - 1);
      if (discarded > half) {
        steps.push(
          step(
            'Compare to the halfway point',
            'Discarded portion is greater than halfway: round up.',
            { type: 'equation', left: discarded, right: half, note: 'discarded > halfway → round up' }
          )
        );
        roundUpMagnitude = true;
      } else if (discarded < half) {
        steps.push(
          step(
            'Compare to the halfway point',
            'Discarded portion is less than halfway: round down.',
            { type: 'equation', left: discarded, right: half, note: 'discarded < halfway → round down' }
          )
        );
      } else {
        const lastKeptDigit = Number(kept[kept.length - 1] ?? '0');
        const isOdd = lastKeptDigit % 2 !== 0;
        roundUpMagnitude = isOdd;
        steps.push(
          step(
            'Exactly halfway — ties-to-even',
            `Last kept digit is ${lastKeptDigit} (${isOdd ? 'odd' : 'even'}), so ` +
              `${isOdd ? 'round up to make it even' : 'keep it, already even'}.`,
            {
              type: 'parts',
              parts: [
                { label: 'Discarded', value: discarded, tone: 'danger' },
                { label: 'Halfway', value: half, tone: 'neutral' },
                {
                  label: 'Last kept digit',
                  value: `${lastKeptDigit} (${isOdd ? 'odd' : 'even'})`,
                  tone: isOdd ? 'exp' : 'msd',
                },
              ],
            }
          )
        );
      }
      break;
    }
  }

  let resultDigits = kept;
  if (roundUpMagnitude) {
    const inc = incrementDigits(kept, base);
    resultDigits = inc.digits;
    steps.push(
      step(
        inc.carried ? 'Increment with carry-out' : 'Increment the kept digits',
        inc.carried
          ? `Incrementing caused a carry-out, growing the digit string to "${resultDigits}".`
          : `Incremented kept digits to "${resultDigits}".`,
        {
          type: 'equation',
          left: kept,
          right: resultDigits,
          note: inc.carried ? 'Carry-out added a new leading digit' : undefined,
        }
      )
    );
  } else {
    steps.push(
      step('Final rounded digits', 'No increment needed — the kept digits are the final result.', {
        type: 'equation',
        left: signedClean,
        right: sign === 1 ? `-${resultDigits}` : resultDigits,
      })
    );
  }

  return { digits: resultDigits, steps, changed };
}

/**
 * Demonstrate all four rounding methods for the Round page
 * @param {string} numberInput    may include leading sign; decimal or binary digits
 * @param {number} targetDigits
 * @param {'decimal'|'binary'} [radix]
 * @returns {{
 *   sign: 0|1,
 *   originalDigits: string,
 *   targetDigits: number,
 *   radix: string,
 *   results: Record<RoundingMode, { rounded: string, steps: import('./types.js').ConversionStep[] }>
 * }}
 */
export function demonstrateRounding(numberInput, targetDigits, radix = 'decimal') {
  const raw = String(numberInput ?? '').trim();
  if (!raw) {
    throw new SyntaxError('Number input is empty.');
  }

  let sign = /** @type {0|1} */ (0);
  let body = raw;

  if (body.startsWith('-')) {
    sign = 1;
    body = body.slice(1);
  } else if (body.startsWith('+')) {
    body = body.slice(1);
  }

  // Validate characters for the selected format.
  const formatOk =
    radix === 'binary'
      ? /^[01]+(\.[01]+)?$/.test(body)
      : /^\d+(\.\d+)?$/.test(body);
  if (!formatOk) {
    throw new SyntaxError(
      radix === 'binary'
        ? 'Binary input must contain only 0/1 digits with at most one optional radix point.'
        : 'Decimal input must contain only decimal digits with at most one optional decimal point.'
    );
  }

  const dotIndex = body.indexOf('.');
  const integerPartRaw = dotIndex === -1 ? body : body.slice(0, dotIndex);
  const integerDigitCount = integerPartRaw.length;

  const originalDigits = body.replace('.', '') || '0';
  const originalLength = originalDigits.length;

  /** @type {RoundingMode[]} */
  const modes = ['chopping', 'round-up', 'round-down', 'ties-to-even'];
  /** @type {Record<string, { rounded: string, steps: string[], formatted: string }>} */
  const results = {};

  const safeTarget = Math.max(0, targetDigits);
  const keptLength = Math.min(safeTarget, originalLength);

  for (const mode of modes) {
    const { digits, steps } = roundDigitString(originalDigits, targetDigits, mode, sign, radix);
    const pointShift = digits.length - keptLength; //0 normally, 1 if a carry-out added a digit
    const pointPosition = integerDigitCount + pointShift;
    const formatted = formatRoundedValue(digits, pointPosition, sign);
    results[mode] = { rounded: digits, steps, formatted };
  }

  return {
    sign,
    originalDigits,
    targetDigits,
    radix,
    integerDigitCount,
    results: /** @type {any} */ (results),
  };
}
