/**
 * GoodsCalculator.js
 *
 * Player inventory goods and Guild Treasury goods classification and boost scaling.
 * Categorizes goods yields into Current Era, Previous Era, Next Era, and Other Eras.
 */

const BigNumber = require('bignumber.js');
const { toBigNumber } = require('../utils/bignumberUtils.js');

const NON_GOODS_KEYS = new Set([
  'money',
  'supplies',
  'medals',
  'strategy_points',
  'clan_power',
  'population',
  'happiness',
]);

function createGoodsAccumulator() {
  return {
    currentEraGoods: new BigNumber(0),
    prevEraGoods: new BigNumber(0),
    nextEraGoods: new BigNumber(0),
    otherGoods: new BigNumber(0),
    treasuryGoods: new BigNumber(0),
    goodsByEra: {},
  };
}

function processEntityGoods({
  prodResources = {},
  accum,
  playerEra,
  prevEra,
  nextEra,
  store = null,
} = {}) {
  for (const [resKey, amountVal] of Object.entries(prodResources)) {
    if (NON_GOODS_KEYS.has(resKey)) continue;

    const amt = toBigNumber(amountVal);
    if (amt.isZero()) continue;

    if (resKey === 'clan_goods' || resKey.startsWith('clan_goods')) {
      accum.treasuryGoods = accum.treasuryGoods.plus(amt);
    } else if (resKey === 'all_goods_of_age') {
      accum.currentEraGoods = accum.currentEraGoods.plus(amt.multipliedBy(5));
    } else if (resKey === 'all_goods_of_previous_age') {
      accum.prevEraGoods = accum.prevEraGoods.plus(amt.multipliedBy(5));
    } else if (resKey === 'random_good_of_age') {
      accum.currentEraGoods = accum.currentEraGoods.plus(amt);
    } else if (resKey === 'random_good_of_previous_age') {
      accum.prevEraGoods = accum.prevEraGoods.plus(amt);
    } else if (resKey === 'random_good_of_next_age') {
      accum.nextEraGoods = accum.nextEraGoods.plus(amt);
    } else {
      const goodEra = store?.getResource?.(resKey)?.era;
      if (goodEra === playerEra) {
        accum.currentEraGoods = accum.currentEraGoods.plus(amt);
      } else if (goodEra === prevEra) {
        accum.prevEraGoods = accum.prevEraGoods.plus(amt);
      } else if (goodEra === nextEra) {
        accum.nextEraGoods = accum.nextEraGoods.plus(amt);
      } else {
        accum.otherGoods = accum.otherGoods.plus(amt);
      }

      if (goodEra && accum.goodsByEra) {
        accum.goodsByEra[goodEra] = (
          accum.goodsByEra[goodEra] || new BigNumber(0)
        ).plus(amt);
      }
    }
  }
}

function finalizeGoods({
  accum,
  goodsBoostPercent = new BigNumber(0),
  guildGoodsBoostPercent = new BigNumber(0),
} = {}) {
  let current = accum.currentEraGoods;
  let prev = accum.prevEraGoods;
  let next = accum.nextEraGoods;
  let treasury = accum.treasuryGoods;

  if (goodsBoostPercent.isGreaterThan(0)) {
    const gMultiplier = new BigNumber(1).plus(goodsBoostPercent.dividedBy(100));
    current = current
      .multipliedBy(gMultiplier)
      .integerValue(BigNumber.ROUND_HALF_UP);
    prev = prev.multipliedBy(gMultiplier).integerValue(BigNumber.ROUND_HALF_UP);
    next = next.multipliedBy(gMultiplier).integerValue(BigNumber.ROUND_HALF_UP);
  }

  if (guildGoodsBoostPercent.isGreaterThan(0)) {
    const ggMultiplier = new BigNumber(1).plus(
      guildGoodsBoostPercent.dividedBy(100),
    );
    treasury = treasury
      .multipliedBy(ggMultiplier)
      .integerValue(BigNumber.ROUND_HALF_UP);
  }

  const total = current.plus(prev).plus(next).plus(accum.otherGoods);

  return {
    currentEra: current,
    previousEra: prev,
    nextEra: next,
    otherEras: accum.otherGoods,
    treasury: treasury,
    total: total,
    byEra: accum.goodsByEra,
    boostPercent: goodsBoostPercent,
  };
}

module.exports = {
  createGoodsAccumulator,
  processEntityGoods,
  finalizeGoods,
};
module.exports.default = module.exports;
