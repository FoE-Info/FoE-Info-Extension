/**
 * cityStatsTooltipBuilder.js
 *
 * Dynamically builds HTML popover content for City Stats:
 * - Daily FP building breakdown with current boost calculation
 * - Total Goods building breakdown
 *
 * Resolves building names dynamically on every invocation so newly resolved
 * CDN entity metadata automatically updates the tooltip content without baking
 * unresolved IDs.
 */

let helper = null;
try {
  helper = require('../../fn/helper.js');
} catch {}

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
  let baseBoostableFp = 0;
  let baseUnboostableFp = 0;

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
    const fpAmount = Number(entry.fp) || 0;
    groupedFp[name].count++;
    groupedFp[name].totalFp += fpAmount;

    if (entry.isBoostable) {
      baseBoostableFp += fpAmount;
    } else {
      baseUnboostableFp += fpAmount;
    }
  }

  const unboostedBaseTotal = baseBoostableFp + baseUnboostableFp;
  let finalTotalFp = unboostedBaseTotal;
  const numBoost = Number(boost) || 0;
  if (numBoost > 0) {
    const boostAmount = Math.round((baseBoostableFp * numBoost) / 100);
    finalTotalFp = unboostedBaseTotal + boostAmount;
  }

  const groupedFpList = Object.keys(groupedFp).map((name) => ({
    name,
    count: groupedFp[name].count,
    totalFp: groupedFp[name].totalFp,
  }));

  groupedFpList.sort((a, b) => b.totalFp - a.totalFp);

  let html = '';
  for (const item of groupedFpList) {
    const countStr = item.count > 1 ? ` (x${item.count})` : '';
    html += `${item.totalFp}FP <strong>${item.name}</strong>${countStr}<br>`;
  }

  if (numBoost > 0) {
    html += `<br><strong>Base: ${unboostedBaseTotal}FP (+${numBoost}% Boost = ${finalTotalFp}FP)</strong>`;
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
    html += `${item.totalGoods} <strong>${item.name}</strong>${countStr}<br>`;
  }

  return html;
}

module.exports = {
  buildFpTooltipHTML,
  buildTotalGoodsTooltipHTML,
};
module.exports.default = module.exports;
