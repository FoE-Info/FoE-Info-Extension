/**
 * aidStatsBoostCalculator.js
 *
 * Boost calculation routines and unaided difference tracking for daily city production aid.
 * Evaluates FP boosts, Goods boosts, Clan Goods boosts (grouped by 5), and Coin/Supply boosts.
 * Adheres strictly to BigNumber precision rule (half-up rounding for boosts, floor for coins/supplies).
 * Pure module: zero DOM references.
 */

const BigNumber = require('bignumber.js');
const { toBigNumber } = require('../utils/bignumberUtils.js');

/**
 * Applies a percentage boost to a BigNumber base amount.
 *
 * @param {BigNumber} base
 * @param {BigNumber} boostPercent
 * @param {boolean} [isFloor=false] - If true, rounds down (e.g. for coins/supplies).
 * @returns {BigNumber}
 */
function applyBoost(base, boostPercent, isFloor = false) {
  if (!boostPercent || boostPercent.lte(0)) return base;
  const mult = new BigNumber(1).plus(boostPercent.dividedBy(100));
  const rounding = isFloor ? BigNumber.ROUND_FLOOR : BigNumber.ROUND_HALF_UP;
  return base.multipliedBy(mult).integerValue(rounding);
}

/**
 * Records an unaided resource difference into a tracking map.
 *
 * @param {Map} map
 * @param {string} name - Building display name.
 * @param {BigNumber} diffBn - Resource difference between aided and unaided.
 */
function recordUnaided(map, name, diffBn) {
  if (!diffBn || !diffBn.gt(0)) return;
  const existing = map.get(name);
  if (existing) {
    existing.count += 1;
    existing.diff = existing.diff.plus(diffBn);
  } else {
    map.set(name, {
      name,
      count: 1,
      diff: diffBn,
    });
  }
}

/**
 * Finalizes an unaided difference map into a sorted array.
 *
 * @param {Map} map
 * @returns {Array<{ name: string, count: number, diff: number }>}
 */
function finalizeUnaidedList(map) {
  const list = Array.from(map.values()).map((item) => ({
    name: item.name,
    count: item.count,
    diff: item.diff.toNumber(),
  }));
  list.sort((a, b) => b.diff - a.diff);
  return list;
}

/**
 * Recalculates all boost amounts and net totals across max and current yields.
 *
 * @param {Object} aidStats - Daily production aid stats object.
 * @param {Object} [boosts={}] - Player active boosts map.
 * @returns {Object} aidStats with recalculated boosts.
 */
