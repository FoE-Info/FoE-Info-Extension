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
    'friends',
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
  geContributionSection: 'donationDIV2',
  geInternationalSection: 'donationDIV2',
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
  friends: 'showFriends',
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

/**
 * Panels eligible for a debug stub. Only the visible topmost non-empty target in
 * a subtree is stubbed, so wrappers and empty shells are skipped. The Lists card
 * (#friends) is unwrapped into its three per-checker sections, and the GE cards
 * are targeted directly rather than their hidden wrappers.
 */
const DEBUG_STUB_EXCLUDED = new Set([
  'friends',
  'geChampionship',
  'geContributions',
  'geContributionSection',
  'geInternationalSection',
  'donationDIV2',
  'donation2DIV',
]);
const DEBUG_STUB_PANEL_IDS = new Set([
  ...ALL_KNOWN_PANEL_IDS.filter((id) => !DEBUG_STUB_EXCLUDED.has(id)),
  'friendsText',
  'guildText',
  'hoodText',
  'geChampionshipCard',
  'geContributionCard',
]);

let debugStubObserver = null;
let debugStubSyncQueued = false;

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

/** Escape a value for safe inclusion inside the debug stub markup. */
function escapeDebugData(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip any previously injected debug stub from a panel's innerHTML. */
function stripDebugStubs(html) {
  return String(html || '')
    .replace(/<div[^>]*class="[^"]*debug-stub[^"]*"[^>]*>.*?<\/div>/gs, '')
    .trim();
}

function debugStubBody(data) {
  return data ?
      `<details><summary>data</summary><pre class="m-0" style="white-space: pre-wrap; word-break: break-word;">${escapeDebugData(
        data,
      )}</pre></details>`
    : '<span class="fst-italic">empty</span>';
}

function makeDebugStubMarkup(panelId, data) {
  return `<div class="alert alert-secondary p-2 mb-2 font-monospace small debug-stub" data-foe-stub-for="${panelId}"><strong>[DEBUG STUB]</strong> ${panelId} ${debugStubBody(
    data,
  )}</div>`;
}

/** True when the element is currently rendered (inline or computed display). */
function isPanelVisible(el) {
  if (!el) return false;
  if (el.style && el.style.display === 'none') return false;
  if (typeof getComputedStyle === 'function') {
    try {
      if (getComputedStyle(el).display === 'none') return false;
    } catch {
      // ignore: non-DOM test double
    }
  }
  return true;
}

/** True when a visible stubbed panel wraps this element (avoids nesting stubs). */
function hasVisibleStubAncestor(el) {
  let parent = el.parentElement || null;
  while (parent) {
    if (DEBUG_STUB_PANEL_IDS.has(parent.id) && isPanelVisible(parent)) {
      return true;
    }
    parent = parent.parentElement || null;
  }
  return false;
}

/** Prefer the panel's primary card so the stub reads as attached inside it. */
function resolveDebugStubHost(el) {
  if (typeof el.querySelector !== 'function') return el;
  return (
    el.querySelector(':scope > .alert:not(.debug-stub)') ||
    el.querySelector(':scope > [class*="foe-card"]') ||
    el.querySelector(':scope > .card') ||
    el.querySelector('.alert:not(.debug-stub)') ||
    el.querySelector('[class*="foe-card"]') ||
    el.querySelector('.card') ||
    el
  );
}

/**
 * Insert or refresh a panel's debug stub with a raw (escaped) dump of its
 * current rendered content. The stub is kept as the first child of the panel's
 * card so it reads as attached, while sibling nodes and their listeners survive.
 */
function upsertDebugStub(el, panelId) {
  const data = stripDebugStubs(el.innerHTML);

  if (typeof el.querySelector === 'function') {
    const host = resolveDebugStubHost(el);
    const existing =
      el.querySelector(`.debug-stub[data-foe-stub-for="${panelId}"]`) ||
      el.querySelector('.debug-stub');

    if (existing && existing.parentElement === host) {
      if (typeof existing.setAttribute === 'function') {
        existing.setAttribute('data-foe-stub-for', panelId);
      }
      const pre =
        typeof existing.querySelector === 'function' ?
          existing.querySelector('pre')
        : null;
      if (data && pre) {
        if (pre.textContent !== data) pre.textContent = data;
        return;
      }
      if (!data && !pre) return;
    }
    if (existing && typeof existing.remove === 'function') existing.remove();
    if (typeof host.insertAdjacentHTML === 'function') {
      host.insertAdjacentHTML('afterbegin', makeDebugStubMarkup(panelId, data));
      return;
    }
  }

  // Test-double fallback (no real DOM querying): rebuild stripped markup.
  el.innerHTML =
    makeDebugStubMarkup(panelId, data) + stripDebugStubs(el.innerHTML);
}

/** Remove every debug stub and stop observing panel mutations. */
function removeDebugStubs() {
  if (debugStubObserver) {
    debugStubObserver.disconnect();
    debugStubObserver = null;
  }
  if (typeof document.querySelectorAll !== 'function') return;
  const stubs = document.querySelectorAll('.debug-stub') || [];
  for (const stub of stubs) {
    if (stub?.parentNode?.removeChild) {
      stub.parentNode.removeChild(stub);
    }
  }
}

/** Rebuild stubs for every visible topmost panel with its live content. */
function syncDebugStubs() {
  if (typeof document === 'undefined') return;

  const targets = [];
  for (const id of DEBUG_STUB_PANEL_IDS) {
    const el = document.getElementById(id);
    if (!el || !isPanelVisible(el)) continue;
    if (hasVisibleStubAncestor(el)) continue;
    if (stripDebugStubs(el.innerHTML).trim() === '') continue;
    targets.push([id, el]);
  }
  const keep = new Set(targets.map(([id]) => id));

  if (typeof document.querySelectorAll === 'function') {
    for (const stub of document.querySelectorAll('.debug-stub') || []) {
      const owner =
        stub.getAttribute?.('data-foe-stub-for') ||
        stub.dataset?.foeStubFor ||
        '';
      const ownerEl = owner ? document.getElementById(owner) : null;
      if (!keep.has(owner) || !isPanelVisible(ownerEl)) {
        if (stub.parentNode?.removeChild) stub.parentNode.removeChild(stub);
      }
    }
  }

  for (const [id, el] of targets) upsertDebugStub(el, id);
}

function scheduleDebugStubSync() {
  if (debugStubSyncQueued) return;
  debugStubSyncQueued = true;
  const run = () => {
    debugStubSyncQueued = false;
    syncDebugStubs();
  };
  if (typeof queueMicrotask === 'function') queueMicrotask(run);
  else if (typeof setTimeout === 'function') setTimeout(run, 0);
  else run();
}

/** Watch panel mount/render mutations so stubs always reflect live content. */
function ensureDebugStubObserver() {
  if (debugStubObserver || typeof MutationObserver === 'undefined') return;
  if (typeof document === 'undefined') return;
  const root = document.body || document.documentElement;
  if (!root) return;
  debugStubObserver = new MutationObserver((mutations) => {
    const relevant = mutations.some((m) => {
      if (m.target?.closest?.('.debug-stub')) return false;
      const nodes = [...(m.addedNodes || []), ...(m.removedNodes || [])];
      if (
        nodes.length > 0 &&
        nodes.every((n) => n.classList && n.classList.contains('debug-stub'))
      ) {
        return false;
      }
      return true;
    });
    if (relevant) scheduleDebugStubSync();
  });
  debugStubObserver.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });
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
  // Respect the active context/options visibility, then annotate every visible
  // panel with a stub carrying its raw rendered content. A MutationObserver
  // keeps the stubs in sync as panels mount and re-render after this pass.
  if (isDebug) {
    if (activeView && CONTEXT_ALLOWED_PANELS[activeView]) {
      applyContextVisibility(opts, activeView);
    } else {
      applyUnconstrainedVisibility(opts);
    }
    syncDebugStubs();
    ensureDebugStubObserver();
    return;
  }

  // --- Remove any debug stubs if debug mode is inactive ---
  removeDebugStubs();

  // --- 2. CONTEXT-CONSTRAINED VIEW ---
  if (activeView && CONTEXT_ALLOWED_PANELS[activeView]) {
    applyContextVisibility(opts, activeView);
    return;
  }

  // --- 3. UNCONSTRAINED DEFAULT (activeView === null) ---
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
