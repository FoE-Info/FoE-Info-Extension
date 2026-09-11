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

module.exports = {
  BigNumber,
  toBigNumber,
};
module.exports.default = module.exports;
