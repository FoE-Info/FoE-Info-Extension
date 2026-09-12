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
  attachSubpanelToggle,
  extractTrialLevel,
  extractInternationalExpeditionEntries,
} = require('../ui/expeditionTables.js');

let cachedInternationalEntries = null;
let cachedContributionEntries = null;

// Single long-lived observer reused across renders. `attachTableHandlers`
// disconnects it before re-observing the freshly rendered nodes, so detached
// panels are never retained.
let expeditionResizeObserver = null;

function getExpeditionResizeObserver() {
  if (typeof ResizeObserver === 'undefined') return null;
  if (!expeditionResizeObserver) {
    expeditionResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect?.height) {
          try {
            require('../fn/globals.js')?.setExpeditionSize?.(
              entry.contentRect.height,
            );
          } catch {}
        }
      }
    });
  }
  return expeditionResizeObserver;
}

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

function getDonationDiv2() {
  if (typeof document !== 'undefined') {
    const el =
      document.getElementById('donationDIV2') ||
      document.getElementById('donation2DIV');
    if (el) return el;
  }
  try {
    return require('../state/state.js').donationDIV2 || null;
  } catch {
    return null;
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

function attachTableHandlers(container) {
  if (typeof document === 'undefined') return;
  const copyBtn = document.getElementById('expeditionCopyID');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      try {
        require('../utils/copy.js')?.ExpeditionCopy?.();
      } catch {}
    });
  }
  const copyChampBtn = document.getElementById('geChampionshipCopyID');
  if (copyChampBtn) {
    copyChampBtn.addEventListener('click', () => {
      try {
        require('../utils/copy.js')?.ExpeditionCopy?.('geChampionshipText');
      } catch {}
    });
  }
  const copyContribBtn = document.getElementById('geContributionCopyID');
  if (copyContribBtn) {
    copyContribBtn.addEventListener('click', () => {
      try {
        require('../utils/copy.js')?.ExpeditionCopy?.('geContributionText');
      } catch {}
    });
  }

  const toggleBtn = document.getElementById('expeditionicon');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      try {
        require('../fn/collapse.js')?.fCollapseExpedition?.();
      } catch {}
    });
  }

  attachSubpanelToggle(
    'geInternationalToggle',
    'geInternationalIcon',
    'geInternationalCollapse',
  );
  attachSubpanelToggle(
    'geContributionToggle',
    'geContributionIcon',
    'geContributionCollapse',
  );

  const observer = getExpeditionResizeObserver();
  if (observer) {
    if (typeof observer.disconnect === 'function') observer.disconnect();
    const observeEl = (id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    };
    observeEl('expeditionText');
    observeEl('geChampionshipText');
    observeEl('geContributionText');
  }
  try {
    require('../fn/i18n.js')?.translateContainer?.(container);
  } catch {}
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
  const container = getDonationDiv2();
  if (!container) return;

  if (!contentHtml) {
    container.innerHTML = '';
    return;
  }

  container.id = 'donationDIV2';
  container.innerHTML = wrapExpeditionCard(contentHtml);
  attachTableHandlers(container);
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
