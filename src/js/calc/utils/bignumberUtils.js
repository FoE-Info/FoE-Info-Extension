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

// Resource and unit totals exposed on City remain Numbers; round only at that
// boundary, after BigNumber has performed the arithmetic.
function addResourceTotal(current, amount) {
  return toBigNumber(current)
    .plus(toBigNumber(amount))
    .integerValue(BigNumber.ROUND_HALF_UP)
    .toNumber();
}

// Totals not constrained to whole units (e.g. per-resource intermediate
// amounts) retain fractional precision until their Number API boundary.
function addExactTotal(current, amount) {
  return toBigNumber(current).plus(toBigNumber(amount)).toNumber();
}

function chanceAmount(amount, chance) {
  return toBigNumber(amount)
    .multipliedBy(toBigNumber(chance))
    .integerValue(BigNumber.ROUND_HALF_UP)
    .toNumber();
}

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
module.exports.default = module.exports;
