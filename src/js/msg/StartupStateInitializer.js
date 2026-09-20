/**
 * StartupStateInitializer.js
 *
 * Handles player account initialization, score resolution, city state resets,
 * and combat totals calculation during game startup.
 * Extracted from StartupService.js to maintain modular size budgets.
 */

let createLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});
let isDebugEnabled = () => false;
try {
  ({ createLogger, isDebugEnabled } = require('../utils/logger.js'));
} catch {}

let parseUserAccount = (u) => u || {};
try {
  ({ parseUserAccount } = require('../parsers/accountParser.js'));
} catch {}

let resolvePlayerScore = () => {};
try {
  ({ resolvePlayerScore } = require('../state/playerScoreResolver.js'));
} catch {}

let blueGalaxyState = { reset: () => {} };
try {
  ({ blueGalaxyState } = require('../state/BlueGalaxyState.js'));
} catch {}

const logger = createLogger('StartupStateInitializer');

/**
 * Parses user account data and initializes player state upon startup.
 *
 * @param {Object} msg - Startup RPC message
 * @param {Object} [options]
 * @param {Function} [options.renderLiveCityStats]
 * @param {Function} [options.setMyScore]
 * @param {Function} [options.setMyInfo]
 * @param {Function} [options.setIgnoredPlayers]
 * @param {Object} [options.helper]
 * @param {Object} [options.blueGalaxyState]
 * @param {Function} [options.clearArmyUnits]
 * @param {Object} [options.logger]
 * @returns {Object|null} The raw user data object, or null if invalid
 */
function initStartupUser(msg, options = {}) {
  const user = msg?.responseData ? msg.responseData.user_data : null;
  const log = options.logger || logger;
  if (!user) {
    log.error('startupService received payload without user_data', msg);
    return null;
  }

  const parsedUser = parseUserAccount(user);
  const stateObj = options.state;
  const setScoreFn = options.setMyScore || stateObj?.setMyScore;
  const renderStatsFn = options.renderLiveCityStats;
  const setInfoFn = options.setMyInfo || stateObj?.setMyInfo;
  const setIgnoredFn = options.setIgnoredPlayers || stateObj?.setIgnoredPlayers;
  const helperObj = options.helper;
  const galaxyState = options.blueGalaxyState || blueGalaxyState;
  const clearUnitsFn = options.clearArmyUnits;

  resolvePlayerScore(parsedUser, user, {
    setMyScore: setScoreFn,
    renderLiveCityStats: () => renderStatsFn?.(),
  });
  user.score = parsedUser.score;

  if (typeof setInfoFn === 'function') {
    setInfoFn(
      parsedUser.name,
      parsedUser.id,
      parsedUser.clan,
      parsedUser.clanId,
      parsedUser.createdAt,
      parsedUser.era,
      parsedUser.score,
    );
  }

  const ignoredBy =
    msg.responseData?.ignoredByPlayerIds ||
    user?.ignoredByPlayerIds ||
    msg.responseData?.ignored_by_player_ids;
  const ignoring =
    msg.responseData?.ignoredPlayerIds ||
    user?.ignoredPlayerIds ||
    msg.responseData?.ignored_player_ids;
  if ((ignoredBy || ignoring) && typeof setIgnoredFn === 'function') {
    setIgnoredFn(ignoredBy, ignoring);
  }

  helperObj?.setMyGuildPermissions?.(user.clan_permissions);
  clearUnitsFn?.();
  galaxyState?.reset?.();

  return user;
}

/**
 * Resets City calculation state and applies cached boosts.
 *
 * @param {Object} City - The reactive City state object
 * @param {Object} [options]
 * @param {string} [options.language]
 * @param {boolean} [options.DEV]
 * @param {Function} [options.removeDebug]
 * @param {Object} [options.lastBoostsMsg]
 * @param {Function} [options.applyBoostsToCity]
 * @param {Object} [options.logger]
 * @param {Object} [options.MyInfo]
 */
