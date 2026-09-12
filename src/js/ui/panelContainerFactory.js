/**
 * panelContainerFactory.js
 *
 * Factory functions for creating, mounting, and adopting DOM panel containers
 * in the FoE-Info extension (#content). Extracted from containerBinding.js to
 * maintain single responsibility and keep file size under budgets.
 * Dual CJS/ESM compatible.
 */

let loggerModule = null;
try {
  loggerModule = require('../utils/logger.js');
} catch {}
const logger =
  loggerModule?.createLogger ?
    loggerModule.createLogger('PanelContainerFactory')
  : { debug() {}, info() {}, warn() {}, error() {} };

function ensureContainerMounted(contentEl, container, id, beforeEl = null) {
  if (!container || !contentEl) return;
  if (id && (!container.id || container.id !== id)) {
    container.id = id;
  }
  const isContained =
    typeof contentEl.contains === 'function' && contentEl.contains(container);

  if (
    beforeEl &&
    typeof contentEl.contains === 'function' &&
    contentEl.contains(beforeEl) &&
    beforeEl !== container
  ) {
    if (typeof contentEl.insertBefore === 'function') {
      contentEl.insertBefore(container, beforeEl);
    } else if (!isContained) {
      contentEl.appendChild(container);
    }
  } else if (!isContained) {
    contentEl.appendChild(container);
  }
}

