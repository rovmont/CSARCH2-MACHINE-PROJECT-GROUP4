/**
 * Smoke checks — run after Feature 1–3 implementations exist:
 *   node scripts/smoke-test.mjs
 *
 * Currently expects stubs; tighten asserts as each owner finishes their module.
 */
import {
  convertToDecimal32,
  demonstrateRounding,
  subtractDecimal32,
  divideDecimal32,
} from '../src/lib/decimal32/index.js';

const c = convertToDecimal32('12.34');
console.log('convert stub →', c.flags, c.steps[0]);

const r = demonstrateRounding('1.23456789', 5, 'decimal');
console.log('round stub →', r.results.chopping.steps[0]);

const s = subtractDecimal32('10', '3', 'ties-to-even');
console.log('subtract stub →', s.steps[0]);

const d = divideDecimal32('10', '2', 'ties-to-even');
console.log('divide stub →', d.steps[0]);

console.log('smoke: stubs reachable (implementations still TODO)');
