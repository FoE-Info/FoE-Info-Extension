/**
 * cityStatsTooltipBuilder.js
 *
 * Dynamically builds HTML popover content for City Stats:
 * - Daily FP building breakdown with current boost calculation
 * - Total Goods building breakdown
 * - Daily Units building breakdown
 *
 * Resolves building names dynamically on every invocation so newly resolved
 * CDN entity metadata automatically updates the tooltip content without baking
 * unresolved IDs.
 */

let helper = null;
try {
  helper = require('../../fn/helper.js');
} catch {}

let logger = null;
try {
  const { createLogger } = require('../../utils/logger.js');
  logger = createLogger('TooltipBuilder');
} catch {}
const {
  toBigNumber,
  boostedForgePoints,
} = require('../../calc/utils/bignumberUtils.js');

// Canonical escaping core (see utils/escape.js). The local copy that used to
// live here encoded `'` as `&#39;` where the core uses `&#039;`; both render
// as an apostrophe, so this is consolidation rather than a behaviour change.
const { escapeHTML } = require('../../utils/escape.js');
const escapeHtml = escapeHTML;

function buildFpTooltipHTML(fpBuildingsList, boost = 0, customHelper = helper) {
  if (
    !fpBuildingsList ||
    !Array.isArray(fpBuildingsList) ||
    fpBuildingsList.length === 0
  ) {
    return '';
  }

  const h = customHelper || helper;
  const groupedFp = {};
  // Forge-point accumulation and the boost factor stay in BigNumber (§11 MED):
  // `Math.round(baseBoostableFp * numBoost / 100)` on native doubles is the
  // arithmetic itself, not a display conversion, so it falls under the
  // explicit-rounding invariant. Rounding happens once, at the render boundary
  // below, after the arithmetic.
  let baseBoostableFp = toBigNumber(0);
  let baseUnboostableFp = toBigNumber(0);

  for (const entry of fpBuildingsList) {
    if (!entry) continue;
    const name =
      (h && typeof h.fEntityNameTrim === 'function' ?
        h.fEntityNameTrim(entry.id || entry.name)
      : null) ||
      entry.name ||
      entry.id ||
      'Unknown Building';

    if (!groupedFp[name]) {
      groupedFp[name] = { count: 0, totalFp: 0 };
    }
    const fpAmount = toBigNumber(entry.fp);
    groupedFp[name].count++;
    groupedFp[name].totalFp = toBigNumber(groupedFp[name].totalFp).plus(
      fpAmount,
    );

    if (entry.isBoostable) {
      baseBoostableFp = baseBoostableFp.plus(fpAmount);
    } else {
      baseUnboostableFp = baseUnboostableFp.plus(fpAmount);
    }
  }

  const unboostedBaseTotal = baseBoostableFp.plus(baseUnboostableFp);
  const numBoost = Number(boost) || 0;
  // Shared helper: base * percent / 100 rounded ROUND_HALF_UP, matching the
  // BigNumber twin at StartupService.js:628-631. A zero percent yields a zero
  // boost and the unboosted total, so this needs no special case.
  const { total: finalTotalFp } = boostedForgePoints(
    baseBoostableFp,
    baseUnboostableFp,
    numBoost,
  );

  const groupedFpList = Object.keys(groupedFp).map((name) => ({
    name,
    count: groupedFp[name].count,
    // Display boundary: convert once, after the arithmetic, for sort and render.
    totalFp: toBigNumber(groupedFp[name].totalFp).toNumber(),
  }));

  groupedFpList.sort((a, b) => b.totalFp - a.totalFp);

  let html = '';
  for (const item of groupedFpList) {
    const countStr = item.count > 1 ? ` (x${item.count})` : '';
    html += `${item.totalFp}FP <strong>${escapeHtml(item.name)}</strong>${countStr}<br>`;
  }

  if (numBoost > 0) {
    html += `<br><strong>Base: ${unboostedBaseTotal.toNumber()}FP (+${numBoost}% Boost = ${finalTotalFp.toNumber()}FP)</strong>`;
  }

  return html;
}

function buildTotalGoodsTooltipHTML(goodsBuildingsList, customHelper = helper) {
  if (
    !goodsBuildingsList ||
    !Array.isArray(goodsBuildingsList) ||
    goodsBuildingsList.length === 0
  ) {
    return '';
  }

  const h = customHelper || helper;
  const groupedGoods = {};
  for (const entry of goodsBuildingsList) {
    if (!entry) continue;
    const name =
      (h && typeof h.fEntityNameTrim === 'function' ?
        h.fEntityNameTrim(entry.id || entry.name)
      : null) ||
      entry.name ||
      entry.id ||
      'Unknown Building';

    if (!groupedGoods[name]) {
      groupedGoods[name] = { count: 0, totalGoods: 0 };
    }
    const goodsAmount = Number(entry.goods) || 0;
    groupedGoods[name].count++;
    groupedGoods[name].totalGoods += goodsAmount;
  }

  const groupedGoodsList = Object.keys(groupedGoods).map((name) => ({
    name,
    count: groupedGoods[name].count,
    totalGoods: groupedGoods[name].totalGoods,
  }));

  groupedGoodsList.sort((a, b) => b.totalGoods - a.totalGoods);

  let html = '';
  for (const item of groupedGoodsList) {
    const countStr = item.count > 1 ? ` (x${item.count})` : '';
    html += `${item.totalGoods} <strong>${escapeHtml(item.name)}</strong>${countStr}<br>`;
  }

  return html;
}

function buildUnitsTooltipHTML(unitBuildingsList, customHelper = helper) {
  if (
    !unitBuildingsList ||
    !Array.isArray(unitBuildingsList) ||
    unitBuildingsList.length === 0
  ) {
    return '';
  }

  const h = customHelper || helper;
  const groupedUnits = {};
  for (const entry of unitBuildingsList) {
    if (!entry) continue;
    const name =
      (h && typeof h.fEntityNameTrim === 'function' ?
        h.fEntityNameTrim(entry.id || entry.name)
      : null) ||
      entry.name ||
      entry.id ||
      'Unknown Building';

    if (!groupedUnits[name]) {
      groupedUnits[name] = { count: 0, totalUnits: 0 };
    }
    const rawAmt = entry.amount ?? entry.units;
    const unitAmount =
      Number(
        rawAmt && typeof rawAmt.toNumber === 'function' ?
          rawAmt.toNumber()
        : rawAmt,
      ) || 0;
    groupedUnits[name].count++;
    groupedUnits[name].totalUnits += unitAmount;
  }

  const groupedUnitsList = Object.keys(groupedUnits).map((name) => ({
    name,
    count: groupedUnits[name].count,
    amount: groupedUnits[name].totalUnits,
  }));

  groupedUnitsList.sort((a, b) => b.amount - a.amount);

  logger?.debug('Building units tooltip HTML', {
    buildingCount: unitBuildingsList.length,
    groupedCount: groupedUnitsList.length,
  });

  let html = '';
  for (const item of groupedUnitsList) {
    const countStr = item.count > 1 ? ` (x${item.count})` : '';
    html += `${item.amount} <strong>${escapeHtml(item.name)}</strong>${countStr}<br>`;
  }

  return html;
}

module.exports = {
  buildFpTooltipHTML,
  buildTotalGoodsTooltipHTML,
  buildUnitsTooltipHTML,
};
module.exports.default = module.exports;
