/**
 * liveCityGoodsAggregator.js
 *
 * Aggregates live goods by era with boosts, tooltips, and HTML generation.
 * Extracted from ui/renderLiveCityStats.js for modularity.
 * Dual CJS/ESM compatible.
 */

const BigNumber = require('bignumber.js');

let defaultFGoodsHTML = null;
try {
  ({
    fGoodsHTML: defaultFGoodsHTML,
  } = require('../calc/goodsTooltipFormatter.js'));
} catch {}

let defaultGetEraAcronym = (era) => String(era || '').toUpperCase();
try {
  ({
    getEraAcronym: defaultGetEraAcronym,
  } = require('../calc/utils/eraUtils.js'));
} catch {}

/**
 * Aggregates live goods production across eras.
 *
 * @param {Object} options
 * @param {Object} [options.city={}] - City state object.
 * @param {Object} [options.aidStats=null] - Aid stats with optional max production.
 * @param {Object} [options.goods=null] - Current goods map by age.
 * @param {Object} [options.helper=null] - Helper providing age level conversion.
 * @param {Object} [options.activeGoodsTooltips={}] - Tooltip HTML mappings by era.
 * @param {Function} [options.getEraAcronymFn] - Custom era acronym resolver.
 * @param {Function} [options.fGoodsHTMLFn] - Custom goods HTML formatter.
 * @returns {Object} Aggregated goods summary.
 */
function aggregateLiveGoods({
  city = {},
  aidStats = null,
  goods = null,
  helper = null,
  activeGoodsTooltips = {},
  getEraAcronymFn = null,
  fGoodsHTMLFn = null,
} = {}) {
  const resolveAcronym = getEraAcronymFn || defaultGetEraAcronym;
  const formatGoodsHTML = fGoodsHTMLFn || defaultFGoodsHTML;

  const goodsBoostPercent = new BigNumber(city?.goodsProductionBoost || 0);
  const goodsBoostMultiplier =
    goodsBoostPercent.isGreaterThan(0) ?
      new BigNumber(1).plus(goodsBoostPercent.dividedBy(100))
    : null;

  const maxEraGoodsMap = {};
  if (aidStats?.max?.goodsByEra) {
    for (const [eraKey, amt] of Object.entries(aidStats.max.goodsByEra)) {
      const acronym = resolveAcronym(eraKey).toLowerCase();
      const bnAmt = BigNumber.isBigNumber(amt) ? amt : new BigNumber(amt || 0);
      if (bnAmt.gt(0)) {
        maxEraGoodsMap[acronym] = (
          maxEraGoodsMap[acronym] || new BigNumber(0)
        ).plus(bnAmt);
      }
    }
  }
  const hasMaxEraGoods = Object.keys(maxEraGoodsMap).length > 0;

  const goodsByEra = {};
  let totalGoodsAmount = new BigNumber(0);
  let liveGoodsHTML = '';

  const numAges = helper?.numAges || 23;
  for (let index = 0; index < numAges; index++) {
    const age =
      helper?.fGVGagesname && helper?.fAgefromLevel ?
        helper.fGVGagesname(helper.fAgefromLevel(numAges - index)).toLowerCase()
      : '';
    if (!age) continue;

    const maxAmtBn = maxEraGoodsMap[age];
    const rawAmt =
      hasMaxEraGoods ?
        maxAmtBn ? maxAmtBn.toNumber()
        : 0
      : (goods && goods[age]) || 0;

    if (rawAmt > 0) {
      const boostedAmt =
        hasMaxEraGoods ? maxAmtBn || new BigNumber(rawAmt)
        : goodsBoostMultiplier ?
          new BigNumber(rawAmt)
            .multipliedBy(goodsBoostMultiplier)
            .integerValue(BigNumber.ROUND_HALF_UP)
        : new BigNumber(rawAmt);

      goodsByEra[age] = boostedAmt;
      totalGoodsAmount = totalGoodsAmount.plus(boostedAmt);

      if (typeof formatGoodsHTML === 'function') {
        liveGoodsHTML += formatGoodsHTML(
          age,
          activeGoodsTooltips,
          hasMaxEraGoods ? { [age]: boostedAmt.toNumber() } : goods,
          hasMaxEraGoods ? 0 : city?.goodsProductionBoost || 0,
        );
      }
    }
  }

  if (aidStats?.max?.goods && aidStats.max.goods.gt(0)) {
    totalGoodsAmount = aidStats.max.goods;
  }

  return {
    goodsBoostPercent,
    goodsBoostMultiplier,
    goodsByEra,
    totalGoodsAmount,
    liveGoodsHTML,
  };
}

module.exports = {
  aggregateLiveGoods,
};
module.exports.default = module.exports;
