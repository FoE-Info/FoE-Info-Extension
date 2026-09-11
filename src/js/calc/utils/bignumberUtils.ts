/**
 * bignumberUtils.ts
 *
 * Safe BigNumber parsing and conversions for FoE arithmetic.
 * Zero DOM dependencies.
 */

import BigNumber from 'bignumber.js';

export type BigNumberLike =
  | BigNumber
  | string
  | number
  | null
  | undefined
  | { isBigNumber?: boolean; _isBigNumber?: boolean; [key: string]: unknown };

/**
 * Safely converts any value to BigNumber (defaults to 0 on NaN/null/undefined).
 *
 * @param val Value to convert
 * @returns Safe BigNumber instance
 */
export function toBigNumber(val: unknown): BigNumber {
  if (
    val instanceof BigNumber ||
    (val &&
      typeof val === 'object' &&
      ('isBigNumber' in val || '_isBigNumber' in val))
  ) {
    return val as BigNumber;
  }
  if (val === null || val === undefined || val === '') return new BigNumber(0);
  try {
    const bn = new BigNumber(val as BigNumber.Value);
    return bn.isNaN() ? new BigNumber(0) : bn;
  } catch {
    return new BigNumber(0);
  }
}

export { BigNumber };
export default {
  BigNumber,
  toBigNumber,
};
