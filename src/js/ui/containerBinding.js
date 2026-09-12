/**
 * containerBinding.js
 *
 * DOM container mounting and lifecycle safeguards for FoE-Info extension cards.
 * Ensures state containers (donation2DIV, targets, etc.) are properly bound and mounted
 * inside #content rather than residing in detached memory nodes.
 * Dual CJS/ESM compatible.
 */

const {
  ensureContainerMounted,
  setupPanelContainers,
} = require('./panelContainerFactory.js');

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

let i18nModule = null;
try {
  i18nModule = require('../utils/i18n.js');
} catch {}

let debugToggleModule = null;
try {
  debugToggleModule = require('./components/debugToggle.js');
} catch {}

function tr(key, fallback) {
  try {
    const value = i18nModule?.t?.(key);
    return value && value !== key ? value : fallback;
  } catch {
    return fallback;
  }
}

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
    currentLogo =
      debugToggleModule?.createDebugLogo?.(targetDocument, enabled) || null;
    if (!currentLogo) return null;
    debugToggleModule?.bindDebugToggle?.(currentLogo, onToggleDebug);
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
  optionsBtn.setAttribute('aria-label', tr('open_settings', 'Open Settings'));
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
