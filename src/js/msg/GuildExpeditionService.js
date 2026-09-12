/**
 * GuildExpeditionService.js
 *
 * Guild Expedition (GE) scoreboard, trial level tracking, contribution list,
 * and International Guild Expedition rankings. Parses inbound RPC payloads and
 * publishes them to ExpeditionState; the UI binding renders the panel. Supports
 * co-existing sub-panels.
 */

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

module.exports = {
  extractTrialLevel,
  extractInternationalExpeditionEntries,
  guildExpeditionService,
  championshipService: guildExpeditionService,
  resetExpeditionCache,
};
module.exports.default = guildExpeditionService;
