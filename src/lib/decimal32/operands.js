import { parseDecimalInput } from './encode.js';
import { decodeDecimal32 } from './format.js';

/**
 * Parse a Feature 3 operand as decimal or IEEE hexadecimal.
 *
 * @param {string} input
 * @param {'decimal'|'hex'} format - selected in the UI
 * @returns {import('./types.js').Decimal32Value}
 */
export function parseArithmeticOperand(input, format = 'decimal') {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) {
    throw new SyntaxError('Operand is empty.');
  }

  if (format === 'hex') {
    const hexBody = trimmed.replace(/^0x/i, '');
    if (!/^[0-9a-fA-F]{8}$/.test(hexBody)) {
      throw new SyntaxError('Enter exactly 8 hexadecimal digits.');
    }
    return decodeDecimal32('0x' + hexBody);
  }

  if (format !== 'decimal') {
    throw new SyntaxError(`Unknown operand format: ${format}`);
  }

  return parseDecimalInput(trimmed);
}
