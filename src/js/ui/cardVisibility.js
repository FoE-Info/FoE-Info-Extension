/**
 * cardVisibility.js
 *
 * Toggles visibility of panel cards based on:
 * 1. Dynamic Context View Filtering:
 *    - GBG Map View (currentView === 'GBG'): Show ONLY 6 combat-essential panels
 *      (#header, #army, #rewards, #gbgTargetGenerator, #battlegrounds, #gbgLeaderboard).
 *      Explicitly block/hide all non-combat panels (Lists, #treasury, #incidents,
 *      GB Suite, GE Suite, Goods Inventory, Guild Overview, City Utilities).
 *    - City View (currentView === 'CITY'): Hide GBG-specific panels
 *      (#gbgTargetGenerator, #battlegrounds, #gbgLeaderboard).
 *    - Debug Mode Override (isDebug === true): Override all view gates and force
 *      ALL 15 panels visible simultaneously with placeholder stubs when data is absent.
 * 2. Active world showOptions.
 *
 * Dual CJS/ESM compatible.
 */

let showOptionsState = {};
if (typeof __webpack_require__ !== 'undefined') {
  try {
    const showOptModule = require('../state/showOptions.js');
    showOptionsState = showOptModule.showOptions || showOptModule;
  } catch {
    showOptionsState = {};
  }
}

let isDebugEnabledGlobal = () => false;
try {
  const loggerModule = require('../utils/logger.js');
  if (typeof loggerModule.isDebugEnabled === 'function') {
    isDebugEnabledGlobal = loggerModule.isDebugEnabled;
  }
  if (typeof loggerModule.onDebugToggle === 'function') {
    loggerModule.onDebugToggle(() => {
      applyCardVisibility();
    });
  }
} catch {}

const ALL_15_PANEL_IDS = [
  'header',
  'incidents',
  'army',
  'rewards',
  'gbDonation',
  'gbInfo',
  'gbContributors',
  'gbgTargetGenerator',
  'battlegrounds',
  'gbgLeaderboard',
  'geChampionship',
  'geContributions',
  'goodsInventory',
  'guildOverview',
  'treasury',
];

const GBG_ALLOWED_PANEL_IDS = new Set([
  'header',
  'army',
  'rewards',
  'gbgTargetGenerator',
  'battlegrounds',
  'gbgLeaderboard',
]);

const CITY_HIDDEN_PANEL_IDS = new Set([
  'gbgTargetGenerator',
  'battlegrounds',
  'gbgLeaderboard',
]);

const optionToElementId = {
  showStats: 'citystats',
  showBonus: 'bonus',
  showIncidents: 'incidents',
  showInvested: 'invested',
  showVisit: 'visit',
  showDonation: 'donation',
  showGBInfo: 'gbInfo',
  showGBDonors: 'greatbuilding',
  showSettlement: 'cultural',
  showArmy: 'army',
  showFriends: 'friends',
  showGuildOverview: 'guild',
  showHood: 'hood',
  showTreasury: 'treasury',
  showGBRewards: 'cityrewards',
  showGalaxy: 'galaxy',
  showBattleground: 'battleground',
  showLeaderboard: 'gbgLeaderboard',
  showQuantum: 'quantumContributions',
  showQuantumLeaderboard: 'quantumLeaderboard',
};

let currentView = null; // 'CITY' | 'GBG' | null (null means unconstrained default)
const viewListeners = new Set();

function getCurrentView() {
  return currentView;
}

function setCurrentView(view) {
  const normalized =
    view === null || view === undefined ? null
    : String(view).toUpperCase() === 'GBG' ? 'GBG'
    : 'CITY';

  if (currentView === normalized) return;
  currentView = normalized;
  for (const fn of viewListeners) {
    try {
      fn(currentView);
    } catch {}
  }
  applyCardVisibility();
}

function onViewChange(callback) {
  if (typeof callback !== 'function') return () => {};
  viewListeners.add(callback);
  return () => viewListeners.delete(callback);
}

function setElementDisplay(id, displayVal) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (el) {
    el.style.display = displayVal;
  }
}

