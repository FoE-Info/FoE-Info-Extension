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

function fGoodsText(age, goods, boostValue = City.goodsProductionBoost) {
  if (!goods) return '';
  const eraMap = {
    ba: 'BronzeAge',
    ia: 'IronAge',
    ema: 'EarlyMiddleAge',
    hma: 'HighMiddleAge',
    lma: 'LateMiddleAge',
    ca: 'ColonialAge',
    ina: 'IndustrialAge',
    pe: 'ProgressiveEra',
    me: 'ModernEra',
    pme: 'PostModernEra',
    ce: 'ContemporaryEra',
    te: 'TomorrowEra',
    fe: 'FutureEra',
    af: 'ArcticFuture',
    of: 'OceanicFuture',
    vf: 'VirtualFuture',
    sam: 'SpaceAgeMars',
    saab: 'SpaceAgeAsteroidBelt',
    sav: 'SpaceAgeVenus',
    sajm: 'SpaceAgeJupiterMoon',
    sat: 'SpaceAgeTitan',
    sash: 'SpaceAgeSpaceHub',
    sad: 'StellarAgeDiscovery',
  };
  const eraName = eraMap[age];
  let text = (eraName && goods[eraName]) || '';
  if (boostValue > 0 && text) {
    text = text.replace(/(\d+)\s+([^<]+)<br>/g, (m, count, name) => {
      const boosted = new BigNumber(count)
        .multipliedBy(
          new BigNumber(1).plus(new BigNumber(boostValue).dividedBy(100)),
        )
        .integerValue(BigNumber.ROUND_HALF_UP)
        .toString();
      return `${boosted} ${name}<br>`;
    });
  }
  return text;
}

function fGoodsHTML(
  age,
  goods,
  currentGoods = Goods,
  boostValue = City.goodsProductionBoost,
) {
  const content = fGoodsText(age, goods, boostValue);
  const plainTitle =
    content ?
      content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim()
    : '';
  const escapedContent =
    content ? content.replace(/'/g, '&#39;').replace(/"/g, '&quot;') : '';
  const boost = boostValue || 0;
  const rawAmount = (currentGoods && currentGoods[age]) || 0;
  const displayAmount =
    boost > 0 ?
      new BigNumber(rawAmount)
        .multipliedBy(
          new BigNumber(1).plus(new BigNumber(boost).dividedBy(100)),
        )
        .integerValue(BigNumber.ROUND_HALF_UP)
        .toNumber()
    : rawAmount;
  return `<span id="${age}" data-bs-toggle="tooltip" data-bs-html="true" data-bs-placement="bottom" data-bs-title="${escapedContent}" title="${plainTitle}">${age.toUpperCase()}:${displayAmount}</span> `;
}

function buildClanGoodsData(
  clanBuildingsList = [],
  boostValue = City.guildGoodsProductionBoost,
  tooltipStore = null,
) {
  const boost = boostValue || 0;
  let totalClanGoods = 0;
  let unboostedBase = 0;

  if (clanBuildingsList.length > 0) {
    const groupedClan = {};
    clanBuildingsList.forEach((entry) => {
      const resolvedName =
        (helper?.fEntityNameTrim &&
          helper.fEntityNameTrim(entry.id || entry.name)) ||
        entry.name ||
        'Unknown Building';
      const eraSuffix =
        entry.era ?
          ' ' +
          (helper?.fGVGagesname ? helper.fGVGagesname(entry.era) : entry.era)
        : '';
      const name =
        entry.era ? `${resolvedName}${eraSuffix}`
        : entry.name && entry.id && entry.name.length > entry.id.length ?
          entry.name.replace(entry.id, resolvedName)
        : resolvedName;

      const baseAmount = entry.baseGoods ?? entry.goods ?? 0;
      unboostedBase += baseAmount;

      let effectiveGoods = baseAmount;
      if (entry.isBoostable && boost > 0) {
        const extra = new BigNumber(baseAmount)
          .dividedBy(5)
          .multipliedBy(new BigNumber(boost).dividedBy(100))
          .integerValue(BigNumber.ROUND_HALF_UP)
          .multipliedBy(5)
          .toNumber();
        effectiveGoods += extra;
      }

      totalClanGoods += effectiveGoods;

      if (!groupedClan[name]) {
        groupedClan[name] = { count: 0, totalGoods: 0 };
      }
      groupedClan[name].count++;
      groupedClan[name].totalGoods += effectiveGoods;
    });

    const groupedClanList = Object.keys(groupedClan).map((name) => ({
      name,
      count: groupedClan[name].count,
      totalGoods: groupedClan[name].totalGoods,
    }));

    groupedClanList.sort((a, b) => b.totalGoods - a.totalGoods);

    let clanGoodsHtml = '';
    groupedClanList.forEach((item) => {
      const countStr = item.count > 1 ? ` (x${item.count})` : '';
      clanGoodsHtml += `${item.totalGoods} <strong>${item.name}</strong>${countStr}<br>`;
    });

    if (boost > 0 && totalClanGoods > unboostedBase) {
      clanGoodsHtml += `<br><strong>Base: ${unboostedBase} (+${boost}% Boost = ${totalClanGoods})</strong>`;
    }

    if (tooltipStore) {
      tooltipStore.clanGoods = clanGoodsHtml;
    }
  }

  return totalClanGoods;
}

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

  if (typeof renderCityStats === 'function') {
    try {
      const userTooltipHTML =
        typeof ctx.getUserTooltipHTML === 'function' ?
          ctx.getUserTooltipHTML()
        : '';
      const userTooltipHTMLEscaped = userTooltipHTML
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;');
      const origin =
        typeof ctx.getScoreDBOrigin === 'function' ?
          ctx.getScoreDBOrigin()
        : '';
      const userTitle = `Playing <strong>FoE</strong> since<br>${formatDate ? formatDate(MyInfo?.createdAt) : ''}`;

      const fpList =
        ctx.lastStartupContext?.fpBuildings || ctx.fpBuildings || [];
      const goodsList =
        ctx.lastStartupContext?.goodsBuildings || ctx.goodsBuildings || [];

      renderCityStats(
        'citystats',
        calculatedStats,
        {
          isOwnCity: true,
          name: user?.user_name || MyInfo?.name || 'My City',
          era: currentEra,
          score: user?.score ?? MyInfo?.score,
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