function setupPanelContainers(
  contentEl,
  sharedContainers = {},
  targetDocument = typeof document !== 'undefined' ? document : null,
) {
  if (!contentEl || !targetDocument) return {};

  function createPanel(id, className = '', hidden = false, parent = contentEl) {
    const el = targetDocument.createElement('div');
    el.id = id;
    if (className) el.className = className;
    if (hidden) el.style.display = 'none';
    parent.appendChild(el);
    return el;
  }

  function mountOrAdopt(
    id,
    sharedEl,
    className = '',
    hidden = false,
    parent = contentEl,
  ) {
    if (sharedEl) {
      ensureContainerMounted(parent, sharedEl, id);
      if (className && !sharedEl.className) sharedEl.className = className;
      if (hidden) sharedEl.style.display = 'none';
      return sharedEl;
    }
    return createPanel(id, className, hidden, parent);
  }

  // Exact 15-Panel Vertical Mount Sequence directly into contentEl
  // 1. #header (City Info: Metadata, Daily Income, GE/GBG/QI Boosts, City Boosts, Fixed Player Points)
  const header = mountOrAdopt('header', sharedContainers.header);
  const citystats = mountOrAdopt(
    'citystats',
    sharedContainers.citystats,
    'alert alert-warning',
    false,
    header,
  );
  if (!citystats.innerHTML) {
    citystats.innerHTML =
      '<p><strong><span data-i18n="load">Load the game ...</span></strong></p>';
  }

  // 2. #incidents (Standalone Incidents)
  const incidents = mountOrAdopt(
    'incidents',
    sharedContainers.incidents,
    'incidents',
  );

  // 3. #army (Unit Inventory & Losses)
  const armyDIV = mountOrAdopt(
    'army',
    sharedContainers.armyDIV || sharedContainers.army,
  );

  // 4. #rewards (Session Loot Log)
  const rewards = mountOrAdopt('rewards', sharedContainers.rewards);
  const cityrewards = mountOrAdopt(
    'cityrewards',
    sharedContainers.cityrewards,
    '',
    false,
    rewards,
  );

  // 5. #gbDonation (GB Spot Lock Helper)
  const gbDonation = mountOrAdopt('gbDonation', sharedContainers.gbDonation);
  const donation2 = mountOrAdopt(
    'donation2',
    sharedContainers.donation2DIV || sharedContainers.donation2,
    '',
    false,
    gbDonation,
  );
  const donation = mountOrAdopt(
    'donation',
    sharedContainers.donationDIV || sharedContainers.donation,
    '',
    false,
    gbDonation,
  );

  // 6. #gbInfo (GB Level Calculator)
  const gbInfo = mountOrAdopt(
    'gbInfo',
    sharedContainers.gbInfoDIV || sharedContainers.gbInfo,
  );

  // 7. #gbContributors (GB Investor List)
  const gbContributors = mountOrAdopt(
    'gbContributors',
    sharedContainers.gbContributors,
  );
  const greatbuilding = mountOrAdopt(
    'greatbuilding',
    sharedContainers.greatbuilding,
    '',
    false,
    gbContributors,
  );

  // 8. #gbgTargetGenerator (GBG Targets & Discord Exporter)
  const gbgTargetGenerator = mountOrAdopt(
    'gbgTargetGenerator',
    sharedContainers.gbgTargetGenerator,
  );
  const targets = mountOrAdopt(
    'targets',
    sharedContainers.targets,
    '',
    false,
    gbgTargetGenerator,
  );

  // 9. #battlegrounds (GBG Map Overview)
  const battlegrounds = mountOrAdopt(
    'battlegrounds',
    sharedContainers.battlegrounds,
  );
  const battleground = mountOrAdopt(
    'battleground',
    sharedContainers.battlegroundDIV || sharedContainers.battleground,
    '',
    false,
    battlegrounds,
  );

  // 10. #gbgLeaderboard (GBG Member Activity Log)
  const gbgLeaderboard = mountOrAdopt(
    'gbgLeaderboard',
    sharedContainers.gbgLeaderboardDIV || sharedContainers.gbgLeaderboard,
  );

  // 11. #geChampionship (GE Guild Rankings)
  const geChampionship = mountOrAdopt(
    'geChampionship',
    sharedContainers.geChampionship,
  );
  const donationDIV2 = mountOrAdopt(
    'donationDIV2',
    sharedContainers.donationDIV2,
    '',
    false,
    geChampionship,
  );

  // 12. #geContributions (GE Member Completions)
  const geContributions = mountOrAdopt(
    'geContributions',
    sharedContainers.geContributions,
  );

  // 13. #goodsInventory (Goods Breakdown)
  const goodsInventory = mountOrAdopt(
    'goodsInventory',
    sharedContainers.goodsInventory,
  );
  const goodsDIV = mountOrAdopt(
    'goods',
    sharedContainers.goodsDIV || sharedContainers.goods,
    '',
    false,
    goodsInventory,
  );

  // 14. #guildOverview (Guild Status)
  const guildOverview = mountOrAdopt(
    'guildOverview',
    sharedContainers.guildOverview,
  );
  const guild = mountOrAdopt(
    'guild',
    sharedContainers.guild,
    '',
    false,
    guildOverview,
  );

  // 15. #treasury (Guild Treasury Logs)
  const treasury = mountOrAdopt('treasury', sharedContainers.treasury);
  const treasuryLog = mountOrAdopt(
    'treasuryLog',
    sharedContainers.treasuryLog,
    '',
    false,
    treasury,
  );

  // 16. Quantum Incursions (Leaderboard & Contributions)
  const quantumLeaderboard = mountOrAdopt(
    'quantumLeaderboard',
    sharedContainers.quantumLeaderboard,
  );
  const quantumContributions = mountOrAdopt(
    'quantumContributions',
    sharedContainers.quantumContributions,
  );

  // Secondary, Exploration, Social & Utility Containers
  const visitstats = createPanel('visit');
  const galaxyDIV = createPanel('galaxy', '', true);
  const buildingsDIV = createPanel('buildings');
  const cultural = createPanel('cultural');
  const bonusDIV = createPanel('bonus');
  const overview = createPanel('overview');
  const info = createPanel('info');
  const cityinvested = createPanel('invested');
  const output = mountOrAdopt('output', sharedContainers.output);
  const friendsDiv = createPanel('friends');
  const clipboard = createPanel('clipboard', '', true);
  const alerts = createPanel('alerts');
  const alerts_bottom = createPanel('alerts_bottom');
  const debug = createPanel('debug');
  const modal = createPanel('modal');

  const testModal = targetDocument.createElement('div');
  testModal.className = 'modal-dialog modal-sm';
  testModal.id = 'testModal';
  modal.appendChild(testModal);

  logger.debug('panel containers created and mounted');

  return {
    // 15 primary containers
    header,
    incidents,
    army: armyDIV,
    rewards,
    gbDonation,
    gbInfo,
    gbContributors,
    gbgTargetGenerator,
    battlegrounds,
    gbgLeaderboard,
    geChampionship,
    geContributions,
    goodsInventory,
    guildOverview,
    treasury,
    quantumLeaderboard,
    quantumContributions,

    // Legacy and secondary panels & aliases
    citystats,
    alerts,
    bonusDIV,
    cityinvested,
    galaxyDIV,
    visitstats,
    overview,
    cultural,
    info,
    armyDIV,
    goodsDIV,
    goods: goodsDIV,
    buildingsDIV,
    donation2,
    donation,
    donationDIV2,
    greatbuilding,
    cityrewards,
    targets,
    battleground,
    guild,
    output,
    friendsDiv,
    treasuryLog,
    clipboard,
    alerts_bottom,
    debug,
    modal,
    testModal,
  };
}

module.exports = {
  ensureContainerMounted,
  setupPanelContainers,
  default: {
    ensureContainerMounted,
    setupPanelContainers,
  },
};
