/**
 * goodsTooltipFormatter.js
 *
 * Pure goods tooltip text/HTML builders and clan-goods aggregation extracted
 * from ui/renderLiveCityStats.js so msg/ can consume them without a ui edge.
 */

const BigNumber = require('bignumber.js');

let City = null;
try {
  ({ City } = require('../state/CityState.js'));
} catch {}

let Goods = null;
try {
  Goods = require('../vars/state.js')?.Goods;
} catch {}

let helper = null;
try {
  helper = require('../fn/helper.js');
} catch {}

let i18nModule = null;
try {
  i18nModule = require('../utils/i18n.js');
} catch {}

function tr(key, fallback) {
  const value = i18nModule?.t?.(key);
  return value && value !== key ? value : fallback;
}

function fGoodsText(age, goods, boostValue = City?.goodsProductionBoost || 0) {
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
  boostValue = City?.goodsProductionBoost || 0,
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
  boostValue = City?.guildGoodsProductionBoost || 0,
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
        tr('unknown_building', 'Unknown Building');
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

module.exports = { fGoodsText, fGoodsHTML, buildClanGoodsData };
module.exports.default = module.exports;
