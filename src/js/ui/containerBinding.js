/**
 * containerBinding.js
 *
 * DOM container mounting and lifecycle safeguards for FoE-Info extension cards.
 * Ensures state containers (donation2DIV, targets, etc.) are properly bound and mounted
 * inside #content rather than residing in detached memory nodes.
 * Dual CJS/ESM compatible.
 */

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

function mountPanels(contentEl, containers = {}) {
  if (!contentEl) return;
  const {
    header,
    incidents,
    army,
    armyDIV,
    rewards,
    cityrewards,
    gbDonation,
    donation2DIV,
    donationDIV,
    donationDIV2,
    gbInfoDIV,
    gbInfo,
    gbContributors,
    greatbuilding,
    gbgTargetGenerator,
    targets,
    battlegrounds,
    battlegroundDIV,
    battleground,
    gbgLeaderboardDIV,
    gbgLeaderboard,
    geChampionship,
    geContributions,
    quantumLeaderboard,
    quantumContributions,
    goodsInventory,
    goodsDIV,
    guildOverview,
    guild,
    treasury,
    output,
  } = containers;

  // 15-Panel Vertical Sequence mounting
  if (header) ensureContainerMounted(contentEl, header, 'header');
  if (incidents) ensureContainerMounted(contentEl, incidents, 'incidents');
  if (army || armyDIV)
    ensureContainerMounted(contentEl, army || armyDIV, 'army');
  if (rewards) ensureContainerMounted(contentEl, rewards, 'rewards');
  if (gbDonation) ensureContainerMounted(contentEl, gbDonation, 'gbDonation');
  if (gbInfo || gbInfoDIV)
    ensureContainerMounted(contentEl, gbInfo || gbInfoDIV, 'gbInfo');
  if (gbContributors)
    ensureContainerMounted(contentEl, gbContributors, 'gbContributors');
  if (gbgTargetGenerator)
    ensureContainerMounted(contentEl, gbgTargetGenerator, 'gbgTargetGenerator');
  if (battlegrounds)
    ensureContainerMounted(contentEl, battlegrounds, 'battlegrounds');
  if (gbgLeaderboard || gbgLeaderboardDIV)
    ensureContainerMounted(
      contentEl,
      gbgLeaderboard || gbgLeaderboardDIV,
      'gbgLeaderboard',
    );
  if (geChampionship)
    ensureContainerMounted(contentEl, geChampionship, 'geChampionship');
  if (geContributions)
    ensureContainerMounted(contentEl, geContributions, 'geContributions');
  if (quantumLeaderboard)
    ensureContainerMounted(contentEl, quantumLeaderboard, 'quantumLeaderboard');
  if (quantumContributions)
    ensureContainerMounted(
      contentEl,
      quantumContributions,
      'quantumContributions',
    );
  if (goodsInventory)
    ensureContainerMounted(contentEl, goodsInventory, 'goodsInventory');
  if (guildOverview)
    ensureContainerMounted(contentEl, guildOverview, 'guildOverview');
  if (treasury) ensureContainerMounted(contentEl, treasury, 'treasury');

  // Legacy container mounts if outer containers were not supplied
  if (greatbuilding)
    ensureContainerMounted(contentEl, greatbuilding, 'greatbuilding');
  if (gbInfoDIV && !gbInfo)
    ensureContainerMounted(contentEl, gbInfoDIV, 'gbInfo', greatbuilding);
  const gbAnchor = gbInfoDIV || greatbuilding;
  if (donation2DIV && !gbDonation)
    ensureContainerMounted(contentEl, donation2DIV, 'donation2', gbAnchor);
  if (donationDIV && !gbDonation)
    ensureContainerMounted(contentEl, donationDIV, 'donation', gbAnchor);
  if (donationDIV2 && !geChampionship)
    ensureContainerMounted(contentEl, donationDIV2, 'donationDIV2', gbAnchor);
  if (cityrewards && !rewards)
    ensureContainerMounted(contentEl, cityrewards, 'cityrewards');

  if (guild && !guildOverview)
    ensureContainerMounted(contentEl, guild, 'guild');
  const gbgRestAnchor = guild;
  if (gbgLeaderboardDIV && !gbgLeaderboard)
    ensureContainerMounted(
      contentEl,
      gbgLeaderboardDIV,
      'gbgLeaderboard',
      gbgRestAnchor,
    );
  const bgChangesAnchor = gbgLeaderboardDIV || gbgRestAnchor;
  if ((battlegroundDIV || battleground) && !battlegrounds)
    ensureContainerMounted(
      contentEl,
      battlegroundDIV || battleground,
      'battleground',
      bgChangesAnchor,
    );
  const targetGenAnchor = battlegroundDIV || gbgLeaderboardDIV || gbgRestAnchor;
  if (targets && !gbgTargetGenerator)
    ensureContainerMounted(contentEl, targets, 'targets', targetGenAnchor);
  if (output) ensureContainerMounted(contentEl, output, 'output');
}

function safeguardOutputContainers(contentEl, containers = {}) {
  mountPanels(contentEl, containers);
}

let loggerModule = null;
try {
  loggerModule = require('../utils/logger.js');
} catch {}

