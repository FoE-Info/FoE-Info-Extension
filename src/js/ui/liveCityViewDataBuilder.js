/**
 * liveCityViewDataBuilder.js
 *
 * Assembles view data payload and rendering options for renderCityStats panel.
 * Extracted from ui/renderLiveCityStats.js for modularity.
 * Dual CJS/ESM compatible.
 */

/**
 * Builds the player and city view data payload for the city stats panel.
 *
 * @param {Object} params
 * @returns {{ viewData: Object, renderOpts: Object }}
 */
function buildLiveCityViewData({
  user = null,
  myInfo = null,
  currentEra = 'SpaceAgeSpaceHub',
  goodsData = {},
  calculatedStats = {},
  ctx = {},
  city = {},
  formatDate = null,
  storage = null,
  getUserTooltipHTML = null,
  getScoreDBOrigin = null,
  buildFpTooltipHTML = null,
  buildTotalGoodsTooltipHTML = null,
  buildUnitsTooltipHTML = null,
} = {}) {
  const userTooltipHTML =
    typeof getUserTooltipHTML === 'function' ? getUserTooltipHTML()
    : typeof ctx.getUserTooltipHTML === 'function' ? ctx.getUserTooltipHTML()
    : '';
  const userTooltipHTMLEscaped = userTooltipHTML
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');

  const origin =
    typeof getScoreDBOrigin === 'function' ? getScoreDBOrigin()
    : typeof ctx.getScoreDBOrigin === 'function' ? ctx.getScoreDBOrigin()
    : '';

  const userTitle = `Playing <strong>FoE</strong> since<br>${formatDate ? formatDate(myInfo?.createdAt) : ''}`;

  const fpList = ctx.lastStartupContext?.fpBuildings || ctx.fpBuildings || [];
  const goodsList =
    ctx.lastStartupContext?.goodsBuildings || ctx.goodsBuildings || [];

  const viewData = {
    isOwnCity: true,
    name: user?.user_name || myInfo?.name || 'My City',
    era: currentEra,
    score:
      (Number(myInfo?.score) > 0 ? Number(myInfo.score) : null) ??
      (Number(user?.score) > 0 ? Number(user.score) : null) ??
      (storage?.getSync ?
        Number(storage.getSync('playerScore')) || null
      : null) ??
      0,
    guild: user?.clan_name || myInfo?.clan || '',
    totalGoods: goodsData.totalGoodsAmount,
    goodsBoostPercent: goodsData.goodsBoostPercent,
    goodsByEra: goodsData.goodsByEra,
    goodsHTML: (goodsData.liveGoodsHTML || '').trim(),
    clanGoods: calculatedStats.clanGoods,
    clanGoodsTooltipHTML:
      ctx.lastStartupContext?.tooltipHTML?.clanGoods ||
      ctx.tooltipHTML?.clanGoods,
    fpTooltipHTML:
      (buildFpTooltipHTML &&
        buildFpTooltipHTML(fpList, city?.fpProductionBoost)) ||
      ctx.lastStartupContext?.tooltipHTML?.fp ||
      ctx.tooltipHTML?.fp,
    totalGoodsTooltipHTML:
      (buildTotalGoodsTooltipHTML && buildTotalGoodsTooltipHTML(goodsList)) ||
      ctx.lastStartupContext?.tooltipHTML?.totalGoods ||
      ctx.tooltipHTML?.totalGoods,
    availableFP: calculatedStats.availableFP,
    userTooltipHTML: userTooltipHTMLEscaped,
    userTitle: userTitle,
    origin: origin ? origin.toUpperCase() : '',
    aidStats: calculatedStats.aidStats,
  };

  const renderOpts = {
    collapseStats: ctx.lastStartupContext?.collapseStats,
    unitsTooltipHTML:
      buildUnitsTooltipHTML ?
        buildUnitsTooltipHTML(calculatedStats.units?.buildings)
      : '',
  };

  return { viewData, renderOpts };
}

module.exports = {
  buildLiveCityViewData,
};
module.exports.default = module.exports;
