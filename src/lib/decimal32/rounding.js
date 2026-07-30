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
 *
 * TODO(Jillianne):
 * 1. roundDigitString — core digit-string rounding for one mode.
 * 2. demonstrateRounding — run all four modes and return steps per method for the UI.
 */

/**
 * @typedef {'chopping'|'round-up'|'round-down'|'ties-to-even'} RoundingMode
 */

export const ROUNDING_MODES = /** @type {const} */ ([
  'chopping',
  'round-up',
  'round-down',
  'ties-to-even',
]);

/**
 * Round a digit string to `targetDigits` leading digits.
 * @param {string} digits - unsigned digit characters only (no sign/dot)
 * @param {number} targetDigits
 * @param {RoundingMode} mode
 * @param {0|1} [sign] - 0 positive, 1 negative (needed for directed rounding)
 * @returns {{ digits: string, steps: string[], changed: boolean }}
 */
export function roundDigitString(digits, targetDigits, mode, sign = 0) {
  // TODO(Jillianne): Implement chopping / round-up / round-down / ties-to-even.
  // Return the kept digit string, explanation steps, and whether rounding changed the value.
  void digits;
  void targetDigits;
  void mode;
  void sign;
  return {
    digits: '0',
    steps: [
      'TODO(Jillianne): Implement roundDigitString in rounding.js',
      `Requested mode=${mode}, targetDigits=${targetDigits}`,
    ],
    changed: false,
  };
}

/**
 * Demonstrate all four rounding methods for the Round page.
 * @param {string} numberInput - may include leading sign; decimal or binary digits
 * @param {number} targetDigits
 * @param {'decimal'|'binary'} [radix]
 * @returns {{
 *   sign: 0|1,
 *   originalDigits: string,
 *   targetDigits: number,
 *   radix: string,
 *   results: Record<RoundingMode, { rounded: string, steps: string[] }>
 * }}
 */
export function demonstrateRounding(numberInput, targetDigits, radix = 'decimal') {
  // TODO(Jillianne): Parse sign + digit body (respect radix), then call roundDigitString for each mode.
  void numberInput;
  void targetDigits;
  void radix;

  /** @type {RoundingMode[]} */
  const modes = ['chopping', 'round-up', 'round-down', 'ties-to-even'];
  /** @type {Record<string, { rounded: string, steps: string[] }>} */
  const results = {};
  for (const mode of modes) {
    results[mode] = {
      rounded: 'TODO',
      steps: [
        'TODO(Jillianne): Implement demonstrateRounding in rounding.js',
        `Mode ${mode} should show the rounded digit string and per-step explanation.`,
      ],
    };
  }

  return {
    sign: 0,
    originalDigits: '',
    targetDigits,
    radix,
    results: /** @type {any} */ (results),
  };
}
