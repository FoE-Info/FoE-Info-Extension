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
    targets,
    donation2DIV,
    donationDIV,
    donationDIV2,
    gbInfoDIV,
    greatbuilding,
    output,
    cityrewards,
    battlegroundDIV,
    gbgLeaderboardDIV,
    guild,
  } = containers;

  // Group 3: Great Buildings
  // Invariant order: 1. GB Donation panel, 2. GB Info, 3. GB contributors
  if (greatbuilding)
    ensureContainerMounted(contentEl, greatbuilding, 'greatbuilding');
  if (gbInfoDIV)
    ensureContainerMounted(contentEl, gbInfoDIV, 'gbInfo', greatbuilding);
  const gbAnchor = gbInfoDIV || greatbuilding;
  if (donation2DIV)
    ensureContainerMounted(contentEl, donation2DIV, 'donation2', gbAnchor);
  if (donationDIV)
    ensureContainerMounted(contentEl, donationDIV, 'donation', gbAnchor);
  if (donationDIV2)
    ensureContainerMounted(contentEl, donationDIV2, 'donationDIV2', gbAnchor);
  if (cityrewards)
    ensureContainerMounted(contentEl, cityrewards, 'cityrewards');

  // Group 4: Guild & Competitions
  // Invariant order: 1. Target generator, 2. Battlegrounds Changes, 3. Leaderboard, 4. rest
  if (guild) ensureContainerMounted(contentEl, guild, 'guild');
  const gbgRestAnchor = guild;
  if (gbgLeaderboardDIV)
    ensureContainerMounted(
      contentEl,
      gbgLeaderboardDIV,
      'gbgLeaderboard',
      gbgRestAnchor,
    );
  const bgChangesAnchor = gbgLeaderboardDIV || gbgRestAnchor;
  if (battlegroundDIV)
    ensureContainerMounted(
      contentEl,
      battlegroundDIV,
      'battleground',
      bgChangesAnchor,
    );
  const targetGenAnchor = battlegroundDIV || gbgLeaderboardDIV || gbgRestAnchor;
  if (targets)
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
        currentLogo.setAttribute('title', 'FoE-Info Debug Mode (Enabled)');
      }
    } else {
      currentLogo = targetDocument.createElement('img');
      currentLogo.src = '/icons/Icon48.png';
      currentLogo.width = '24';
      currentLogo.height = '24';
      currentLogo.id = 'logo';
      currentLogo.style = currentLogo.style || {};
      currentLogo.style.cursor = 'pointer';
      currentLogo.style.verticalAlign = 'middle';
      if (currentLogo.setAttribute) {
        currentLogo.setAttribute(
          'title',
          'FoE-Info (Click to enable debug mode)',
        );
      }
    }
    if (typeof onToggleDebug === 'function') {
      currentLogo.addEventListener('click', onToggleDebug);
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

  function createPanel(id, className = '', hidden = false) {
    const el = targetDocument.createElement('div');
    el.id = id;
    if (className) el.className = className;
    if (hidden) el.style.display = 'none';
    contentEl.appendChild(el);
    return el;
  }

  function mountOrAdopt(id, sharedEl, className = '', hidden = false) {
    if (sharedEl) {
      ensureContainerMounted(contentEl, sharedEl, id);
      if (className && !sharedEl.className) sharedEl.className = className;
      if (hidden) sharedEl.style.display = 'none';
      return sharedEl;
    }
    return createPanel(id, className, hidden);
  }

  // --- Group 1: City Context & Exploration ---
  const citystats = createPanel('citystats', 'alert alert-warning');
  citystats.innerHTML =
    '<p><strong><span data-i18n="load">Load the game ...</span></strong></p>';
  const visitstats = createPanel('visit');
  const galaxyDIV = createPanel('galaxy', '', true);
  const buildingsDIV = createPanel('buildings');
  const incidents = createPanel('incidents', 'incidents');
  const cultural = createPanel('cultural');
  const bonusDIV = createPanel('bonus');
  const overview = createPanel('overview');
  const info = createPanel('info');

  // --- Group 2: Military & Resources ---
  const armyDIV = createPanel('army');
  const goodsDIV = createPanel('goods');

  // --- Group 3: Great Buildings (Active GB & Investments) ---
  // Invariant order: 1. GB Donation panel, 2. GB Info, 3. GB contributors
  const donation2 = mountOrAdopt('donation2', sharedContainers.donation2DIV);
  const donation = mountOrAdopt('donation', sharedContainers.donationDIV);
  const donationDIV2 = mountOrAdopt(
    'donationDIV2',
    sharedContainers.donationDIV2,
  );
  const gbInfo = mountOrAdopt('gbInfo', sharedContainers.gbInfoDIV);
  const greatbuilding = mountOrAdopt(
    'greatbuilding',
    sharedContainers.greatbuilding,
  );
  const cityinvested = createPanel('invested');
  const cityrewards = mountOrAdopt('cityrewards', sharedContainers.cityrewards);

  // --- Group 4: Guild & Competitions ---
  // Invariant order: 1. Target generator, 2. Battlegrounds Changes, 3. Leaderboard, 4. rest
  const targets = mountOrAdopt('targets', sharedContainers.targets);
  const battleground = mountOrAdopt(
    'battleground',
    sharedContainers.battlegroundDIV,
  );
  const gbgLeaderboard = mountOrAdopt(
    'gbgLeaderboard',
    sharedContainers.gbgLeaderboardDIV,
  );
  const guild = mountOrAdopt('guild', sharedContainers.guild);
  const output = mountOrAdopt('output', sharedContainers.output);
  const treasury = createPanel('treasury');
  const treasuryLog = createPanel('treasuryLog');

  // --- Group 5: Social, System & Utilities ---
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
    citystats,
    alerts,
    bonusDIV,
    incidents,
    cityinvested,
    galaxyDIV,
    visitstats,
    overview,
    cultural,
    info,
    armyDIV,
    goodsDIV,
    buildingsDIV,
    donation2,
    donation,
    donationDIV2,
    gbInfo,
    greatbuilding,
    cityrewards,
    targets,
    battleground,
    gbgLeaderboard,
    guild,
    output,
    friendsDiv,
    treasury,
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
