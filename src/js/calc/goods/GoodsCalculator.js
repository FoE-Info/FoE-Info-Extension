/**
 * GoodsCalculator.js
 *
 * Player inventory goods and Guild Treasury goods classification and boost scaling.
 * Categorizes goods yields into Current Era, Previous Era, Next Era, and Other Eras.
 */

const BigNumber = require('bignumber.js');
const { toBigNumber } = require('../utils/bignumberUtils.js');
const { getPreviousEra, getNextEra } = require('../utils/eraUtils.js');

const NON_GOODS_KEYS = new Set([
  'money',
  'supplies',
  'medals',
  'strategy_points',
  'clan_power',
  'population',
  'happiness',
  'units',
]);

function createGoodsAccumulator() {
  return {
    currentEraGoods: new BigNumber(0),
    prevEraGoods: new BigNumber(0),
    nextEraGoods: new BigNumber(0),
    otherGoods: new BigNumber(0),
    treasuryGoods: new BigNumber(0),
    gbTreasuryGoods: new BigNumber(0),
    eventTreasuryGoods: new BigNumber(0),
    goodsByEra: {},
  };
}

function processEntityGoods({
  prodResources = {},
  accum,
  playerEra,
  buildingEra = null,
  prevEra,
  nextEra,
  store = null,
  isGB = false,
} = {}) {
  const bEra = buildingEra || playerEra;
  const bPrevEra = getPreviousEra(bEra) || prevEra;
  const bNextEra = getNextEra(bEra) || nextEra;

  for (const [resKey, amountVal] of Object.entries(prodResources)) {
    if (NON_GOODS_KEYS.has(resKey)) continue;

    const amt = toBigNumber(amountVal);
    if (amt.isZero()) continue;

    if (isGB) {
      if (
        resKey === 'clan_goods' ||
        resKey === 'all_goods_of_age' ||
        resKey.startsWith('clan_goods')
      ) {
        accum.gbTreasuryGoods = accum.gbTreasuryGoods.plus(amt);
        accum.treasuryGoods = accum.treasuryGoods.plus(amt);
        continue;
      }
    } else if (resKey === 'clan_goods' || resKey.startsWith('clan_goods')) {
      accum.eventTreasuryGoods = accum.eventTreasuryGoods.plus(amt);
      accum.treasuryGoods = accum.treasuryGoods.plus(amt);
      continue;
    }

    if (resKey === 'all_goods_of_age') {
      categorizeGoods(accum, amt, bEra, playerEra, prevEra, nextEra);
    } else if (resKey === 'all_goods_of_previous_age') {
      categorizeGoods(accum, amt, bPrevEra, playerEra, prevEra, nextEra);
    } else if (resKey === 'all_goods_of_next_age') {
      categorizeGoods(accum, amt, bNextEra, playerEra, prevEra, nextEra);
    } else if (resKey === 'random_good_of_age') {
      categorizeGoods(accum, amt, bEra, playerEra, prevEra, nextEra);
    } else if (resKey === 'random_good_of_previous_age') {
      categorizeGoods(accum, amt, bPrevEra, playerEra, prevEra, nextEra);
    } else if (resKey === 'random_good_of_next_age') {
      categorizeGoods(accum, amt, bNextEra, playerEra, prevEra, nextEra);
    } else {
      const goodEra = store?.getResource?.(resKey)?.era;
      categorizeGoods(accum, amt, goodEra, playerEra, prevEra, nextEra);
    }
  }
}

function categorizeGoods(accum, amt, era, playerEra, prevEra, nextEra) {
  if (era === playerEra) {
    accum.currentEraGoods = accum.currentEraGoods.plus(amt);
  } else if (era === prevEra) {
    accum.prevEraGoods = accum.prevEraGoods.plus(amt);
  } else if (era === nextEra) {
    accum.nextEraGoods = accum.nextEraGoods.plus(amt);
  } else {
    accum.otherGoods = accum.otherGoods.plus(amt);
  }

  if (era && accum.goodsByEra) {
    accum.goodsByEra[era] = (accum.goodsByEra[era] || new BigNumber(0)).plus(
      amt,
    );
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
  let other = accum.otherGoods;

  const hasBoost = goodsBoostPercent.isGreaterThan(0);
  const gMultiplier =
    hasBoost ? new BigNumber(1).plus(goodsBoostPercent.dividedBy(100)) : null;

  if (gMultiplier) {
    current = current
      .multipliedBy(gMultiplier)
      .integerValue(BigNumber.ROUND_HALF_UP);
    prev = prev.multipliedBy(gMultiplier).integerValue(BigNumber.ROUND_HALF_UP);
    next = next.multipliedBy(gMultiplier).integerValue(BigNumber.ROUND_HALF_UP);
    other = other
      .multipliedBy(gMultiplier)
      .integerValue(BigNumber.ROUND_HALF_UP);
  }

  const hasGgBoost = guildGoodsBoostPercent.isGreaterThan(0);
  const ggMultiplier =
    hasGgBoost ?
      new BigNumber(1).plus(guildGoodsBoostPercent.dividedBy(100))
    : null;

  const gbTreasury = accum.gbTreasuryGoods || new BigNumber(0);
  const eventTreasury =
    accum.eventTreasuryGoods ||
    (accum.gbTreasuryGoods.isZero() ? accum.treasuryGoods : new BigNumber(0));

  const boostedEventTreasury =
    hasGgBoost ?
      eventTreasury
        .multipliedBy(ggMultiplier)
        .integerValue(BigNumber.ROUND_HALF_UP)
    : eventTreasury;

  const treasury = gbTreasury.plus(boostedEventTreasury);

  const boostedByEra = {};
  if (accum.goodsByEra) {
    for (const [era, amt] of Object.entries(accum.goodsByEra)) {
      boostedByEra[era] =
        gMultiplier ?
          amt.multipliedBy(gMultiplier).integerValue(BigNumber.ROUND_HALF_UP)
        : amt;
    }
  }

  const total = current.plus(prev).plus(next).plus(other);

  return {
    currentEra: current,
    previousEra: prev,
    nextEra: next,
    otherEras: other,
    treasury: treasury,
    gbTreasury: gbTreasury,
    eventTreasury: boostedEventTreasury,
    total: total,
    byEra: boostedByEra,
    boostPercent: goodsBoostPercent,
  };
}

module.exports = {
  createGoodsAccumulator,
  processEntityGoods,
  finalizeGoods,
};
module.exports.default = module.exports;
