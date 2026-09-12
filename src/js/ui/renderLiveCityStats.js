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
} catch {}

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

function renderLiveCityStats(ctx = {}) {
  const renderStart = performance.now();
  logger?.info(
    `[TIMING:P6] renderLiveCityStats() called | t = ${renderStart.toFixed(2)}ms`,
  );
  if (typeof window !== 'undefined') window.foeCity = City;
  const user = ctx.lastStartupContext?.user || MyInfo;
  const currentEra = user?.era || 'SpaceAgeSpaceHub';

  const goodsBoostPercent = new BigNumber(City.goodsProductionBoost || 0);
  const goodsBoostMultiplier =
    goodsBoostPercent.isGreaterThan(0) ?
      new BigNumber(1).plus(goodsBoostPercent.dividedBy(100))
    : null;

  const goodsByEra = {};
  let totalGoodsAmount = new BigNumber(0);
  let liveGoodsHTML = '';

  const activeGoodsTooltips =
    ctx.lastStartupContext?.tooltipHTML?.goods || ctx.tooltipHTML?.goods || {};

  const numAges = helper?.numAges || 23;
  for (let index = 0; index < numAges; index++) {
    const age =
      helper?.fGVGagesname && helper?.fAgefromLevel ?
        helper.fGVGagesname(helper.fAgefromLevel(numAges - index)).toLowerCase()
      : '';
    if (!age) continue;

    const rawAmt = (Goods && Goods[age]) || 0;
    if (rawAmt > 0) {
      const boostedAmt =
        goodsBoostMultiplier ?
          new BigNumber(rawAmt)
            .multipliedBy(goodsBoostMultiplier)
            .integerValue(BigNumber.ROUND_HALF_UP)
        : new BigNumber(rawAmt);
      goodsByEra[age] = boostedAmt;
      totalGoodsAmount = totalGoodsAmount.plus(boostedAmt);
      liveGoodsHTML += fGoodsHTML(
        age,
        activeGoodsTooltips,
        Goods,
        City.goodsProductionBoost,
      );
    }
  }

  const calculatedStats = {
    exactNumbers: true,
    availableFP:
      typeof ctx.availablePacksFP === 'number' ? ctx.availablePacksFP
      : typeof stateModule?.availablePacksFP === 'number' ?
        stateModule.availablePacksFP
      : availablePacksFP || 0,
    clanGoods: ctx.lastStartupContext?.clanGoods || 0,
    goodsHTML: liveGoodsHTML.trim(),
    goods: {
      total: totalGoodsAmount,
      boostPercent: goodsBoostPercent,
      byEra: goodsByEra,
      tooltipsByEra: activeGoodsTooltips,
    },
    fp: {
      total: new BigNumber(City.ForgePoints || 0),
      boostPercent: new BigNumber(City.fpProductionBoost || 0),
      boostable: new BigNumber(City.baseBoostableFp || 0),
      unboostable: new BigNumber(City.baseUnboostableFp || 0),
    },
    units: {
      daily: new BigNumber(City.TrazUnits || 0),
      traz: new BigNumber(City.TrazUnits || 0),
    },
    coins: {
      total: new BigNumber(City.Coins || 0)
        .multipliedBy(
          new BigNumber(1).plus(
            new BigNumber(City.CoinBoost || 0).dividedBy(100),
          ),
        )
        .integerValue(BigNumber.ROUND_FLOOR),
      boostPercent: new BigNumber(City.CoinBoost || 0),
    },
    supplies: {
      total: new BigNumber(City.Supplies || 0)
        .multipliedBy(
          new BigNumber(1).plus(
            new BigNumber(City.SupplyBoost || 0).dividedBy(100),
          ),
        )
        .integerValue(BigNumber.ROUND_FLOOR),
      boostPercent: new BigNumber(City.SupplyBoost || 0),
    },
    military: {
      red: {
        base: {
          att: new BigNumber(City.Attack || 0),
          def: new BigNumber(City.Defense || 0),
        },
        gbg: {
          att: new BigNumber(City.GBGAttackingAttack || 0).plus(
            City.Attack || 0,
          ),
          def: new BigNumber(City.GBGAttackingDefense || 0).plus(
            City.Defense || 0,
          ),
        },
        ge: {
          att: new BigNumber(City.GEAttackingAttack || 0).plus(
            City.Attack || 0,
          ),
          def: new BigNumber(City.GEAttackingDefense || 0).plus(
            City.Defense || 0,
          ),
        },
        qi: {
          att: new BigNumber(City.QIAttackingAttack || 0),
          def: new BigNumber(City.QIAttackingDefense || 0),
        },
      },
      blue: {
        base: {
          att: new BigNumber(City.CityAttack || 0),
          def: new BigNumber(City.CityDefense || 0),
        },
        gbg: {
          att: new BigNumber(City.GBGDefendingAttack || 0).plus(
            City.CityAttack || 0,
          ),
          def: new BigNumber(City.GBGDefendingDefense || 0).plus(
            City.CityDefense || 0,
          ),
        },
        ge: {
          att: new BigNumber(City.GEDefendingAttack || 0).plus(
            City.CityAttack || 0,
          ),
          def: new BigNumber(City.GEDefendingDefense || 0).plus(
            City.CityDefense || 0,
          ),
        },
        qi: {
          att: new BigNumber(City.QIDefendingAttack || 0),
          def: new BigNumber(City.QIDefendingDefense || 0),
        },
      },
    },
    special: {
      arcPercent: new BigNumber(City.ArcBonus || 0),
      chatBonus: new BigNumber(City.ChatBonus || 0),
      goodsPerQuest: new BigNumber(City.ChatBonus || 0)
        .dividedBy(20)
        .plus(5)
        .integerValue(BigNumber.ROUND_FLOOR),
    },
  };

  const renderCityStatsFn = ctx.renderCityStats || renderCityStats;
  if (typeof renderCityStatsFn === 'function') {
    try {
      const userTooltipHTML =
        typeof getUserTooltipHTML === 'function' ? getUserTooltipHTML()
        : typeof ctx.getUserTooltipHTML === 'function' ?
          ctx.getUserTooltipHTML()
        : '';
      const userTooltipHTMLEscaped = userTooltipHTML
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;');
      const origin =
        typeof getScoreDBOrigin === 'function' ? getScoreDBOrigin()
        : typeof ctx.getScoreDBOrigin === 'function' ? ctx.getScoreDBOrigin()
        : '';
      const userTitle = `Playing <strong>FoE</strong> since<br>${formatDate ? formatDate(MyInfo?.createdAt) : ''}`;

      const fpList =
        ctx.lastStartupContext?.fpBuildings || ctx.fpBuildings || [];
      const goodsList =
        ctx.lastStartupContext?.goodsBuildings || ctx.goodsBuildings || [];

      renderCityStatsFn(
        'citystats',
        calculatedStats,
        {
          isOwnCity: true,
          name: user?.user_name || MyInfo?.name || 'My City',
          era: currentEra,
          score:
            (Number(MyInfo?.score) > 0 ? Number(MyInfo.score) : null) ??
            (Number(user?.score) > 0 ? Number(user.score) : null) ??
            (storage?.getSync ?
              Number(storage.getSync('playerScore')) || null
            : null) ??
            0,
          guild: user?.clan_name || MyInfo?.clan || '',
          totalGoods: totalGoodsAmount,
          goodsBoostPercent: goodsBoostPercent,
          goodsByEra: goodsByEra,
          goodsHTML: liveGoodsHTML.trim(),
          clanGoods: calculatedStats.clanGoods,
          clanGoodsTooltipHTML:
            ctx.lastStartupContext?.tooltipHTML?.clanGoods ||
            ctx.tooltipHTML?.clanGoods,
          fpTooltipHTML:
            (buildFpTooltipHTML &&
              buildFpTooltipHTML(fpList, City.fpProductionBoost)) ||
            ctx.lastStartupContext?.tooltipHTML?.fp ||
            ctx.tooltipHTML?.fp,
          totalGoodsTooltipHTML:
            (buildTotalGoodsTooltipHTML &&
              buildTotalGoodsTooltipHTML(goodsList)) ||
            ctx.lastStartupContext?.tooltipHTML?.totalGoods ||
            ctx.tooltipHTML?.totalGoods,
          availableFP: calculatedStats.availableFP,
          userTooltipHTML: userTooltipHTMLEscaped,
          userTitle: userTitle,
          origin: origin ? origin.toUpperCase() : '',
        },
        {
          collapseStats: ctx.lastStartupContext?.collapseStats,
          unitsTooltipHTML:
            buildUnitsTooltipHTML ?
              buildUnitsTooltipHTML(calculatedStats.units?.buildings)
            : '',
        },
      );
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
  default: {
    renderLiveCityStats,
    fGoodsHTML,
    fGoodsText,
    buildClanGoodsData,
    buildFpTooltipHTML,
    buildTotalGoodsTooltipHTML,
    buildUnitsTooltipHTML,
  },
};
