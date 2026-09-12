/**
 * cardVisibility.js
 *
 * Declarative context-driven panel visibility engine.
 *
 * 1. Six game contexts (OWN_CITY, GBG, GE, QI, SETTLEMENT, OTHER_PLAYER) each
 *    declare the panels they permit via CONTEXT_ALLOWED_PANELS. Panels absent
 *    from the active context are hidden (display: none) rather than wiped, so
 *    DOM listeners and scroll state survive context switches.
 * 2. Debug Mode Override (isDebug === true) forces every known panel visible
 *    and seeds placeholder stubs when content is absent.
 * 3. Active world showOptions gate the panels a context permits.
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

const GAME_CONTEXTS = Object.freeze([
  'OWN_CITY',
  'GBG',
  'GE',
  'QI',
  'SETTLEMENT',
  'OTHER_PLAYER',
]);

/**
 * Canonical whitelist of panels per game context. Ancestor wrapper containers
 * are resolved automatically by getAllowedPanelsForView(), so listing a nested
 * panel (e.g. #goods) keeps its wrapper (#goodsInventory) visible too.
 */
const CONTEXT_ALLOWED_PANELS = Object.freeze({
  OWN_CITY: Object.freeze([
    'header',
    'citystats',
    'incidents',
    'army',
    'rewards',
    'cityrewards',
    'bonus',
    'galaxy',
    'invested',
    'greatbuilding',
    'gbInfo',
    'donation',
    'donation2',
    'donationDIV2',
    'guild',
    'treasury',
    'treasuryLog',
    'goods',
  ]),
  GBG: Object.freeze([
    'header',
    'citystats',
    'army',
    'rewards',
    'targets',
    'gbgTargetGenerator',
    'battleground',
    'battlegrounds',
    'gbgLeaderboard',
  ]),
  GE: Object.freeze([
    'header',
    'citystats',
    'army',
    'rewards',
    'geChampionship',
    'geContributions',
    'geInternationalSection',
    'geContributionSection',
  ]),
  QI: Object.freeze([
    'header',
    'citystats',
    'army',
    'rewards',
    'quantumContributions',
    'quantumLeaderboard',
  ]),
  SETTLEMENT: Object.freeze(['header', 'citystats', 'cultural']),
  OTHER_PLAYER: Object.freeze([
    'header',
    'citystats',
    'visit',
    'donation',
    'donation2',
    'gbInfo',
    'greatbuilding',
  ]),
});

/** Parent wrapper container for each nested panel. */
const PANEL_PARENT = Object.freeze({
  citystats: 'header',
  cityrewards: 'rewards',
  donation2: 'gbDonation',
  donation2DIV: 'gbDonation',
  donation: 'gbDonation',
  greatbuilding: 'gbContributors',
  targets: 'gbgTargetGenerator',
  battleground: 'battlegrounds',
  donationDIV2: 'geChampionship',
  goods: 'goodsInventory',
  guild: 'guildOverview',
  treasuryLog: 'treasury',
  leaderboard: 'gbgLeaderboard',
});

/** showOptions key gating each panel (absent means "always permitted"). */
const PANEL_OPTION_KEY = Object.freeze({
  header: 'showStats',
  citystats: 'showStats',
  incidents: 'showIncidents',
  army: 'showArmy',
  rewards: 'showGBRewards',
  cityrewards: 'showGBRewards',
  bonus: 'showBonus',
  galaxy: 'showGalaxy',
  invested: 'showInvested',
  greatbuilding: 'showGBDonors',
  gbInfo: 'showGBInfo',
  donation: 'showDonation',
  donation2: 'showDonation',
  guild: 'showGuildOverview',
  guildOverview: 'showGuildOverview',
  treasury: 'showTreasury',
  treasuryLog: 'showTreasury',
  goodsInventory: 'showGoods',
  gbgTargetGenerator: 'showBattleground',
  targets: 'showBattleground',
  battlegrounds: 'showBattleground',
  battleground: 'showBattleground',
  gbgLeaderboard: 'showLeaderboard',
  leaderboard: 'showLeaderboard',
  quantumContributions: 'showQuantum',
  quantumLeaderboard: 'showQuantumLeaderboard',
  cultural: 'showSettlement',
  visit: 'showVisit',
  geContributions: 'showExpedition',
  geContributionSection: 'showExpedition',
  geInternationalSection: 'showInternationalExpedition',
});

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

const GBG_ALLOWED_PANEL_IDS = new Set(CONTEXT_ALLOWED_PANELS.GBG);

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

