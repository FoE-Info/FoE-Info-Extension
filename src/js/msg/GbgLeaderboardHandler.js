/**
 * GbgLeaderboardHandler.js
 *
 * Handles Guild Battlegrounds player leaderboards, match state results,
 * and performance persistence. Extracted from GuildBattlegroundService.js.
 */
let browser = globalThis.browser;
try {
  browser = require('webextension-polyfill');
} catch {}

let translateContainer = () => {};
try {
  ({ translateContainer } = require('../fn/i18n.js'));
} catch {}

let storage = {
  set: () => {},
  remove: () => {},
};
try {
  storage = require('../fn/storage.js');
} catch {}

let guildBattlegroundState = globalThis.guildBattlegroundState || {};
try {
  ({ guildBattlegroundState } = require('../state/GuildBattlegroundState.js'));
} catch {}

let formatDateTime = (val) => String(val);
try {
  ({ formatDateTime } = require('../utils/date.js'));
} catch {}

let createLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});
try {
  ({ createLogger } = require('../utils/logger.js'));
} catch {}

const logger = createLogger('GbgLeaderboardHandler');

let showOptions = globalThis.showOptions || {};
try {
  ({ showOptions } = require('../vars/showOptions.js'));
} catch {}

let stateVars = globalThis;
try {
  stateVars = require('../vars/state.js');
} catch {}

function getStateVar(name, fallback) {
  if (stateVars && stateVars[name] !== undefined) return stateVars[name];
  if (globalThis[name] !== undefined) return globalThis[name];
  return fallback;
}

/**
 * Parses and processes the player leaderboard RPC payload.
 * @param {Object} msg
 * @param {Object} [options]
 * @param {Function} [options.onPerformanceUpdated] Callback when performance is persisted.
 * @param {Object} [options.state] Explicit shared state variable references.
 * @param {Object} [options.showOptions] Explicit showOptions configuration.
 */
function handlePlayerLeaderboard(
  msg,
  {
    onPerformanceUpdated,
    state = {},
    showOptions: customShowOptions,
    storageApi: storageApiOption,
  } = {},
) {
  const BattlegroundPerformance =
    state.BattlegroundPerformance || getStateVar('BattlegroundPerformance', []);
  const GBGdata = state.GBGdata || getStateVar('GBGdata', []);
  const GuildMembers = state.GuildMembers || getStateVar('GuildMembers', []);
  const GameOrigin =
    state.GameOrigin !== undefined ?
      state.GameOrigin
    : getStateVar('GameOrigin', '');
  const EpocTime =
    state.EpocTime !== undefined ? state.EpocTime : getStateVar('EpocTime', 0);
  const setBGtime = state.setBGtime || getStateVar('setBGtime', () => {});
  const donationDIV =
    state.donationDIV !== undefined ?
      state.donationDIV
    : getStateVar('donationDIV', null);

  BattlegroundPerformance.length = 0;
  GBGdata.length = 0;
  const entries = Array.isArray(msg?.responseData) ? msg.responseData : [];
  logger.debug('handlePlayerLeaderboard parsed entries:', entries.length);

  entries.forEach((entry) => {
    let wonNegotiations = 0;
    let wonBattles = 0;
    let attrition = 0;
    if (entry?.negotiationsWon) wonNegotiations = entry.negotiationsWon;
    if (entry?.battlesWon) wonBattles = entry.battlesWon;
    if (entry?.attrition) attrition = entry.attrition;
    const playerName = entry?.player?.name || 'Unknown';
    GBGdata.push({
      name: playerName,
      total: wonNegotiations * 2 + wonBattles,
    });
    BattlegroundPerformance.push({
      name: playerName,
      wonNegotiations,
      wonBattles,
      attrition,
    });
  });

  const opts = customShowOptions || globalThis.showOptions || showOptions;
  if (opts?.showBattleground) {
    const storageApi =
      storageApiOption ||
      globalThis.browser?.storage?.local ||
      browser?.storage?.local ||
      globalThis.chrome?.storage?.local;
    if (storageApi?.get) {
      storageApi
        .get([GameOrigin, GameOrigin + 'BGtime'])
        .then((items) => {
          logger.debug('Retrieved GBG storage items:', items);
          if (items && items[GameOrigin] && Array.isArray(items[GameOrigin])) {
            GuildMembers.length = 0;
            GuildMembers.push(...items[GameOrigin]);
          }
          storage.set(GameOrigin + 'BGtime', EpocTime);
          if (items && items[GameOrigin + 'BGtime']) {
            setBGtime(formatDateTime(items[GameOrigin + 'BGtime']));
          } else {
            setBGtime('not set');
          }

          BattlegroundPerformance.forEach((entry) => {
            if (GuildMembers.find((id) => id.name === entry.name) == null) {
              GuildMembers.push({
                name: entry.name,
                wonNegotiations: 0,
                wonBattles: 0,
              });
            }
          });

          logger.debug(
            'Saving GBG performance:',
            GameOrigin,
            BattlegroundPerformance.length,
          );
          storage.set(GameOrigin, BattlegroundPerformance);

          if (typeof onPerformanceUpdated === 'function') {
            onPerformanceUpdated(BattlegroundPerformance, GameOrigin);
          } else {
            guildBattlegroundState.setPerformance?.({
              performance: BattlegroundPerformance,
              gameOrigin: GameOrigin,
            });
          }
        })
        .catch((err) => {
          logger.error('Failed to get GBG storage:', err);
        });
    }

    if (donationDIV) {
      translateContainer(donationDIV);
    }
  }
}

