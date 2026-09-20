/**
 * GuildExpeditionService.js
 *
 * Guild Expedition (GE) scoreboard, trial level tracking, contribution list,
 * and International Guild Expedition rankings. Parses inbound RPC payloads and
 * publishes them to ExpeditionState; the UI binding renders the panel. Supports
 * co-existing sub-panels.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GuildExpeditionService');
} catch {}

let setCurrentView = () => {};
try {
  ({ setCurrentView } = require('../ui/cardVisibility.js'));
} catch {}

const {
  extractTrialLevel,
  extractInternationalExpeditionEntries,
} = require('../parsers/expeditionParser.js');
const { expeditionState } = require('../state/ExpeditionState.js');

function resetExpeditionCache() {
  expeditionState.reset();
}

function guildExpeditionService(msg) {
  if (!msg) return;
  const payload = msg.responseData || msg;

  const isChampionship =
    msg.requestClass === 'ChampionshipService' ||
    Boolean(payload && payload.ranking && payload.participants);

  if (isChampionship) {
    const entries = extractInternationalExpeditionEntries(msg);
    if (entries.length === 0) return;
    expeditionState.setInternationalEntries(entries);
    return;
  }

  const entries =
    Array.isArray(payload) ? payload
    : Array.isArray(payload.rankings) ? payload.rankings
    : [];

  const isContribution =
    entries.length > 0 &&
    entries.some(
      (e) =>
        e &&
        (e.player ||
          e.solvedEncounters !== undefined ||
          e.expeditionPoints !== undefined),
    );

  if (!isContribution) return;
  expeditionState.setContributionEntries(entries);
}

function register(dispatcher, options = {}) {
  if (!dispatcher || typeof dispatcher.register !== 'function') return this;
  const targetSetCurrentView = options.setCurrentView || setCurrentView;
  const targetGeService =
    options.guildExpeditionService || guildExpeditionService;
  const targetChampionship = options.championshipService || targetGeService;

  const withGeContext =
    (handler) =>
    (msg, ...rest) => {
      if (typeof targetSetCurrentView === 'function') {
        try {
          targetSetCurrentView('GE');
        } catch {}
      }
      if (typeof handler === 'function') {
        return handler(msg, ...rest);
      }
    };

  dispatcher.register(
    'ChampionshipService',
    'getOverview',
    withGeContext(targetChampionship),
  );
  dispatcher.register(
    'GuildExpeditionService',
    'getOverview',
    withGeContext(targetGeService),
  );
  dispatcher.register(
    'GuildExpeditionService',
    'getChestOverview',
    targetGeService,
  );
  dispatcher.register(
    'GuildExpeditionService',
    'getContributionList',
    targetGeService,
  );

  logger?.debug('GuildExpeditionService registered RPC handlers');
  return this;
}

guildExpeditionService.register = register;

module.exports = {
  extractTrialLevel,
  extractInternationalExpeditionEntries,
  guildExpeditionService,
  GuildExpeditionService: guildExpeditionService,
  championshipService: guildExpeditionService,
  resetExpeditionCache,
  register,
};
module.exports.default = guildExpeditionService;
