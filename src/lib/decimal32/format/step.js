/**
 * Build a ConversionStep, a small typed wrapper so callers don't have to
 * remember whether `visual` should be included.
 *
 * @param {string} title
 * @param {string} text
 * @param {import('../types.js').StepVisual} [visual]
 * @returns {import('../types.js').ConversionStep}
 */
export function step(title, text, visual) {
  return visual ? { title, text, visual } : { title, text };
}
