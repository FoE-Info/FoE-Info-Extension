const { htmlToText } = require('../utils/html.mjs');
const { escapeHTMLAttribute } = require('../utils/escape.js');
/**
 * goodsTooltipFormatter.js
 *
 * Pure goods tooltip text/HTML builders and clan-goods aggregation extracted
 * from ui/renderLiveCityStats.js so msg/ can consume them without a ui edge.
 */

const BigNumber = require('bignumber.js');
const { toBigNumber } = require('./utils/bignumberUtils.js');

const { fGVGagesname } = require('./eraMapping.js');

let i18nModule = null;
try {
  i18nModule = require('../utils/i18n.js');
} catch {}

function tr(key, fallback) {
  const value = i18nModule?.t?.(key);
  return value && value !== key ? value : fallback;
}

/**
 * `boostValue` is required on every goods entry point. It previously defaulted
 * to `City?.goodsProductionBoost` through a `../state/` import, which inverted
 * the dependency direction; callers now pass it.
 *
 * Omitting it yields `undefined`, which the `boostValue > 0` guard treats as
 * "no boost" — a missing argument is a silent no-boost, not a crash. The
 * pinning test is tests/calc/goods-boost-injection.test.mjs.
 */
function fGoodsText(age, goods, boostValue) {
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

function fGoodsHTML(age, goods, currentGoods, boostValue) {
  const content = fGoodsText(age, goods, boostValue);
  const plainTitle = escapeHTMLAttribute(htmlToText(content).trim());
  const escapedContent = escapeHTMLAttribute(content);
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
  return `<span id="${escapeHTMLAttribute(age)}" data-bs-toggle="tooltip" data-bs-html="true" data-bs-placement="bottom" data-bs-title="${escapedContent}" title="${plainTitle}">${escapeHTMLAttribute(age.toUpperCase())}:${escapeHTMLAttribute(displayAmount)}</span> `;
}

function buildClanGoodsData(
  clanBuildingsList = [],
  boostValue,
  tooltipStore = null,
) {
  const boost = boostValue || 0;
  let totalClanGoods = new BigNumber(0);
  let unboostedBase = new BigNumber(0);

  if (clanBuildingsList.length > 0) {
    const groupedClan = {};
    clanBuildingsList.forEach((entry) => {
      const resolvedName =
        entry.displayName ||
        entry.name ||
        tr('unknown_building', 'Unknown Building');
      const eraSuffix = entry.era ? ' ' + fGVGagesname(entry.era) : '';
      const name =
        entry.era ? `${resolvedName}${eraSuffix}`
        : entry.name && entry.id && entry.name.length > entry.id.length ?
          entry.name.replace(entry.id, resolvedName)
        : resolvedName;

      const baseAmount = toBigNumber(entry.baseGoods ?? entry.goods ?? 0);
      unboostedBase = unboostedBase.plus(baseAmount);

      let effectiveGoods = baseAmount;
      if (entry.isBoostable && boost > 0) {
        const extra = baseAmount
          .dividedBy(5)
          .multipliedBy(new BigNumber(boost).dividedBy(100))
          .integerValue(BigNumber.ROUND_HALF_UP)
          .multipliedBy(5);
        effectiveGoods = effectiveGoods.plus(extra);
      }

      totalClanGoods = totalClanGoods.plus(effectiveGoods);

      if (!groupedClan[name]) {
        groupedClan[name] = { count: 0, totalGoods: new BigNumber(0) };
      }
      groupedClan[name].count++;
      groupedClan[name].totalGoods =
        groupedClan[name].totalGoods.plus(effectiveGoods);
    });

    const groupedClanList = Object.keys(groupedClan).map((name) => ({
      name,
      count: groupedClan[name].count,
      totalGoods: groupedClan[name].totalGoods,
    }));

    groupedClanList.sort((a, b) => b.totalGoods.comparedTo(a.totalGoods));

    let clanGoodsHtml = '';
    groupedClanList.forEach((item) => {
      const countStr = item.count > 1 ? ` (x${item.count})` : '';
      clanGoodsHtml += `${item.totalGoods} <strong>${item.name}</strong>${countStr}<br>`;
    });

    if (boost > 0 && totalClanGoods.gt(unboostedBase)) {
      clanGoodsHtml += `<br><strong>Base: ${unboostedBase} (+${boost}% Boost = ${totalClanGoods})</strong>`;
    }

    if (tooltipStore) {
      tooltipStore.clanGoods = clanGoodsHtml;
    }
  }

  return totalClanGoods.toNumber();
}

module.exports = { fGoodsText, fGoodsHTML, buildClanGoodsData };
