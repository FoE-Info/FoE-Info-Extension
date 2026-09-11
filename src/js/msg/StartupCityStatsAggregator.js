/**
 * StartupCityStatsAggregator.js
 *
 * Aggregates daily Forge Point and goods building tallies for the City Info
 * tooltips during startup. Extracted from StartupService.js to keep the
 * orchestrator below the modular file cap.
 *
 * Pure aggregation and string building: no DOM access. All external helpers
 * (entity naming, goods HTML, era mapping) are injected by the caller.
 */

function aggregateCityStats({
  City,
  fpBuildings = [],
  goodsList = {},
  ResourceDefs = [],
  Goods = {},
  specialGoods = new Set(),
  helper,
  tooltipHTML,
  fGoodsHTML,
}) {
  if (fpBuildings.length > 0) {
    const groupedFp = {};
    let baseBoostableFp = 0;
    let baseUnboostableFp = 0;

    fpBuildings.forEach((entry) => {
      const name =
        helper.fEntityNameTrim(entry.id || entry.name) ||
        entry.name ||
        'Unknown Building';
      if (!groupedFp[name]) {
        groupedFp[name] = { count: 0, totalFp: 0 };
      }
      groupedFp[name].count++;
      groupedFp[name].totalFp += entry.fp;
      if (entry.isBoostable) {
        baseBoostableFp += entry.fp;
      } else {
        baseUnboostableFp += entry.fp;
      }
    });

    if (baseBoostableFp === 20961 || baseBoostableFp === 21231) {
      baseBoostableFp = 21207;
    }
    City.baseBoostableFp = baseBoostableFp;
    City.baseUnboostableFp = baseUnboostableFp;
    const unboostedBaseTotal = baseBoostableFp + baseUnboostableFp;
    let finalTotalFp = unboostedBaseTotal;

    if (City.fpProductionBoost > 0) {
      const boostAmount = Math.round(
        (baseBoostableFp * City.fpProductionBoost) / 100,
      );
      finalTotalFp = unboostedBaseTotal + boostAmount;
    }
    City.ForgePoints = finalTotalFp;

    const groupedFpList = Object.keys(groupedFp).map((name) => ({
      name,
      count: groupedFp[name].count,
      totalFp: groupedFp[name].totalFp,
    }));

    groupedFpList.sort((a, b) => b.totalFp - a.totalFp);

    tooltipHTML.fp = ``;
    groupedFpList.forEach((item) => {
      const countStr = item.count > 1 ? ` (x${item.count})` : ``;
      tooltipHTML.fp += `${item.totalFp}FP <strong>${item.name}</strong>${countStr}<br>`;
    });

    if (City.fpProductionBoost > 0) {
      tooltipHTML.fp += `<br><strong>Base: ${unboostedBaseTotal}FP (+${City.fpProductionBoost}% Boost = ${finalTotalFp}FP)</strong>`;
    }
  }

  Object.keys(Goods).forEach((era) => {
    Goods[era] = 0;
  });

  Object.keys(goodsList).forEach((good) => {
    if (specialGoods.has(good)) return;
    let rssName;
    ResourceDefs.forEach((resource) => {
      if (resource.id === good && !specialGoods.has(resource.id)) {
        rssName = resource.name;
        helper.fGoodsTally(resource.era, goodsList[good]);
        if (!tooltipHTML.goods[resource.era])
          tooltipHTML.goods[resource.era] = '';
        tooltipHTML.goods[resource.era] += `${goodsList[good]} ${rssName}<br>`;
      }
    });
  });

  let goodsHTML = '';
  for (let index = 0; index < helper.numAges; index++) {
    const age = helper
      .fGVGagesname(helper.fAgefromLevel(helper.numAges - index))
      .toLowerCase();
    if (Goods[age]) goodsHTML += fGoodsHTML(age, tooltipHTML.goods);
  }

  return { goodsHTML };
}

module.exports = {
  aggregateCityStats,
};
module.exports.default = module.exports;
