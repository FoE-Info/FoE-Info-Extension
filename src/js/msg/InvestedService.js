/**
 * InvestedService.js
 *
 * InnoGames JSON-RPC service handler for GreatBuildingsService.getContributions.
 * Decoupled from GreatBuildingsService monolith, computing invested returns
 * with Arc boost calculations and publishing them to InvestedState.
 */

const { calculateInvestments } = require('../calc/InvestedCalculator.js');
const { investedState } = require('../state/InvestedState.js');

let City;
try {
  ({ City } = require('./StartupService.js'));
} catch (e) {
  City = {};
}

/**
 * Modernized handler for GreatBuildingsService.getContributions RPC.
 * Calculates total FP invested across other players' Great Buildings,
 * computes expected returns with Arc multiplier using InnoGames ceiling rounding (BigNumber.ROUND_CEIL),
 * tallies net profit/loss, and publishes to InvestedState.
 *
 * @param {Object|Array} msg ServerRequest packet or contributions array
 * @param {number|string|Object} [arcBonusOverride] Optional Arc bonus percentage override
 * @returns {Object} Calculated contributions, totals, and net profit/loss
 */
function getContributions(msg, arcBonusOverride) {
  let list = [];
  if (Array.isArray(msg)) {
    list = msg;
  } else if (Array.isArray(msg?.responseData)) {
    list = msg.responseData;
  } else if (Array.isArray(msg?.responseData?.contributions)) {
    list = msg.responseData.contributions;
  } else if (Array.isArray(msg?.contributions)) {
    list = msg.contributions;
  }

  const validOverride =
    typeof arcBonusOverride === 'number' && !Number.isNaN(arcBonusOverride) ?
      arcBonusOverride
    : (
      typeof arcBonusOverride === 'string' &&
      arcBonusOverride.trim() !== '' &&
      !Number.isNaN(Number(arcBonusOverride))
    ) ?
      Number(arcBonusOverride)
    : arcBonusOverride && typeof arcBonusOverride.isBigNumber === 'function' ?
      arcBonusOverride
    : undefined;

  const arcBonusPercent =
    validOverride !== undefined ? validOverride
    : typeof msg?.arcBonusPercent === 'number' ? msg.arcBonusPercent
    : City?.ArcBonus !== undefined ? City.ArcBonus
    : 90;

  investedState.setContributions({ list, arcBonusPercent });

  const calc = calculateInvestments(list, arcBonusPercent);
  return {
    ...calc,
    contributions: calc.results,
  };
}

module.exports = {
  getContributions,
  default: { getContributions },
};