const SECONDARY_PANEL_IDS = [
  'donation2DIV',
  'leaderboard',
  'friends',
  'hood',
  'overview',
  'info',
  'buildings',
  'goodsInventory',
  'guildOverview',
  'gbDonation',
  'gbContributors',
  'bonus',
  'galaxy',
  'invested',
  'citystats',
  'cityrewards',
  'donation',
  'donation2',
  'donationDIV2',
  'greatbuilding',
  'targets',
  'battleground',
  'guild',
  'treasuryLog',
  'goods',
  'geInternationalSection',
  'geContributionSection',
];

const CONTEXT_PANEL_IDS = new Set();
for (const list of Object.values(CONTEXT_ALLOWED_PANELS)) {
  for (const id of list) CONTEXT_PANEL_IDS.add(id);
}

const ALL_KNOWN_PANEL_IDS = Array.from(
  new Set([
    ...ALL_15_PANEL_IDS,
    ...CONTEXT_PANEL_IDS,
    ...Object.values(optionToElementId),
    ...SECONDARY_PANEL_IDS,
  ]),
);

let currentView = null; // one of GAME_CONTEXTS or null (unconstrained default)
const viewListeners = new Set();

/**
 * Resolve a raw view value into a canonical context.
 * @returns {string|null|undefined} context, null for "unconstrained", or
 *   undefined when the value is not a recognised context.
 */
function normalizeContext(view) {
  if (view === null || view === undefined) return null;
  const text = String(view).toUpperCase().trim();
  if (text === '') return null;
  if (text === 'CITY' || text === 'MAIN' || text === 'OWN_CITY') {
    return 'OWN_CITY';
  }
  return GAME_CONTEXTS.includes(text) ? text : undefined;
}

function getCurrentView() {
  return currentView;
}

function setCurrentView(view) {
  const normalized = normalizeContext(view);
  if (normalized === undefined) return;
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

/** Expand a context whitelist to include every permitted panel's wrappers. */
function getAllowedPanelsForView(view) {
  const list = CONTEXT_ALLOWED_PANELS[view];
  if (!list) return null;
  const allowed = new Set();
  for (const id of list) {
    let cursor = id;
    while (cursor && !allowed.has(cursor)) {
      allowed.add(cursor);
      cursor = PANEL_PARENT[cursor] || null;
    }
  }
  return allowed;
}

/** Hide every non-permitted panel and reveal permitted panels obeying options. */
function applyContextVisibility(opts, activeView) {
  const allowed = getAllowedPanelsForView(activeView);
  if (!allowed) return false;

  for (const id of ALL_KNOWN_PANEL_IDS) {
    if (!allowed.has(id)) {
      setElementDisplay(id, 'none');
      continue;
    }
    const optionKey = PANEL_OPTION_KEY[id];
    if (optionKey && opts[optionKey] === false) {
      setElementDisplay(id, 'none');
      continue;
    }
    if (id === 'goods') {
      const goodsEl =
        typeof document !== 'undefined' ?
          document.getElementById('goods')
        : null;
      const hasGoodsContent = (goodsEl?.innerHTML || '').trim() !== '';
      setElementDisplay('goods', hasGoodsContent ? '' : 'none');
      continue;
    }
    setElementDisplay(id, '');
  }
  return true;
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

  let activeView = currentView;
  if (viewOverride !== null && viewOverride !== undefined) {
    const normalizedOverride = normalizeContext(viewOverride);
    if (normalizedOverride !== undefined) {
      activeView = normalizedOverride;
    }
  }

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

    // Force every known panel (including legacy aliases) visible.
    for (const panelId of ALL_KNOWN_PANEL_IDS) {
      setElementDisplay(panelId, '');
    }
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

  // --- 2. CONTEXT-CONSTRAINED VIEW ---
  if (activeView && CONTEXT_ALLOWED_PANELS[activeView]) {
    applyContextVisibility(opts, activeView);
    return;
  }

  // --- 3. UNCONSTRAINED DEFAULT (activeView === null) ---
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

  const guildVisible = opts.showGuildOverview !== false;
  const guildOverviewEl = document.getElementById('guildOverview');
  if (guildOverviewEl) {
    guildOverviewEl.style.display = guildVisible ? '' : 'none';
  }
  const guildEl = document.getElementById('guild');
  if (guildEl) {
    guildEl.style.display = guildVisible ? '' : 'none';
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
  normalizeContext,
  getAllowedPanelsForView,
  GAME_CONTEXTS,
  CONTEXT_ALLOWED_PANELS,
  PANEL_PARENT,
  ALL_15_PANEL_IDS,
  ALL_KNOWN_PANEL_IDS,
  GBG_ALLOWED_PANEL_IDS,
  CITY_HIDDEN_PANEL_IDS,
  optionToElementId,
};
module.exports.default = module.exports;
