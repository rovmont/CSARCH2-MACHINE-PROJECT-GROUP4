import { packResult } from '../format/pack.js';
import { roundDigitString } from '../rounding.js';
import { DECIMAL32 } from '../types.js';

/**
 * OWNER: Luna, Jacoba (Feature 3a — Subtraction)
 *
 * Inputs: decimal or IEEE hex operands (parsed via parseArithmeticOperand), operation,
 * rounding method.
 * Outputs: step-by-step + decimal / spaced binary / hex.
 *
 * Wire-up: arithmetic.astro → subtractDecimal32(a, b, mode).
 *
 * TODO(Jacoba): Implement subtractDecimal32; return ConversionResult with steps.
 */

/**
 * @param {string|import('../types.js').Decimal32Value} aInput
 * @param {string|import('../types.js').Decimal32Value} bInput
 * @param {import('../rounding.js').RoundingMode} [mode]
 * @returns {import('../types.js').ConversionResult}
 */
export function subtractDecimal32(aInput, bInput, mode = 'ties-to-even') {
	const steps = [];
	const flags = [];
	steps.push(`Input A: coefficient ${aInput.coefficient ?? '0'}, exponent ${aInput.exponent ?? '0'}.`);
	steps.push(`Input B: coefficient ${bInput.coefficient ?? '0'}, exponent ${bInput.exponent ?? '0'}.`);

	// if nan, result is always nan
	if (aInput.kind === 'nan' || bInput.kind === 'nan') {
		const nan = aInput.kind === 'nan' ? aInput : bInput;
		steps.push(`A NaN operand was found, result is automatically declared as NaN.`);
		return packResult({kind: 'nan', sign: nan.sign}, steps, ['nan']);
	}

	// negate b
	const bNeg = {
		kind: bInput.kind,
		sign: bInput.sign === 1 ? 0 : 1,
		coefficient: bInput.coefficient,
		exponent: bInput.exponent,
	}
	steps.push(`Negated B. −B has coefficient ${bNeg.coefficient ?? '0'}, exponent ${bNeg.exponent ?? 0}, sign ${bNeg.sign ? '-' : '+'}.`)

	// checks for infinity
	if (aInput.kind === 'infinity' || bNeg.kind === 'infinity') {
		if (aInput.kind === 'infinity' && bNeg.kind === 'infinity') {
			if (aInput.sign === bNeg.sign) {
				steps.push(`Both operands are infinite, with the same sign. The result is thus an infinity of the same sign.`);
				return packResult({kind: 'infinity', sign: aInput.sign}, steps, []);
			}
			else {
				steps.push(`Both operands are infinite, with opposing signs. The result is thus NaN.`);
				return packResult({kind: 'nan', sign: 0}, steps, ['nan']);
			}
		}

		const inf = aInput.kind === 'infinity' ? aInput : bNeg;
		steps.push(`One operand is infinite, while the other is finite. The result is equivalent to the infinite operand.`);
		return packResult({kind: 'infinity', sign: inf.sign}, steps, []);
	}

	const coeffA = BigInt(aInput.coefficient ?? '0') * (aInput.sign === 1 ? -1n : 1n);
	const coeffB = BigInt(bNeg.coefficient ?? '0') * (bNeg.sign === 1 ? -1n : 1n);
	const expA = aInput.exponent ?? 0;
	const expB = bNeg.exponent ?? 0;

	// align to a common exponent. common exponent will bne the smaller one
	const commonExp = Math.min(expA, expB);
	const alignedA = coeffA * 10n ** BigInt(expA - commonExp);
	const alignedB = coeffB * 10n ** BigInt(expB - commonExp);

	if (expA === expB) {
		steps.push(`Exponents already match. No shifting nor alignment needed.`)
	}
	else {
		if (expA !== commonExp) {
			steps.push(`Align A to exponent ${commonExp}. Coefficient ${coeffA} x 10^${expA - commonExp} = ${alignedA}`);
		}
		else {

			steps.push(`Align B to exponent ${commonExp}. Coefficient ${coeffB} x 10^${expB - commonExp} = ${alignedB}`);
		}
	}

	// getting raw sum
	const signedA = coeffA * 10n ** BigInt(expA - commonExp);
	const signedB = coeffB * 10n ** BigInt(expB - commonExp);
	const rawSum = signedA + signedB;
	steps.push(`Get the sum of both coefficients: ${signedA} + (${signedB}) = ${rawSum} (× 10^${commonExp}).`);

	// seperating to sign and coeff
	let resultSign = rawSum < 0n ? 1 : 0;
	let resultCoeff = rawSum < 0n ? -rawSum : rawSum
	let resultExp = commonExp;

	// checking if result is equal to zero
	if (rawSum === 0n) {
		// IEEE 754: exact-zero is +0, unless round-down, where its 0
		resultCoeff = 0n;
		if (mode === 'round-down'){
			resultSign = 1;
			steps.push(`Result is exactly zero. As rounding is set to round-down, the result is -0 in accordance to IEEE 754.`);
		}
		else {
			resultSign = 0;
			steps.push(`Result is exactly zero. Sign is set to +0`);
		}
	}
	
	// normalizes result
	let coeffStr = resultCoeff.toString();	
	if (coeffStr.length > DECIMAL32.PRECISION) {
		const before = coeffStr;
		const { digits : rounded, steps: roundSteps, changed } = roundDigitString(
			coeffStr,
			DECIMAL32.PRECISION,
			mode,
			resultSign
		);

		let after = rounded;
		let exponentAdjustment = before.length - DECIMAL32.PRECISION;

		if (after.length > DECIMAL32.PRECISION) {
			after = after.slice(0, DECIMAL32.PRECISION);
			exponentAdjustment += 1;
		}

		coeffStr = after;
		resultExp = commonExp + exponentAdjustment;

		steps.push(`Normalize: coefficient had ${before.length} digits, adjusted to ${coeffStr} using ${mode} rounding.`);
		if (changed) {
			steps.push(`Rounding changed the value, the result is now inexact.`);
			flags.push('inexact');
		}
	}
	else {
		steps.push('Normalize: Coefficient already fits within 7 digits, no noramlization needed.');
	}

	// TODO: check for overflow


	// final result
	const finalResult = {
		kind: coeffStr === '0' ? 'zero' : 'finite',
		sign: resultSign,
		coefficient: coeffStr,
		exponent: resultExp,
	}
	steps.push(`Final result: ${resultSign ? '-' : ''}${resultCoeff} x 10^${commonExp}`)

	const result = packResult(finalResult, steps, flags);
	return result;
}
