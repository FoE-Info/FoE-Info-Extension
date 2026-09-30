/**
 * bignumberUtils.js
 *
 * Safe BigNumber parsing and conversions for FoE arithmetic.
 */

const BigNumber = require('bignumber.js');

/**
 * Safely converts any value to BigNumber (defaults to 0 on NaN/null/undefined).
 *
 * @param {*} val Value to convert
 * @returns {BigNumber} Safe BigNumber instance
 */
function toBigNumber(val) {
  if (val instanceof BigNumber || val?.isBigNumber || val?._isBigNumber)
    return val;
  if (val === null || val === undefined || val === '') return new BigNumber(0);
  try {
    const bn = new BigNumber(val);
    return bn.isNaN() ? new BigNumber(0) : bn;
  } catch {
    return new BigNumber(0);
  }
}

/**
 * Adds two values and rounds to the nearest integer (ROUND_HALF_UP).
 * Used for resource and unit totals exposed on City — round only at
 * the Number API boundary, after BigNumber has performed the arithmetic.
 *
 * @param {number|string|BigNumber|null|undefined} current Running total.
 * @param {number|string|BigNumber|null|undefined} amount Value to add.
 * @returns {number} Rounded integer sum.
 */
function addResourceTotal(current, amount) {
  return toBigNumber(current)
    .plus(toBigNumber(amount))
    .integerValue(BigNumber.ROUND_HALF_UP)
    .toNumber();
}

/**
 * Adds two values without rounding — for per-resource intermediate
 * amounts that retain fractional precision until their Number API boundary.
 *
 * @param {number|string|BigNumber|null|undefined} current Running total.
 * @param {number|string|BigNumber|null|undefined} amount Value to add.
 * @returns {number} Exact sum as a Number.
 */
function addExactTotal(current, amount) {
  return toBigNumber(current).plus(toBigNumber(amount)).toNumber();
}

/**
 * Multiplies an amount by a probability and rounds to nearest integer.
 *
 * @param {number|string|BigNumber|null|undefined} amount Base quantity.
 * @param {number|string|BigNumber|null|undefined} chance Probability factor (0–1 or 0–100).
 * @returns {number} Rounded product.
 */
function chanceAmount(amount, chance) {
  return toBigNumber(amount)
    .multipliedBy(toBigNumber(chance))
    .integerValue(BigNumber.ROUND_HALF_UP)
    .toNumber();
}

/**
 * Computes boosted forge points: base FP + unboostable FP + percentage boost.
 *
 * @param {number|string|BigNumber|null|undefined} boostable Forge points eligible for boost.
 * @param {number|string|BigNumber|null|undefined} unboostable Forge points excluded from boost.
 * @param {number|string|BigNumber|null|undefined} percent Boost percentage (e.g. 90 for 1.9x).
 * @returns {{ boostAmount: BigNumber, total: BigNumber }} Boost breakdown.
 */
function boostedForgePoints(boostable, unboostable, percent) {
  const base = toBigNumber(boostable);
  const boostAmount = base
    .multipliedBy(toBigNumber(percent))
    .dividedBy(100)
    .integerValue(BigNumber.ROUND_HALF_UP);
  return {
    boostAmount,
    total: base.plus(toBigNumber(unboostable)).plus(boostAmount),
  };
}

module.exports = {
  BigNumber,
  toBigNumber,
  addResourceTotal,
  addExactTotal,
  chanceAmount,
  boostedForgePoints,
};