function recalculateAidStatsBoosts(aidStats, boosts = {}) {
  if (!aidStats || !aidStats.max || !aidStats.current) return aidStats;

  const fpBoostPercent = toBigNumber(
    boosts.fp || boosts.fpProductionBoost || 0,
  );
  const goodsBoostPercent = toBigNumber(
    boosts.goods || boosts.goodsProductionBoost || 0,
  );
  const guildGoodsBoostPercent = toBigNumber(
    boosts.guildGoods || boosts.guildGoodsProductionBoost || 0,
  );
  const coinBoostPercent = toBigNumber(boosts.coin || boosts.CoinBoost || 0);
  const supplyBoostPercent = toBigNumber(
    boosts.supply || boosts.SupplyBoost || 0,
  );

  // 1. FP Boost
  const maxFpBoostAmount =
    fpBoostPercent.gt(0) && aidStats.max.baseBoostableFp ?
      aidStats.max.baseBoostableFp
        .multipliedBy(fpBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
    : new BigNumber(0);
  aidStats.max.fpBoostAmount = maxFpBoostAmount;
  aidStats.max.fp = (aidStats.max.baseUnboostableFp || new BigNumber(0))
    .plus(aidStats.max.baseBoostableFp || new BigNumber(0))
    .plus(maxFpBoostAmount);

  const curFpBoostAmount =
    fpBoostPercent.gt(0) && aidStats.current.baseBoostableFp ?
      aidStats.current.baseBoostableFp
        .multipliedBy(fpBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
    : new BigNumber(0);
  aidStats.current.fpBoostAmount = curFpBoostAmount;
  aidStats.current.fp = (aidStats.current.baseUnboostableFp || new BigNumber(0))
    .plus(aidStats.current.baseBoostableFp || new BigNumber(0))
    .plus(curFpBoostAmount);

  // 2. Goods Boost
  const maxBoostedGoodsAmount =
    goodsBoostPercent.gt(0) && aidStats.max.baseBoostableGoods ?
      aidStats.max.baseBoostableGoods
        .multipliedBy(goodsBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
    : new BigNumber(0);
  aidStats.max.goods = (aidStats.max.baseUnboostableGoods || new BigNumber(0))
    .plus(aidStats.max.baseBoostableGoods || new BigNumber(0))
    .plus(maxBoostedGoodsAmount);

  const curBoostedGoodsAmount =
    goodsBoostPercent.gt(0) && aidStats.current.baseBoostableGoods ?
      aidStats.current.baseBoostableGoods
        .multipliedBy(goodsBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
    : new BigNumber(0);
  aidStats.current.goods = (
    aidStats.current.baseUnboostableGoods || new BigNumber(0)
  )
    .plus(aidStats.current.baseBoostableGoods || new BigNumber(0))
    .plus(curBoostedGoodsAmount);

  if (aidStats.max.baseGoodsByEra) {
    aidStats.max.goodsByEra = {};
    for (const [eraKey, baseAmt] of Object.entries(
      aidStats.max.baseGoodsByEra,
    )) {
      const boostablePart =
        aidStats.max.baseBoostableGoodsByEra?.[eraKey] || new BigNumber(0);
      const unboostablePart = baseAmt.minus(boostablePart);
      const boostAmt =
        goodsBoostPercent.gt(0) ?
          boostablePart
            .multipliedBy(goodsBoostPercent)
            .dividedBy(100)
            .integerValue(BigNumber.ROUND_HALF_UP)
        : new BigNumber(0);
      aidStats.max.goodsByEra[eraKey] = unboostablePart
        .plus(boostablePart)
        .plus(boostAmt);
    }
  }

  if (aidStats.current.baseGoodsByEra) {
    aidStats.current.goodsByEra = {};
    for (const [eraKey, baseAmt] of Object.entries(
      aidStats.current.baseGoodsByEra,
    )) {
      aidStats.current.goodsByEra[eraKey] = applyBoost(
        baseAmt,
        goodsBoostPercent,
      );
    }
  }

  // 3. Clan Goods Boost (grouped in units of 5)
  const maxClanGoodsBoostAmount =
    guildGoodsBoostPercent.gt(0) && aidStats.max.baseBoostableClanGoods ?
      aidStats.max.baseBoostableClanGoods
        .dividedBy(5)
        .multipliedBy(guildGoodsBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
        .multipliedBy(5)
    : new BigNumber(0);
  aidStats.max.clanGoodsBoostAmount = maxClanGoodsBoostAmount;
  aidStats.max.clanGoods = (
    aidStats.max.baseUnboostableClanGoods || new BigNumber(0)
  )
    .plus(aidStats.max.baseBoostableClanGoods || new BigNumber(0))
    .plus(maxClanGoodsBoostAmount);

  const curClanGoodsBoostAmount =
    guildGoodsBoostPercent.gt(0) && aidStats.current.baseBoostableClanGoods ?
      aidStats.current.baseBoostableClanGoods
        .dividedBy(5)
        .multipliedBy(guildGoodsBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
        .multipliedBy(5)
    : new BigNumber(0);
  aidStats.current.clanGoodsBoostAmount = curClanGoodsBoostAmount;
  aidStats.current.clanGoods = (
    aidStats.current.baseUnboostableClanGoods || new BigNumber(0)
  )
    .plus(aidStats.current.baseBoostableClanGoods || new BigNumber(0))
    .plus(curClanGoodsBoostAmount);

  // 4. Coins & Supplies Boost
  if (aidStats.max.baseCoins) {
    aidStats.max.coins = applyBoost(
      aidStats.max.baseCoins,
      coinBoostPercent,
      true,
    );
  }
  if (aidStats.current.baseCoins) {
    aidStats.current.coins = applyBoost(
      aidStats.current.baseCoins,
      coinBoostPercent,
      true,
    );
  }
  if (aidStats.max.baseSupplies) {
    aidStats.max.supplies = applyBoost(
      aidStats.max.baseSupplies,
      supplyBoostPercent,
      true,
    );
  }
  if (aidStats.current.baseSupplies) {
    aidStats.current.supplies = applyBoost(
      aidStats.current.baseSupplies,
      supplyBoostPercent,
      true,
    );
  }

  // 5. Net Differences (Max - Current)
  if (!aidStats.diff) aidStats.diff = {};
  for (const k of ['fp', 'goods', 'clanGoods', 'units', 'coins', 'supplies']) {
    if (aidStats.max[k] && aidStats.current[k]) {
      aidStats.diff[k] = aidStats.max[k].minus(aidStats.current[k]);
    }
  }

  return aidStats;
}

module.exports = {
  applyBoost,
  recordUnaided,
  finalizeUnaidedList,
  recalculateAidStatsBoosts,
};
module.exports.default = module.exports;
