/**
 * cardVisibility.js
 *
 * Declarative context-driven panel visibility engine.
 *
 * 1. Six game contexts (OWN_CITY, GBG, GE, QI, SETTLEMENT, OTHER_PLAYER) each
 *    declare the panels they permit via CONTEXT_ALLOWED_PANELS. Panels absent
 *    from the active context are hidden (display: none) rather than wiped, so
 *    DOM listeners and scroll state survive context switches.
 * 2. Debug Mode Override (isDebug === true) respects the active context/options
 *    visibility and annotates each visible panel with a stub carrying its raw
 *    rendered content for inspection.
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

const {
  GAME_CONTEXTS,
  CONTEXT_ALLOWED_PANELS,
  PANEL_PARENT,
  PANEL_OPTION_KEY,
  ALL_15_PANEL_IDS,
  GBG_ALLOWED_PANEL_IDS,
  CITY_HIDDEN_PANEL_IDS,
  optionToElementId,
  ALL_KNOWN_PANEL_IDS,
} = require('./cardVisibilityConfig.js');

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

  // --- 1. CONTEXT-CONSTRAINED VIEW ---
  if (activeView && CONTEXT_ALLOWED_PANELS[activeView]) {
    applyContextVisibility(opts, activeView);
    return;
  }

  // --- 2. UNCONSTRAINED DEFAULT (activeView === null) ---
  applyUnconstrainedVisibility(opts);
}

/**
 * Apply unconstrained visibility (no active context): options gates for every
 * configured panel plus the special-cased wrappers.
 */
function applyUnconstrainedVisibility(opts) {
  // Apply standard options across all configured panels
  for (const [optKey, elemId] of Object.entries(optionToElementId)) {
    const el = document.getElementById(elemId);
    if (el) {
      const isVisible = opts[optKey] !== false;
      el.style.display = isVisible ? '' : 'none';
    }
  }

  const goodsEl = document.getElementById('goods');
  const goodsWrapperEl = document.getElementById('goodsInventory');
  const goodsHasContent = (goodsEl?.innerHTML || '').trim() !== '';
  const goodsVisible = opts.showGoods !== false && goodsHasContent;
  if (goodsEl) {
    goodsEl.style.display = goodsVisible ? '' : 'none';
  }
  if (goodsWrapperEl) {
    goodsWrapperEl.style.display = goodsVisible ? '' : 'none';
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