/**
 * Handles the overall GBG state update, clearing previous results and populating new data.
 * @param {Object} msg
 * @param {Object} [options]
 * @param {Object} [options.state] Explicit shared state variable references.
 */
function handleBattlegroundState(msg, { state = {} } = {}) {
  if (msg?.responseData?.stateId === 'subscribed') {
    guildBattlegroundState?.setTargetMessageActive?.(false);
    logger.debug('handleBattlegroundState subscribed state received');
    const GameOrigin =
      state.GameOrigin !== undefined ?
        state.GameOrigin
      : getStateVar('GameOrigin', '');
    const BattlegroundPerformance =
      state.BattlegroundPerformance ||
      getStateVar('BattlegroundPerformance', []);
    const GBGdata = state.GBGdata || getStateVar('GBGdata', []);

    storage.remove(GameOrigin + 'BGtime');
    storage.remove(GameOrigin);
    BattlegroundPerformance.length = 0;
    GBGdata.length = 0;

    guildBattlegroundState.setResult?.({
      responseData: msg.responseData,
      onRow: (row) => {
        BattlegroundPerformance.push([
          row.rank,
          row.name,
          row.negotiations,
          row.fights,
          row.attrition,
        ]);
      },
    });

    const playerLeaderboardEntries =
      Array.isArray(msg?.responseData?.playerLeaderboardEntries) ?
        msg.responseData.playerLeaderboardEntries
      : [];
    playerLeaderboardEntries.forEach((entry) => {
      let wonNegotiations = 0;
      let wonBattles = 0;
      if (entry?.wonNegotiations) wonNegotiations = entry.wonNegotiations;
      if (entry?.wonBattles) wonBattles = entry.wonBattles;
      GBGdata.push({
        name: entry?.player?.name || 'Unknown',
        total: wonNegotiations * 2 + wonBattles,
      });
    });
  }
}

/**
 * Updates reactive store with overall guild leaderboard.
 * @param {Object} msg
 */
function handleLeaderboard(msg) {
  guildBattlegroundState.setLeaderboard?.({ leaderboard: msg?.responseData });
}

module.exports = {
  handlePlayerLeaderboard,
  handleBattlegroundState,
  handleLeaderboard,
};
module.exports.default = module.exports;
