import { packResult } from '../format/pack.js';
import { roundDigitString } from '../rounding.js';
import { step } from '../format/step.js';
import { DECIMAL32 } from '../types.js';

/**
 * OWNER: Luna, Jacoba (Feature 3a — Subtraction)
 *
 * Inputs: decimal or IEEE hex operands (parsed via parseArithmeticOperand), operation,
 * rounding method.
 * Outputs: step-by-step + decimal / spaced binary / hex.
 *
 * Wire-up: arithmetic.astro → subtractDecimal32(a, b, mode).
 */

/** Signed decimal string for a magnitude string/number, e.g. ("5", 1) -> "−5". */
function signedStr(coefficient, sign) {
	return `${sign ? '−' : ''}${coefficient}`;
}

/**
 * @param {string|import('../types.js').Decimal32Value} aInput
 * @param {string|import('../types.js').Decimal32Value} bInput
 * @param {import('../rounding.js').RoundingMode} [mode]
 * @returns {import('../types.js').ConversionResult}
 */
export function subtractDecimal32(aInput, bInput, mode = 'ties-to-even') {
	const steps = [];
	const flags = [];

	steps.push(
		step(
			'Read the operands',
			`A has coefficient ${aInput.coefficient ?? '0'}, exponent ${aInput.exponent ?? '0'}. B has coefficient ${bInput.coefficient ?? '0'}, exponent ${bInput.exponent ?? '0'}.`,
			{
				type: 'parts',
				parts: [
					{
						label: 'A',
						value: `${aInput.sign === 1 ? '−' : ''}${aInput.coefficient ?? '0'} × 10^${aInput.exponent ?? 0}`,
						tone: 'msd',
					},
					{
						label: 'B',
						value: `${bInput.sign === 1 ? '−' : ''}${bInput.coefficient ?? '0'} × 10^${bInput.exponent ?? 0}`,
						tone: 'exp',
					},
				],
			}
		)
	);

	// if nan, result is always nan
	if (aInput.kind === 'nan' || bInput.kind === 'nan') {
		const nan = aInput.kind === 'nan' ? aInput : bInput;
		steps.push(step('NaN operand', `A NaN operand was found, result is automatically declared as NaN.`));
		return packResult({kind: 'nan', sign: nan.sign}, steps, ['nan']);
	}

	// negate b
	const bNeg = {
		kind: bInput.kind,
		sign: bInput.sign === 1 ? 0 : 1,
		coefficient: bInput.coefficient,
		exponent: bInput.exponent,
	}
	steps.push(
		step(
			'Negate B',
			`A − B becomes A + (−B). −B has coefficient ${bNeg.coefficient ?? '0'}, exponent ${bNeg.exponent ?? 0}, sign ${bNeg.sign ? '-' : '+'}.`,
			{
				type: 'equation',
				left: `B = ${bInput.sign === 1 ? '−' : ''}${bInput.coefficient ?? '0'} × 10^${bInput.exponent ?? 0}`,
				right: `−B = ${bNeg.sign ? '−' : ''}${bNeg.coefficient ?? '0'} × 10^${bNeg.exponent ?? 0}`,
				note: 'Subtraction is performed as addition of the negated operand.',
			}
		)
	);

	// checks for infinity
	if (aInput.kind === 'infinity' || bNeg.kind === 'infinity') {
		if (aInput.kind === 'infinity' && bNeg.kind === 'infinity') {
			if (aInput.sign === bNeg.sign) {
				steps.push(step('Both operands infinite', `Both operands are infinite, with the same sign. The result is thus an infinity of the same sign.`));
				return packResult({kind: 'infinity', sign: aInput.sign}, steps, []);
			}
			else {
				steps.push(step('Both operands infinite', `Both operands are infinite, with opposing signs. The result is thus NaN.`));
				return packResult({kind: 'nan', sign: 0}, steps, ['nan']);
			}
		}

		const inf = aInput.kind === 'infinity' ? aInput : bNeg;
		steps.push(step('One operand infinite', `One operand is infinite, while the other is finite. The result is equivalent to the infinite operand.`));
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
		steps.push(step('Align exponents', `Exponents already match. No shifting nor alignment needed.`));
	}
	else {
		if (expA !== commonExp) {
			steps.push(
				step(
					'Align exponents',
					`Align A to the common (smaller) exponent ${commonExp} by scaling its coefficient.`,
					{
						type: 'equation',
						left: `${coeffA} × 10^${expA - commonExp}`,
						right: `${alignedA}`,
						note: `A shifted to exponent ${commonExp}; B is already there.`,
					}
				)
			);
		}
		else {
			steps.push(
				step(
					'Align exponents',
					`Align B to the common (smaller) exponent ${commonExp} by scaling its coefficient.`,
					{
						type: 'equation',
						left: `${coeffB} × 10^${expB - commonExp}`,
						right: `${alignedB}`,
						note: `B shifted to exponent ${commonExp}; A is already there.`,
					}
				)
			);
		}
	}

	// getting raw sum
	const signedA = coeffA * 10n ** BigInt(expA - commonExp);
	const signedB = coeffB * 10n ** BigInt(expB - commonExp);
	const rawSum = signedA + signedB;

	const signA = signedA < 0n ? 1 : 0;
	const magA = signedA < 0n ? -signedA : signedA;
	const signB = signedB < 0n ? 1 : 0;
	const magB = signedB < 0n ? -signedB : signedB;
	const sumSign = rawSum < 0n ? 1 : 0;
	const sumMag = rawSum < 0n ? -rawSum : rawSum;

	steps.push(
		step(
			'Add the aligned coefficients',
			`Get the sum of both coefficients: ${signedA} + (${signedB}) = ${rawSum} (× 10^${commonExp}).`,
			{
				type: 'columns',
				rows: [
					{ label: 'A', sign: signA, digits: magA.toString(), exponent: commonExp },
					{ label: '−B', sign: signB, digits: magB.toString(), exponent: commonExp },
				],
				result: { label: 'Sum', sign: sumSign, digits: sumMag.toString(), exponent: commonExp },
				note: 'Coefficients are added as signed integers once both share the same exponent.',
			}
		)
	);

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
			steps.push(step('Exact zero', `Result is exactly zero. As rounding is set to round-down, the result is -0 in accordance to IEEE 754.`));
		}
		else {
			resultSign = 0;
			steps.push(step('Exact zero', `Result is exactly zero. Sign is set to +0`));
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

		steps.push(
			step(
				'Normalize to 7 digits',
				`Coefficient had ${before.length} digits, adjusted using ${mode} rounding.`,
				{
					type: 'equation',
					left: `${signedStr(before, resultSign)} × 10^${commonExp}`,
					right: `${signedStr(coeffStr, resultSign)} × 10^${resultExp}`,
					note: 'decimal32 stores only 7 coefficient digits.',
				}
			)
		);

		if (changed) {
			steps.push(step('Inexact result', `Rounding changed the value, the result is now inexact.`));
			flags.push('inexact');
		}
	}
	else {
		steps.push(step('Normalize to 7 digits', 'Coefficient already fits within 7 digits, no normalization needed.'));
	}

	// final result
	const finalResult = {
		kind: coeffStr === '0' ? 'zero' : 'finite',
		sign: resultSign,
		coefficient: coeffStr,
		exponent: resultExp,
	}

	steps.push(
		step(
			'Final result',
			`Final result: ${resultSign ? '-' : ''}${resultCoeff} x 10^${commonExp}`,
			{
				type: 'parts',
				parts: [
					{ label: 'Sign', value: resultSign ? '−' : '+', tone: 'msd' },
					{ label: 'Coefficient', value: coeffStr, tone: 'combo' },
					{ label: 'Exponent', value: String(resultExp), tone: 'exp' },
				],
			}
		)
	);

	const result = packResult(finalResult, steps, flags);

	// checking for under/overflow
	if (finalResult.kind === 'finite' && result.value.kind === 'infinity') {
		result.flags.push('overflow');
		result.steps.push(step('Overflow', 'Coefficient exceeded decimal32 range, rounded to infinity.'));
	}
	else if (finalResult.kind === 'finite' && result.value.kind === 'zero') {
		result.flags.push('underflow');
		result.steps.push(step('Underflow', 'Coefficient too small to represent, rounded to zero.'));
	}

	return result;
}
