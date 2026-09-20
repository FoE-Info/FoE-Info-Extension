/**
 * renderLiveCityStats.js
 *
 * Live city stats rendering and goods HTML/text generators.
 * Decoupled from StartupService monolith.
 * Dual CJS/ESM compatible.
 */

const BigNumber = require('bignumber.js');
const { City } = require('../state/CityState.js');

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('CityStatsRender');
} catch {}

let helper = null;
try {
  helper = require('../fn/helper.js');
} catch {
  try {
    helper = require('../calc/eraMapping.js');
  } catch {}
}

let renderCityStats = null;
try {
  ({ renderCityStats } = require('./renderCityStats.js'));
} catch {
  try {
    ({ renderCityStats } = require('../fn/renderCityStats.js'));
  } catch {}
}

let buildFpTooltipHTML = null;
let buildTotalGoodsTooltipHTML = null;
let buildUnitsTooltipHTML = null;
try {
  ({
    buildFpTooltipHTML,
    buildTotalGoodsTooltipHTML,
    buildUnitsTooltipHTML,
  } = require('./components/cityStatsTooltipBuilder.js'));
} catch {}

let formatDate = null;
try {
  ({ formatDate } = require('../utils/date.js'));
} catch {
  formatDate = (ts) => (ts ? String(ts) : '');
}

let storage = null;
try {
  storage = require('../utils/storage.js');
} catch {}

let getUserTooltipHTML = null;
let getScoreDBOrigin = null;
try {
  ({ getUserTooltipHTML, getScoreDBOrigin } = require('./playerTooltip.js'));
} catch {}

let MyInfo = null;
let Goods = null;
let stateModule = null;
let availablePacksFP = 0;
try {
  stateModule = require('../vars/state.js');
  MyInfo = stateModule?.MyInfo;
  Goods = stateModule?.Goods;
  availablePacksFP = stateModule?.availablePacksFP || 0;
} catch {}

const {
  fGoodsText,
  fGoodsHTML,
  buildClanGoodsData,
} = require('../calc/goodsTooltipFormatter.js');

let getEraAcronym = (era) => String(era || '').toUpperCase();
try {
  ({ getEraAcronym } = require('../calc/utils/eraUtils.js'));
} catch {}

let aggregateLiveGoods = null;
try {
  ({ aggregateLiveGoods } = require('./liveCityGoodsAggregator.js'));
} catch {}

let calculateLiveCityStats = null;
try {
  ({ calculateLiveCityStats } = require('./liveCityStatsCalculator.js'));
} catch {}

let buildLiveCityViewData = null;
try {
  ({ buildLiveCityViewData } = require('./liveCityViewDataBuilder.js'));
} catch {}

function renderLiveCityStats(ctx = {}) {
  const renderStart = performance.now();
  logger?.info(
    `[TIMING:P6] renderLiveCityStats() called | t = ${renderStart.toFixed(2)}ms`,
  );
  if (typeof window !== 'undefined') window.foeCity = City;
  const user = ctx.lastStartupContext?.user || MyInfo;
  const currentEra = user?.era || 'SpaceAgeSpaceHub';

  const aidStats =
    ctx.lastStartupContext?.aidStats || ctx.aidStats || City.aidStats || null;
  const activeGoodsTooltips =
    ctx.lastStartupContext?.tooltipHTML?.goods || ctx.tooltipHTML?.goods || {};
  const activeHelper = ctx.helper || helper;

  const goodsData =
    typeof aggregateLiveGoods === 'function' ?
      aggregateLiveGoods({
        city: City,
        aidStats,
        goods: Goods,
        helper: activeHelper,
        activeGoodsTooltips,
        getEraAcronymFn: getEraAcronym,
        fGoodsHTMLFn: fGoodsHTML,
      })
    : {
        goodsBoostPercent: new BigNumber(City?.goodsProductionBoost || 0),
        goodsBoostMultiplier: null,
        goodsByEra: {},
        totalGoodsAmount: new BigNumber(0),
        liveGoodsHTML: '',
      };

  const resolvedAvailableFP =
    typeof ctx.availablePacksFP === 'number' ? ctx.availablePacksFP
    : typeof stateModule?.availablePacksFP === 'number' ?
      stateModule.availablePacksFP
    : availablePacksFP || 0;

  const calculatedStats =
    typeof calculateLiveCityStats === 'function' ?
      calculateLiveCityStats({
        city: City,
        aidStats,
        ctx,
        availableFP: resolvedAvailableFP,
        goodsData: {
          ...goodsData,
          activeGoodsTooltips,
        },
      })
    : {
        exactNumbers: true,
        aidStats,
        availableFP: resolvedAvailableFP,
        goods: {
          total: goodsData.totalGoodsAmount,
          boostPercent: goodsData.goodsBoostPercent,
          byEra: goodsData.goodsByEra,
          tooltipsByEra: activeGoodsTooltips,
        },
        goodsHTML: goodsData.liveGoodsHTML.trim(),
      };

  const hasPlayerData = Boolean(
    ctx.forceRender ||
    ctx.lastStartupContext?.user ||
    MyInfo?.name ||
    (MyInfo?.id && MyInfo.id !== 0) ||
    user?.user_name ||
    (user?.id && user.id !== 0),
  );

  const renderCityStatsFn = ctx.renderCityStats || renderCityStats;
  if (typeof renderCityStatsFn === 'function' && hasPlayerData) {
    try {
      if (typeof buildLiveCityViewData === 'function') {
        const { viewData, renderOpts } = buildLiveCityViewData({
          user,
          myInfo: MyInfo,
          currentEra,
          goodsData,
          calculatedStats,
          ctx,
          city: City,
          formatDate,
          storage,
          getUserTooltipHTML,
          getScoreDBOrigin,
          buildFpTooltipHTML,
          buildTotalGoodsTooltipHTML,
          buildUnitsTooltipHTML,
        });
        renderCityStatsFn('citystats', calculatedStats, viewData, renderOpts);
      }
      const renderEnd = performance.now();
      logger?.info(
        `[TIMING:P6] renderCityStats panel DOM updated | duration = ${(renderEnd - renderStart).toFixed(2)}ms | t = ${renderEnd.toFixed(2)}ms`,
      );
    } catch (err) {
      console.warn('Live citystats render error:', err);
    }
  }

  return calculatedStats;
}

module.exports = {
  renderLiveCityStats,
  fGoodsHTML,
  fGoodsText,
  buildClanGoodsData,
  buildFpTooltipHTML,
  buildTotalGoodsTooltipHTML,
  buildUnitsTooltipHTML,
  aggregateLiveGoods,
  calculateLiveCityStats,
  buildLiveCityViewData,
  default: {
    renderLiveCityStats,
    fGoodsHTML,
    fGoodsText,
    buildClanGoodsData,
    buildFpTooltipHTML,
    buildTotalGoodsTooltipHTML,
    buildUnitsTooltipHTML,
    aggregateLiveGoods,
    calculateLiveCityStats,
    buildLiveCityViewData,
  },
};