function setupPanelHeader({
  darkMode = false,
  extName = '',
  onToggleDebug = null,
  debugEnabled = null,
  targetDocument = typeof document !== 'undefined' ? document : null,
} = {}) {
  if (!targetDocument || !targetDocument.body) return null;

  const title = targetDocument.createElement('div');
  title.id = 'title';
  title.className =
    darkMode === 'dark' ?
      'd-flex flex-row justify-content-between text-light bg-dark'
    : 'd-flex flex-row justify-content-between';
  targetDocument.body.appendChild(title);

  if (darkMode === 'dark') {
    if (targetDocument.body.classList?.toggle) {
      targetDocument.body.classList.toggle('bg-dark');
    }
  }
  if (targetDocument.body.classList?.toggle) {
    targetDocument.body.classList.toggle('bootstrap-styles');
  }

  const logoDiv = targetDocument.createElement('div');
  logoDiv.className = 'p-2';
  title.appendChild(logoDiv);

  let currentLogo = null;
  function renderLogo(enabled) {
    if (
      currentLogo &&
      currentLogo.parentNode &&
      typeof currentLogo.parentNode.removeChild === 'function'
    ) {
      currentLogo.parentNode.removeChild(currentLogo);
    }
    if (enabled) {
      currentLogo = targetDocument.createElement('span');
      currentLogo.className = 'material-icons-outlined';
      currentLogo.id = 'logo';
      currentLogo.textContent = 'bug_report';
      currentLogo.style = currentLogo.style || {};
      currentLogo.style.cursor = 'pointer';
      currentLogo.style.fontSize = '24px';
      currentLogo.style.verticalAlign = 'middle';
      if (currentLogo.setAttribute) {
        currentLogo.setAttribute('role', 'button');
        currentLogo.setAttribute('tabindex', '0');
        currentLogo.setAttribute('aria-pressed', 'true');
        currentLogo.setAttribute('aria-label', 'FoE-Info debug mode');
        currentLogo.setAttribute('title', 'FoE-Info Debug Mode (Enabled)');
      }
    } else {
      currentLogo = targetDocument.createElement('img');
      currentLogo.src = '/icons/Icon48.png';
      currentLogo.width = '24';
      currentLogo.height = '24';
      currentLogo.id = 'logo';
      currentLogo.alt = 'FoE-Info';
      currentLogo.style = currentLogo.style || {};
      currentLogo.style.cursor = 'pointer';
      currentLogo.style.verticalAlign = 'middle';
      if (currentLogo.setAttribute) {
        currentLogo.setAttribute('role', 'button');
        currentLogo.setAttribute('tabindex', '0');
        currentLogo.setAttribute('aria-pressed', 'false');
        currentLogo.setAttribute('aria-label', 'FoE-Info debug mode');
        currentLogo.setAttribute(
          'title',
          'FoE-Info (Click to enable debug mode)',
        );
      }
    }
    if (typeof onToggleDebug === 'function') {
      currentLogo.addEventListener('click', onToggleDebug);
      currentLogo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (e.repeat) return;
          e.preventDefault();
          onToggleDebug(e);
        } else if (e.key === ' ' || e.key === 'Spacebar') {
          // Space activates on keyup to match native button semantics.
          e.preventDefault();
        }
      });
      currentLogo.addEventListener('keyup', (e) => {
        if (e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          onToggleDebug(e);
        }
      });
    }
    logoDiv.appendChild(currentLogo);
    return currentLogo;
  }

  const initialDebug =
    typeof debugEnabled === 'boolean' ? debugEnabled : (
      (loggerModule?.isDebugEnabled?.() ?? false)
    );

  renderLogo(initialDebug);

  if (loggerModule?.onDebugToggle) {
    loggerModule.onDebugToggle((enabled) => {
      renderLogo(enabled);
    });
  }

  const titleDiv = targetDocument.createElement('div');
  titleDiv.className = 'p-8 title';
  title.appendChild(titleDiv);

  const heading = targetDocument.createElement('h6');
  heading.className =
    darkMode === 'dark' ? 'title text-light bg-dark' : 'title';
  heading.textContent = extName;
  titleDiv.appendChild(heading);

  const optionsBtn = targetDocument.createElement('button');
  optionsBtn.type = 'button';
  optionsBtn.setAttribute('aria-label', 'Open Settings');
  optionsBtn.className = 'btn btn-link p-2 text-decoration-none border-0';
  optionsBtn.innerHTML =
    '<span class="material-icons-outlined md-18 options-icon">settings</span>';
  optionsBtn.id = 'go-to-options';
  optionsBtn.addEventListener('click', async () => {
    try {
      const {
        setLastActiveWorld,
        getCurrentWorld,
      } = require('../utils/worldStorage.js');
      const w = getCurrentWorld();
      if (w) await setLastActiveWorld(w);
    } catch {}
    if (typeof browser !== 'undefined' && browser.runtime?.openOptionsPage) {
      browser.runtime.openOptionsPage().catch(() => {
        window.open(browser.runtime.getURL('options.html'));
      });
    } else if (
      typeof chrome !== 'undefined' &&
      chrome.runtime?.openOptionsPage
    ) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html');
    }
  });
  title.appendChild(optionsBtn);

  return title;
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
  mountPanels,
  safeguardOutputContainers,
  setupPanelHeader,
  setupPanelContainers,
  default: {
    ensureContainerMounted,
    mountPanels,
    safeguardOutputContainers,
    setupPanelHeader,
    setupPanelContainers,
  },
};