function resetCityStartupState(City, options = {}) {
  if (!City) return;
  const log = options.logger || logger;

  City.ForgePoints = City.baseBoostableFp = City.baseUnboostableFp = 0;
  City.TrazUnits = City.baseUnits = 0;
  City.gbAttack = City.gbDefense = City.gbCityAttack = City.gbCityDefense = 0;
  City.Coins = City.Supplies = City.CoinBoost = City.SupplyBoost = 0;
  City.Attack = City.Defense = City.CityAttack = City.CityDefense = 0;
  City.ArcBonus = City.ChatBonus = 0;
  City.AOCriticalStrike = City.CCCriticalStrike = City.CriticalStrike = 0;

  if (typeof window !== 'undefined') {
    log.debug?.('window', window);
  }

  const stateObj = options.state;
  const myInfo =
    options.MyInfo !== undefined ? options.MyInfo : stateObj?.MyInfo;
  log.debug?.('user :', myInfo);

  const lang =
    options.language !== undefined ? options.language : stateObj?.language;
  if (
    lang &&
    lang !== 'auto' &&
    typeof $ !== 'undefined' &&
    typeof $.i18n === 'function'
  ) {
    $.i18n({
      locale: lang,
    });
    log.debug?.(lang, $.i18n().locale, $.i18n.debug);
  }

  const isDev =
    options.DEV !== undefined ? options.DEV
    : typeof DEV !== 'undefined' ? DEV
    : false;
  const removeDebugFn = options.removeDebug || stateObj?.removeDebug;
  if (!isDev && typeof removeDebugFn === 'function') {
    removeDebugFn();
  }

  const applyBoostsFn = options.applyBoostsToCity;
  if (options.lastBoostsMsg && typeof applyBoostsFn === 'function') {
    applyBoostsFn(options.lastBoostsMsg, City);
  }
}

/**
 * Calculates attack and defense combat totals combining raw boosts and GB stats.
 *
 * @param {Object} targetCity
 */
function updateCombatTotals(targetCity) {
  if (!targetCity) return;
  targetCity.Attack =
    (targetCity.rawBoostAttack || 0) + (targetCity.gbAttack || 0);
  targetCity.Defense =
    (targetCity.rawBoostDefense || 0) + (targetCity.gbDefense || 0);
  targetCity.CityAttack =
    (targetCity.rawBoostCityAttack || 0) + (targetCity.gbCityAttack || 0);
  targetCity.CityDefense =
    (targetCity.rawBoostCityDefense || 0) + (targetCity.gbCityDefense || 0);
}

function initializeStartupSession(msg, options = {}) {
  const user = initStartupUser(msg, options);
  if (!user) return null;
  resetCityStartupState(options.City, options);
  return user;
}

function createTimingTracker(loggerInstance, timingRun, requestId) {
  const debugEnabled = isDebugEnabled();
  const timingStart = performance.now();
  let timingPrevious = timingStart;
  const timingStep = (phase, step) => {
    if (!debugEnabled) return;
    const now = performance.now();
    loggerInstance.info(
      `[TIMING:${phase}] ${step} | t = ${now.toFixed(2)}ms | run = ${timingRun} | requestId = ${requestId} | stepMs = ${(now - timingPrevious).toFixed(2)} | totalMs = ${(now - timingStart).toFixed(2)}`,
    );
    timingPrevious = now;
  };
  return { debugEnabled, timingStep };
}

function createStartupContext({
  user,
  entityResult,
  state: stateObj,
  collapse: collapseObj,
  fpBuildings,
  goodsBuildings,
  tooltipHTML,
}) {
  return {
    user,
    clanGoods: entityResult.clanGoods,
    clanPower: entityResult.clanPower,
    availablePacksFP: stateObj?.availablePacksFP,
    collapseStats: collapseObj?.collapseStats,
    fpBuildings,
    goodsBuildings,
    aidStats: entityResult.aidStats,
    tooltipHTML: {
      fp: tooltipHTML.fp,
      clanGoods: tooltipHTML.clanGoods,
      goods: tooltipHTML.goods,
    },
  };
}

module.exports = {
  initStartupUser,
  resetCityStartupState,
  updateCombatTotals,
  initializeStartupSession,
  createTimingTracker,
  createStartupContext,
};
module.exports.default = module.exports;
