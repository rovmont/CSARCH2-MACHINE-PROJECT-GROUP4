import { packResult } from './format.js';
import { roundDigitString } from './rounding.js';
import { DECIMAL32 } from './types.js';

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
	steps.push(`Input A: coefficient ${bInput.coefficient ?? '0'}, exponent ${bInput.exponent ?? '0'}.`);


	// TODO: check if nan


	// negate b
	const bNeg = {
		kind: bInput.kind,
		sign: bInput.sign === 1 ? 0 : 1,
		coefficient: bInput.coefficient,
		exponent: bInput.exponent,
	}
	steps.push(`Negated B. −B has coefficient ${b.coefficient ?? '0'}, exponent ${b.exponent ?? 0}, sign ${b.sign ? '-' : '+'}.`)


	// TODO: check if infinity


	const coeffA = BigInt(aInput.coefficient ?? '0') * (aInput.sign === 1 ? -1n : 1n);
	const coeffB = BigInt(bNeg.coefficient ?? '0' * (bNeg.sign === 1 ? -1n : 1n));
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


	// TODO: check if zero result


	// seperating to sign and coeff
	resultSign = rawSum < 0n ? 1 : 0;
	resultCoeff = rawSum < 0n ? -rawSum : rawSum

	
	// TODO: normalize

	// TODO: check for overflow


	// final result
	finalResult = {
		kind: resultCoeff === 0 ? 'zero' : 'finite',
		sign: resultSign,
		coefficient: resultCoeff,
		exponent: commonExp,
	}
	steps.push(`Final result: ${resultSign ? '-' : ''}${resultCoeff} x 10^${commonExp}`)

	const result = packResult(finalResult, steps, flags);
	return result;
}
