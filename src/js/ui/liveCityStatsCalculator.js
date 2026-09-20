/**
 * liveCityStatsCalculator.js
 *
 * Calculates comprehensive live city statistics including resources,
 * military offense/defense profiles, and special boosts.
 * Extracted from ui/renderLiveCityStats.js for modularity.
 * Dual CJS/ESM compatible.
 */

const BigNumber = require('bignumber.js');

/**
 * Computes the complete calculatedStats payload for live city view.
 *
 * @param {Object} options
 * @param {Object} [options.city={}] - City state containing boosts and base values.
 * @param {Object} [options.aidStats=null] - Aid stats with optional max calculations.
 * @param {Object} [options.ctx={}] - Startup context.
 * @param {number} [options.availableFP=0] - Available FP inventory amount.
 * @param {Object} [options.goodsData={}] - Aggregated goods data from liveCityGoodsAggregator.
 * @returns {Object} Structured calculatedStats object.
 */
function calculateLiveCityStats({
  city = {},
  aidStats = null,
  ctx = {},
  availableFP = 0,
  goodsData = {},
} = {}) {
  const maxTotalFp =
    aidStats?.max?.fp && aidStats.max.fp.gt(0) ?
      aidStats.max.fp
    : new BigNumber(city?.ForgePoints || 0);

  const maxUnits =
    aidStats?.max?.units && aidStats.max.units.gt(0) ?
      aidStats.max.units.integerValue(BigNumber.ROUND_FLOOR)
    : new BigNumber(city?.TrazUnits || 0).integerValue(BigNumber.ROUND_FLOOR);

  const maxClanGoods =
    aidStats?.max?.clanGoods && aidStats.max.clanGoods.gt(0) ?
      aidStats.max.clanGoods.toNumber()
    : ctx?.lastStartupContext?.clanGoods || 0;

  const maxCoins =
    aidStats?.max?.coins && aidStats.max.coins.gt(0) ?
      aidStats.max.coins
    : new BigNumber(city?.Coins || 0)
        .multipliedBy(
          new BigNumber(1).plus(
            new BigNumber(city?.CoinBoost || 0).dividedBy(100),
          ),
        )
        .integerValue(BigNumber.ROUND_FLOOR);

  const maxSupplies =
    aidStats?.max?.supplies && aidStats.max.supplies.gt(0) ?
      aidStats.max.supplies
    : new BigNumber(city?.Supplies || 0)
        .multipliedBy(
          new BigNumber(1).plus(
            new BigNumber(city?.SupplyBoost || 0).dividedBy(100),
          ),
        )
        .integerValue(BigNumber.ROUND_FLOOR);

  const totalGoodsAmount = goodsData.totalGoodsAmount || new BigNumber(0);
  const goodsBoostPercent =
    goodsData.goodsBoostPercent ||
    new BigNumber(city?.goodsProductionBoost || 0);
  const goodsByEra = goodsData.goodsByEra || {};
  const activeGoodsTooltips =
    goodsData.activeGoodsTooltips ||
    ctx?.lastStartupContext?.tooltipHTML?.goods ||
    ctx?.tooltipHTML?.goods ||
    {};
  const liveGoodsHTML = goodsData.liveGoodsHTML || '';

  return {
    exactNumbers: true,
    aidStats,
    availableFP,
    clanGoods: maxClanGoods,
    goodsHTML: liveGoodsHTML.trim(),
    goods: {
      total: totalGoodsAmount,
      boostPercent: goodsBoostPercent,
      byEra: goodsByEra,
      tooltipsByEra: activeGoodsTooltips,
    },
    fp: {
      total: maxTotalFp,
      boostPercent: new BigNumber(city?.fpProductionBoost || 0),
      boostable: new BigNumber(city?.baseBoostableFp || 0),
      unboostable: new BigNumber(city?.baseUnboostableFp || 0),
    },
    units: {
      daily: maxUnits,
      traz: maxUnits,
    },
    coins: {
      total: maxCoins,
      boostPercent: new BigNumber(city?.CoinBoost || 0),
    },
    supplies: {
      total: maxSupplies,
      boostPercent: new BigNumber(city?.SupplyBoost || 0),
    },
    military: {
      red: {
        base: {
          att: new BigNumber(city?.Attack || 0),
          def: new BigNumber(city?.Defense || 0),
        },
        gbg: {
          att: new BigNumber(city?.GBGAttackingAttack || 0).plus(
            city?.Attack || 0,
          ),
          def: new BigNumber(city?.GBGAttackingDefense || 0).plus(
            city?.Defense || 0,
          ),
        },
        ge: {
          att: new BigNumber(city?.GEAttackingAttack || 0).plus(
            city?.Attack || 0,
          ),
          def: new BigNumber(city?.GEAttackingDefense || 0).plus(
            city?.Defense || 0,
          ),
        },
        qi: {
          att: new BigNumber(city?.QIAttackingAttack || 0),
          def: new BigNumber(city?.QIAttackingDefense || 0),
        },
      },
      blue: {
        base: {
          att: new BigNumber(city?.CityAttack || 0),
          def: new BigNumber(city?.CityDefense || 0),
        },
        gbg: {
          att: new BigNumber(city?.GBGDefendingAttack || 0).plus(
            city?.CityAttack || 0,
          ),
          def: new BigNumber(city?.GBGDefendingDefense || 0).plus(
            city?.CityDefense || 0,
          ),
        },
        ge: {
          att: new BigNumber(city?.GEDefendingAttack || 0).plus(
            city?.CityAttack || 0,
          ),
          def: new BigNumber(city?.GEDefendingDefense || 0).plus(
            city?.CityDefense || 0,
          ),
        },
        qi: {
          att: new BigNumber(city?.QIDefendingAttack || 0),
          def: new BigNumber(city?.QIDefendingDefense || 0),
        },
      },
    },
    special: {
      arcPercent: new BigNumber(city?.ArcBonus || 0),
      chatBonus: new BigNumber(city?.ChatBonus || 0),
      goodsPerQuest: new BigNumber(city?.ChatBonus || 0)
        .dividedBy(20)
        .plus(5)
        .integerValue(BigNumber.ROUND_FLOOR),
      aoCriticalStrike: new BigNumber(city?.AOCriticalStrike || 0),
      ccCriticalStrike: new BigNumber(city?.CCCriticalStrike || 0),
      criticalStrike: new BigNumber(city?.AOCriticalStrike || 0).plus(
        new BigNumber(city?.CCCriticalStrike || 0),
      ),
    },
  };
}

module.exports = {
  calculateLiveCityStats,
};
module.exports.default = module.exports;
