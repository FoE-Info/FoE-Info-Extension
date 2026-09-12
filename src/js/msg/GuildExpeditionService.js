/**
 * GuildExpeditionService.js
 *
 * Guild Expedition (GE) scoreboard, trial level tracking, contribution list,
 * and International Guild Expedition rankings. Supports co-existing sub-panels.
 */

const {
  wrapExpeditionCard,
  buildSubpanel,
  buildContributionTable,
  buildInternationalTable,
} = require('../ui/expeditionTables.js');
const {
  extractTrialLevel,
  extractInternationalExpeditionEntries,
} = require('../parsers/expeditionParser.js');
const { renderExpeditionPanel } = require('../ui/renderExpeditionPanel.js');

let cachedInternationalEntries = null;
let cachedContributionEntries = null;

function resetExpeditionCache() {
  cachedInternationalEntries = null;
  cachedContributionEntries = null;
}

function getShowOptions() {
  try {
    const showOptMod = require('../vars/showOptions.js');
    return showOptMod.showOptions || showOptMod || {};
  } catch {
    return {};
  }
}

function buildExpeditionContentHtml(optionsOverride = null) {
  const showOpt = optionsOverride || getShowOptions();
  const showInternational = showOpt.showInternationalExpedition !== false;
  const showContribution = showOpt.showExpedition !== false;

  const hasInternational =
    showInternational &&
    Array.isArray(cachedInternationalEntries) &&
    cachedInternationalEntries.length > 0;
  const hasContribution =
    showContribution &&
    Array.isArray(cachedContributionEntries) &&
    cachedContributionEntries.length > 0;

  let content = '';
  if (hasInternational) {
    content += buildSubpanel(
      'International',
      'ge_championship',
      'Championship',
      buildInternationalTable(cachedInternationalEntries),
    );
  }
  if (hasContribution) {
    content += buildSubpanel(
      'Contribution',
      'ge_member_contributions',
      'Member Contributions',
      buildContributionTable(cachedContributionEntries, extractTrialLevel),
    );
  }
  return content;
}

function buildExpeditionTableHtml(entries = [], collapse = false, size = 200) {
  return wrapExpeditionCard(
    buildContributionTable(entries, extractTrialLevel),
    collapse,
    size,
  );
}

function buildInternationalExpeditionTableHtml(
  entries = [],
  collapse = false,
  size = 200,
) {
  return wrapExpeditionCard(buildInternationalTable(entries), collapse, size);
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
    cachedInternationalEntries = entries;
  } else {
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

    if (isContribution) {
      cachedContributionEntries = entries;
    } else {
      return;
    }
  }

  const contentHtml = buildExpeditionContentHtml();
  renderExpeditionPanel(contentHtml);
}

module.exports = {
  buildContributionTable,
  buildInternationalTable,
  buildExpeditionTableHtml,
  buildInternationalExpeditionTableHtml,
  buildExpeditionContentHtml,
  extractInternationalExpeditionEntries,
  extractTrialLevel,
  guildExpeditionService,
  championshipService: guildExpeditionService,
  resetExpeditionCache,
};
module.exports.default = guildExpeditionService;