function applyCardVisibility(
  optionsOverride = null,
  debugOverride = null,
  viewOverride = null,
) {
  if (typeof document === 'undefined') return;
  const opts = optionsOverride || showOptionsState || {};
  const isDebug =
    debugOverride !== null && debugOverride !== undefined ?
      Boolean(debugOverride)
    : isDebugEnabledGlobal();
  const activeView =
    viewOverride !== null && viewOverride !== undefined ?
      viewOverride ? String(viewOverride).toUpperCase()
      : null
    : currentView;

  // --- 1. DEBUG MODE OVERRIDE (isDebug === true) ---
  if (isDebug) {
    for (const panelId of ALL_15_PANEL_IDS) {
      const el = document.getElementById(panelId);
      if (el) {
        el.style.display = '';
        // Check if real content is absent (ignoring whitespace and debug-stub)
        const cleanContent = el.innerHTML
          .replace(/<div class="[^"]*debug-stub[^"]*">.*?<\/div>/gs, '')
          .trim();
        if (!cleanContent) {
          el.innerHTML = `<div class="alert alert-secondary p-2 mb-2 font-monospace small debug-stub"><strong>[DEBUG STUB]</strong> ${panelId}</div>`;
        }
      }
    }

    // Force legacy aliases visible as well
    setElementDisplay('citystats', '');
    setElementDisplay('cityrewards', '');
    setElementDisplay('donation2', '');
    setElementDisplay('donation', '');
    setElementDisplay('greatbuilding', '');
    setElementDisplay('targets', '');
    setElementDisplay('battleground', '');
    setElementDisplay('donationDIV2', '');
    setElementDisplay('goods', '');
    setElementDisplay('guild', '');
    setElementDisplay('treasuryLog', '');
    setElementDisplay('geInternationalSection', '');
    setElementDisplay('geContributionSection', '');
    return;
  }

  // --- Remove any debug stubs if debug mode is inactive ---
  if (typeof document.querySelectorAll === 'function') {
    const stubs = document.querySelectorAll('.debug-stub') || [];
    for (const stub of stubs) {
      if (
        stub &&
        stub.parentNode &&
        typeof stub.parentNode.removeChild === 'function'
      ) {
        stub.parentNode.removeChild(stub);
      }
    }
  }

  // --- 2. GBG MAP VIEW (activeView === 'GBG') ---
  if (activeView === 'GBG') {
    // Show ONLY 6 combat panels (governed by showOptions)
    const showHeader = opts.showStats !== false;
    setElementDisplay('header', showHeader ? '' : 'none');
    setElementDisplay('citystats', showHeader ? '' : 'none');

    const showArmy = opts.showArmy !== false;
    setElementDisplay('army', showArmy ? '' : 'none');

    const showRewards = opts.showGBRewards !== false;
    setElementDisplay('rewards', showRewards ? '' : 'none');
    setElementDisplay('cityrewards', showRewards ? '' : 'none');

    const showTargets = opts.showBattleground !== false;
    setElementDisplay('gbgTargetGenerator', showTargets ? '' : 'none');
    setElementDisplay('targets', showTargets ? '' : 'none');

    const showBattlegrounds = opts.showBattleground !== false;
    setElementDisplay('battlegrounds', showBattlegrounds ? '' : 'none');
    setElementDisplay('battleground', showBattlegrounds ? '' : 'none');

    const showLeaderboard = opts.showLeaderboard !== false;
    setElementDisplay('gbgLeaderboard', showLeaderboard ? '' : 'none');
    setElementDisplay('leaderboard', showLeaderboard ? '' : 'none');

    // Explicitly block/hide all non-combat panels
    // 9 Non-combat panels from 15:
    setElementDisplay('incidents', 'none');
    setElementDisplay('gbDonation', 'none');
    setElementDisplay('donation2', 'none');
    setElementDisplay('donation', 'none');
    setElementDisplay('gbInfo', 'none');
    setElementDisplay('gbContributors', 'none');
    setElementDisplay('greatbuilding', 'none');
    setElementDisplay('invested', 'none');
    setElementDisplay('geChampionship', 'none');
    setElementDisplay('donationDIV2', 'none');
    setElementDisplay('geInternationalSection', 'none');
    setElementDisplay('geContributions', 'none');
    setElementDisplay('geContributionSection', 'none');
    setElementDisplay('goodsInventory', 'none');
    setElementDisplay('goods', 'none');
    setElementDisplay('guildOverview', 'none');
    setElementDisplay('guild', 'none');
    setElementDisplay('treasury', 'none');
    setElementDisplay('treasuryLog', 'none');
    setElementDisplay('quantumContributions', 'none');
    setElementDisplay('quantumLeaderboard', 'none');

    // City Utilities & Lists
    setElementDisplay('friends', 'none');
    setElementDisplay('hood', 'none');
    setElementDisplay('overview', 'none');
    setElementDisplay('info', 'none');
    setElementDisplay('buildings', 'none');
    setElementDisplay('bonus', 'none');
    setElementDisplay('galaxy', 'none');
    setElementDisplay('cultural', 'none');
    setElementDisplay('visit', 'none');
    return;
  }

  // --- 3. CITY VIEW (activeView === 'CITY') ---
  if (activeView === 'CITY') {
    // Explicitly hide GBG-specific panels
    setElementDisplay('gbgTargetGenerator', 'none');
    setElementDisplay('targets', 'none');
    setElementDisplay('battlegrounds', 'none');
    setElementDisplay('battleground', 'none');
    setElementDisplay('gbgLeaderboard', 'none');
    setElementDisplay('leaderboard', 'none');

    // City panels obey showOptions
    const showHeader = opts.showStats !== false;
    setElementDisplay('header', showHeader ? '' : 'none');
    setElementDisplay('citystats', showHeader ? '' : 'none');

    setElementDisplay('incidents', opts.showIncidents !== false ? '' : 'none');
    setElementDisplay('army', opts.showArmy !== false ? '' : 'none');

    const showRewards = opts.showGBRewards !== false;
    setElementDisplay('rewards', showRewards ? '' : 'none');
    setElementDisplay('cityrewards', showRewards ? '' : 'none');

    const showDonation = opts.showDonation !== false;
    setElementDisplay('gbDonation', showDonation ? '' : 'none');
    setElementDisplay('donation2', showDonation ? '' : 'none');
    setElementDisplay('donation', showDonation ? '' : 'none');

    setElementDisplay('gbInfo', opts.showGBInfo !== false ? '' : 'none');

    const showGBDonors = opts.showGBDonors !== false;
    setElementDisplay('gbContributors', showGBDonors ? '' : 'none');
    setElementDisplay('greatbuilding', showGBDonors ? '' : 'none');
    setElementDisplay('invested', opts.showInvested !== false ? '' : 'none');

    const showGeChamp =
      opts.showExpedition !== false ||
      opts.showInternationalExpedition !== false;
    setElementDisplay('geChampionship', showGeChamp ? '' : 'none');
    setElementDisplay('donationDIV2', showGeChamp ? '' : 'none');
    setElementDisplay('donation2DIV', showGeChamp ? '' : 'none');
    setElementDisplay(
      'geInternationalSection',
      opts.showInternationalExpedition !== false ? '' : 'none',
    );
    setElementDisplay(
      'geContributions',
      opts.showExpedition !== false ? '' : 'none',
    );
    setElementDisplay(
      'geContributionSection',
      opts.showExpedition !== false ? '' : 'none',
    );

    const goodsEl = document.getElementById('goods');
    const goodsInvEl = document.getElementById('goodsInventory');
    if (opts.showGoods === false) {
      if (goodsEl) goodsEl.style.display = 'none';
      if (goodsInvEl) goodsInvEl.style.display = 'none';
    } else {
      const hasGoodsContent =
        (goodsEl?.innerHTML || goodsInvEl?.innerHTML || '').trim() !== '';
      const displayStyle = hasGoodsContent ? '' : 'none';
      if (goodsEl) goodsEl.style.display = displayStyle;
      if (goodsInvEl) goodsInvEl.style.display = displayStyle;
    }

    const showGuild = opts.showGuildOverview !== false;
    setElementDisplay('guildOverview', showGuild ? '' : 'none');
    setElementDisplay('guild', showGuild ? '' : 'none');

    const showTreasury = opts.showTreasury !== false;
    setElementDisplay('treasury', showTreasury ? '' : 'none');
    setElementDisplay('treasuryLog', showTreasury ? '' : 'none');

    setElementDisplay('bonus', opts.showBonus !== false ? '' : 'none');
    setElementDisplay('visit', opts.showVisit !== false ? '' : 'none');
    setElementDisplay('cultural', opts.showSettlement !== false ? '' : 'none');
    setElementDisplay('friends', opts.showFriends !== false ? '' : 'none');
    setElementDisplay('hood', opts.showHood !== false ? '' : 'none');
    setElementDisplay('galaxy', opts.showGalaxy !== false ? '' : 'none');
    setElementDisplay(
      'quantumContributions',
      opts.showQuantum !== false ? '' : 'none',
    );
    setElementDisplay(
      'quantumLeaderboard',
      opts.showQuantumLeaderboard !== false ? '' : 'none',
    );
    return;
  }

  // --- 4. UNCONSTRAINED DEFAULT (activeView === null) ---
  // Apply standard options across all configured panels
  for (const [optKey, elemId] of Object.entries(optionToElementId)) {
    const el = document.getElementById(elemId);
    if (el) {
      const isVisible = opts[optKey] !== false;
      el.style.display = isVisible ? '' : 'none';
    }
  }

  const goodsEl = document.getElementById('goods');
  if (goodsEl) {
    if (opts.showGoods === false) {
      goodsEl.style.display = 'none';
    } else if ((goodsEl.innerHTML || '').trim() !== '') {
      goodsEl.style.display = '';
    }
  }

  const donation2El = document.getElementById('donation2');
  if (donation2El) {
    donation2El.style.display = opts.showDonation !== false ? '' : 'none';
  }

  const gbInfoEl = document.getElementById('gbInfo');
  if (gbInfoEl) {
    gbInfoEl.style.display = opts.showGBInfo !== false ? '' : 'none';
  }

  const gbEl = document.getElementById('greatbuilding');
  if (gbEl) {
    const isVisible = opts.showGBDonors !== false;
    gbEl.style.display = isVisible ? '' : 'none';
  }

  const rewardsEl =
    document.getElementById('cityrewards') ||
    document.getElementById('rewards');
  if (rewardsEl) {
    rewardsEl.style.display = opts.showGBRewards !== false ? '' : 'none';
  }

  const donationDiv2El =
    document.getElementById('donationDIV2') ||
    document.getElementById('donation2DIV');
  if (donationDiv2El) {
    const isVisible =
      opts.showExpedition !== false ||
      opts.showInternationalExpedition !== false;
    donationDiv2El.style.display = isVisible ? '' : 'none';
  }

  const geIntEl = document.getElementById('geInternationalSection');
  if (geIntEl) {
    geIntEl.style.display =
      opts.showInternationalExpedition !== false ? '' : 'none';
  }

  const geContribEl = document.getElementById('geContributionSection');
  if (geContribEl) {
    geContribEl.style.display = opts.showExpedition !== false ? '' : 'none';
  }

  const legacyLeaderboardEl = document.getElementById('leaderboard');
  if (legacyLeaderboardEl) {
    legacyLeaderboardEl.style.display =
      opts.showLeaderboard !== false ? '' : 'none';
  }
}

if (
  typeof window !== 'undefined' &&
  typeof window.addEventListener === 'function'
) {
  window.addEventListener('foe_options_updated', () => {
    applyCardVisibility();
  });
}

module.exports = {
  applyCardVisibility,
  getCurrentView,
  setCurrentView,
  onViewChange,
  ALL_15_PANEL_IDS,
  GBG_ALLOWED_PANEL_IDS,
  CITY_HIDDEN_PANEL_IDS,
  optionToElementId,
};
module.exports.default = module.exports;
