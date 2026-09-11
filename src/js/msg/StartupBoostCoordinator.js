/**
 * StartupBoostCoordinator.js
 *
 * Coordinates live boost updates to City and DOM elements for FP and Guild Goods.
 * Decoupled from StartupService.js.
 */

const BigNumber = require('bignumber.js');
let Popover = null;
try {
  const bootstrap = require('bootstrap');
  Popover = bootstrap.Popover;
} catch {}
const { applyBoostsToCity } = require('./BoostService.js');

/**
 * Handles BoostService.getAllBoosts payload by applying boosts to City,
 * recalculating FP with boost multipliers, updating DOM tooltips, and triggering live render.
 *
 * @param {Object} params
 * @param {Object} params.msg - InnoGames BoostService RPC payload
 * @param {Object} params.City - Reactive city state
 * @param {Function} [params.updateCombatTotals] - Combat totals updater
 * @param {Object} [params.tooltipHTML] - Tooltip HTML cache
 * @param {Array} [params.clanGoodsBuildings] - Tracked clan goods buildings
 * @param {Function} [params.buildClanGoodsData] - Clan goods data generator
 * @param {Object} [params.lastStartupContext] - Cached startup context
 * @param {Function} [params.renderLiveCityStats] - City stats render function
 */
function handleBoostServiceAllBoosts({
  msg,
  City,
  updateCombatTotals,
  tooltipHTML,
  clanGoodsBuildings,
  buildClanGoodsData,
  lastStartupContext,
  renderLiveCityStats,
}) {
  applyBoostsToCity(msg, City);

  if (typeof updateCombatTotals === 'function') {
    updateCombatTotals();
  }

  if (City.fpProductionBoost) {
    const boostable = new BigNumber(City.baseBoostableFp || 0);
    const unboostable = new BigNumber(City.baseUnboostableFp || 0);
    const totalBase = boostable.plus(unboostable);
    if (totalBase.isGreaterThan(0)) {
      const boostMultiplier = new BigNumber(City.fpProductionBoost).dividedBy(
        100,
      );
      const boostAmount = boostable
        .multipliedBy(boostMultiplier)
        .integerValue(BigNumber.ROUND_HALF_UP);
      City.ForgePoints = totalBase.plus(boostAmount).toNumber();
    }
    const fpSpan =
      typeof document !== 'undefined' ? document.getElementById('fp') : null;
    if (fpSpan) {
      fpSpan.innerHTML = `<span data-i18n="daily">Daily</span>: ${City.ForgePoints}FP`;
      if (tooltipHTML?.fp && !tooltipHTML.fp.includes('Boost =')) {
        tooltipHTML.fp += `<br><strong>Base: ${totalBase.toString()}FP (+${City.fpProductionBoost}% Boost = ${City.ForgePoints}FP)</strong>`;
        fpSpan.setAttribute('data-bs-content', tooltipHTML.fp);
        const popover =
          Popover?.getInstance ? Popover.getInstance(fpSpan) : null;
        if (popover) {
          popover.setContent({ '.popover-body': tooltipHTML.fp });
        }
      }
    }
  }

  if (
    clanGoodsBuildings?.length > 0 &&
    typeof buildClanGoodsData === 'function'
  ) {
    const boostedClanGoods = buildClanGoodsData();
    if (lastStartupContext) {
      lastStartupContext.clanGoods = boostedClanGoods;
      if (!lastStartupContext.tooltipHTML) lastStartupContext.tooltipHTML = {};
      lastStartupContext.tooltipHTML.clanGoods = tooltipHTML?.clanGoods;
    }
    const clanSpan =
      typeof document !== 'undefined' ?
        document.getElementById('clanGoods')
      : null;
    if (clanSpan) {
      clanSpan.innerHTML = `<span data-i18n="guildgoods">Guild Goods</span>: ${boostedClanGoods}`;
      clanSpan.setAttribute('data-bs-content', tooltipHTML?.clanGoods);
    }
  }

  if (typeof renderLiveCityStats === 'function') {
    renderLiveCityStats();
  }
}

module.exports = {
  handleBoostServiceAllBoosts,
};
module.exports.default = module.exports;
