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
  if (
    typeof contentEl.contains === 'function' &&
    !contentEl.contains(container)
  ) {
    if (
      beforeEl &&
      typeof contentEl.contains === 'function' &&
      contentEl.contains(beforeEl)
    ) {
      contentEl.insertBefore(container, beforeEl);
    } else {
      contentEl.appendChild(container);
    }
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

  if (targets) ensureContainerMounted(contentEl, targets, 'targets');
  if (donation2DIV)
    ensureContainerMounted(contentEl, donation2DIV, 'donation2');
  if (donationDIV) ensureContainerMounted(contentEl, donationDIV, 'donation');
  if (battlegroundDIV)
    ensureContainerMounted(contentEl, battlegroundDIV, 'battleground');
  if (gbgLeaderboardDIV)
    ensureContainerMounted(contentEl, gbgLeaderboardDIV, 'gbgLeaderboard');
  if (donationDIV2)
    ensureContainerMounted(contentEl, donationDIV2, 'donationDIV2');
  if (gbInfoDIV)
    ensureContainerMounted(contentEl, gbInfoDIV, 'gbInfo', greatbuilding);
  if (greatbuilding)
    ensureContainerMounted(contentEl, greatbuilding, 'greatbuilding');
  if (output) ensureContainerMounted(contentEl, output, 'output');
  if (cityrewards)
    ensureContainerMounted(contentEl, cityrewards, 'cityrewards');
  if (guild) ensureContainerMounted(contentEl, guild, 'guild');
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
  optionsBtn.addEventListener('click', () => {
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

  const citystats = createPanel('citystats', 'alert alert-warning');
  citystats.innerHTML =
    '<p><strong><span data-i18n="load">Load the game ...</span></strong></p>';

  const alerts = createPanel('alerts');

  if (sharedContainers.targets) {
    sharedContainers.targets.id = 'targets';
    contentEl.appendChild(sharedContainers.targets);
  }

  const bonusDIV = createPanel('bonus');
  const incidents = createPanel('incidents', 'incidents');
  const cityinvested = createPanel('invested');
  const galaxyDIV = createPanel('galaxy', '', true);
  const visitstats = createPanel('visit');

  if (sharedContainers.cityrewards) {
    sharedContainers.cityrewards.id = 'cityrewards';
    contentEl.appendChild(sharedContainers.cityrewards);
  }

  // Mount shared containers: output, gbgLeaderboardDIV, donationDIV, battlegroundDIV, donation2DIV, donationDIV2, gbInfoDIV, greatbuilding
  mountPanels(contentEl, sharedContainers);

  const overview = createPanel('overview');
  const cultural = createPanel('cultural');
  const info = createPanel('info');
  const armyDIV = createPanel('army');
  const goodsDIV = createPanel('goods');
  const buildingsDIV = createPanel('buildings');
  const guild = createPanel('guild');
  const friendsDiv = createPanel('friends');
  const treasury = createPanel('treasury');
  const treasuryLog = createPanel('treasuryLog');
  const clipboard = createPanel('clipboard', '', true);
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
    guild,
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
