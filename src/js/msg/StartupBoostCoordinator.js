/**
 * StartupBoostCoordinator.js
 *
 * Coordinates live boost updates to City and DOM elements for FP and Guild Goods.
 * Decoupled from StartupService.js.
 */

const BigNumber = require('bignumber.js');
const { createLogger } = require('../utils/logger.js');
const logger = createLogger('StartupBoostCoordinator');
let Popover = null;
try {
  const bootstrap = require('bootstrap');
  Popover = bootstrap.Popover;
} catch {}
const { applyBoostsToCity } = require('./BoostService.js');

/**
 * Wire the BoostService live-update stream to a callback. Keeps the
 * department wiring out of the StartupService monolith.
 *
 * @param {Function} onUpdate - Handler invoked with each getAllBoosts payload
 * @returns {boolean} true when a subscription was registered
 */
function subscribeBoostUpdates(onUpdate) {
  if (typeof onUpdate !== 'function') return false;
  try {
    const { boostService } = require('./BoostService.js');
    if (boostService && typeof boostService.onBoostsUpdated === 'function') {
      boostService.onBoostsUpdated(onUpdate);
      return true;
    }
  } catch (err) {
    logger.warn('failed to subscribe to live boost updates', err);
  }
  return false;
}

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
  subscribeBoostUpdates,
};
module.exports.default = module.exports;
