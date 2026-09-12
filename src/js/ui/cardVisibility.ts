/**
 * cardVisibility.ts
 *
 * Declarative context-driven panel visibility engine (typed mirror of
 * cardVisibility.js, the CommonJS runtime).
 *
 * 1. Six game contexts (OWN_CITY, GBG, GE, QI, SETTLEMENT, OTHER_PLAYER) each
 *    declare the panels they permit via CONTEXT_ALLOWED_PANELS. Panels absent
 *    from the active context are hidden (display: none) rather than wiped, so
 *    DOM listeners and scroll state survive context switches.
 * 2. Debug Mode Override (isDebug === true) forces every known panel visible
 *    and seeds placeholder stubs when content is absent.
 * 3. Active world showOptions gate the panels a context permits.
 *
 * Zero DOM library dependencies — vanilla DOM APIs only.
 */

declare const __webpack_require__: unknown;

let showOptionsState: ShowOptionsState = {};
if (typeof __webpack_require__ !== 'undefined') {
  try {
    const showOptModule = require('../state/showOptions.js');
    showOptionsState = showOptModule.showOptions || showOptModule;
  } catch {
    showOptionsState = {};
  }
}

let isDebugEnabledGlobal: () => boolean = () => false;
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

/** Canonical game contexts tracked by the visibility engine. */
export type GameContext =
  'OWN_CITY' | 'GBG' | 'GE' | 'QI' | 'SETTLEMENT' | 'OTHER_PLAYER';

export type ViewState = GameContext;
export type ViewFilter = GameContext | null;
export type ViewChangeListener = (view: ViewFilter) => void;

export const GAME_CONTEXTS: readonly GameContext[] = [
  'OWN_CITY',
  'GBG',
  'GE',
  'QI',
  'SETTLEMENT',
  'OTHER_PLAYER',
] as const;

/**
 * Canonical whitelist of panels per game context. Ancestor wrapper containers
 * are resolved automatically by getAllowedPanelsForView(), so listing a nested
 * panel (e.g. #goods) keeps its wrapper (#goodsInventory) visible too.
 */
export const CONTEXT_ALLOWED_PANELS: Readonly<
  Record<GameContext, readonly string[]>
> = {
  OWN_CITY: [
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
  ],
  GBG: [
    'header',
    'citystats',
    'army',
    'rewards',
    'targets',
    'gbgTargetGenerator',
    'battleground',
    'battlegrounds',
    'gbgLeaderboard',
  ],
  GE: [
    'header',
    'citystats',
    'army',
    'rewards',
    'geChampionship',
    'geContributions',
    'geInternationalSection',
    'geContributionSection',
  ],
  QI: [
    'header',
    'citystats',
    'army',
    'rewards',
    'quantumContributions',
    'quantumLeaderboard',
  ],
  SETTLEMENT: ['header', 'citystats', 'cultural'],
  OTHER_PLAYER: [
    'header',
    'citystats',
    'visit',
    'donation',
    'donation2',
    'gbInfo',
    'greatbuilding',
  ],
};

/** Parent wrapper container for each nested panel. */
export const PANEL_PARENT: Readonly<Record<string, string>> = {
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
};

/** showOptions key gating each panel (absent means "always permitted"). */
export const PANEL_OPTION_KEY: Readonly<Record<string, string>> = {
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
};

/** All 15 sidebar panels governed by context view filtering. */
export const ALL_15_PANEL_IDS = [
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
] as const;

export type PanelId = (typeof ALL_15_PANEL_IDS)[number];

/** Panels permitted in GBG map view (combat-essential only). */
export const GBG_ALLOWED_PANEL_IDS: ReadonlySet<string> = new Set(
  CONTEXT_ALLOWED_PANELS.GBG,
);

/** Panels explicitly hidden when the player is not in GBG. */
export const CITY_HIDDEN_PANEL_IDS: ReadonlySet<string> = new Set([
  'gbgTargetGenerator',
  'battlegrounds',
  'gbgLeaderboard',
]);

/** Active world visibility toggles (all optional; absent means visible). */
export interface ShowOptionsState {
  [key: string]: unknown;
  showStats?: boolean;
  showBonus?: boolean;
  showIncidents?: boolean;
  showInvested?: boolean;
  showVisit?: boolean;
  showDonation?: boolean;
  showGBInfo?: boolean;
  showGBDonors?: boolean;
  showSettlement?: boolean;
  showArmy?: boolean;
  showFriends?: boolean;
  showGuild?: boolean;
  showGuildOverview?: boolean;
  showHood?: boolean;
  showTreasury?: boolean;
  showGBRewards?: boolean;
  showGalaxy?: boolean;
  showBattleground?: boolean;
  showLeaderboard?: boolean;
  showExpedition?: boolean;
  showInternationalExpedition?: boolean;
  showGoods?: boolean;
  showQuantum?: boolean;
  showQuantumLeaderboard?: boolean;
  showQIChanges?: boolean;
}

export const optionToElementId: Record<string, string> = {
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

const CONTEXT_PANEL_IDS = new Set<string>();
for (const list of Object.values(CONTEXT_ALLOWED_PANELS)) {
  for (const id of list) CONTEXT_PANEL_IDS.add(id);
}

export const ALL_KNOWN_PANEL_IDS: readonly string[] = Array.from(
  new Set<string>([
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
const DEBUG_STUB_EXCLUDED = new Set<string>([
  'friends',
  'geChampionship',
  'geContributions',
  'geContributionSection',
  'geInternationalSection',
  'donationDIV2',
  'donation2DIV',
]);
const DEBUG_STUB_PANEL_IDS = new Set<string>([
  ...ALL_KNOWN_PANEL_IDS.filter((id) => !DEBUG_STUB_EXCLUDED.has(id)),
  'friendsText',
  'guildText',
  'hoodText',
  'geChampionshipCard',
  'geContributionCard',
]);

let debugStubObserver: MutationObserver | null = null;
let debugStubSyncQueued = false;

let currentView: ViewFilter = null;
const viewListeners = new Set<ViewChangeListener>();

/**
 * Resolve a raw view value into a canonical context.
 * @returns context, null for "unconstrained", or undefined when unrecognised.
 */
export function normalizeContext(
  view: ViewState | string | null | undefined,
): GameContext | null | undefined {
  if (view === null || view === undefined) return null;
  const text = String(view).toUpperCase().trim();
  if (text === '') return null;
  if (text === 'CITY' || text === 'MAIN' || text === 'OWN_CITY') {
    return 'OWN_CITY';
  }
  return (GAME_CONTEXTS as readonly string[]).includes(text) ?
      (text as GameContext)
    : undefined;
}

export function getCurrentView(): ViewFilter {
  return currentView;
}

export function setCurrentView(
  view: ViewState | string | null | undefined,
): void {
  const normalized = normalizeContext(view);
  if (normalized === undefined) return;
  if (currentView === normalized) return;
  currentView = normalized;
  for (const fn of viewListeners) {
    try {
      fn(currentView);
    } catch {
      // Listener errors must never break view switching.
    }
  }
  applyCardVisibility();
}

export function onViewChange(callback: ViewChangeListener): () => void {
  if (typeof callback !== 'function') return () => {};
  viewListeners.add(callback);
  return () => {
    viewListeners.delete(callback);
  };
}

function setElementDisplay(id: string, displayVal: '' | 'none'): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (el) {
    el.style.display = displayVal;
  }
}

/** Escape a value for safe inclusion inside the debug stub markup. */
function escapeDebugData(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip any previously injected debug stub from a panel's innerHTML. */
function stripDebugStubs(html: string): string {
  return String(html || '')
    .replace(/<div[^>]*class="[^"]*debug-stub[^"]*"[^>]*>.*?<\/div>/gs, '')
    .trim();
}

function debugStubBody(data: string): string {
  return data ?
      `<details><summary>data</summary><pre class="m-0" style="white-space: pre-wrap; word-break: break-word;">${escapeDebugData(
        data,
      )}</pre></details>`
    : '<span class="fst-italic">empty</span>';
}

function makeDebugStubMarkup(panelId: string, data: string): string {
  return `<div class="alert alert-secondary p-2 mb-2 font-monospace small debug-stub" data-foe-stub-for="${panelId}"><strong>[DEBUG STUB]</strong> ${panelId} ${debugStubBody(
    data,
  )}</div>`;
}

/** True when the element is currently rendered (inline or computed display). */
function isPanelVisible(el: HTMLElement | null): boolean {
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
function hasVisibleStubAncestor(el: HTMLElement): boolean {
  let parent: Element | null = el.parentElement;
  while (parent) {
    if (
      DEBUG_STUB_PANEL_IDS.has(parent.id) &&
      isPanelVisible(parent as HTMLElement)
    ) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

/** Prefer the panel's primary card so the stub reads as attached inside it. */
function resolveDebugStubHost(el: HTMLElement): HTMLElement {
  if (typeof el.querySelector !== 'function') return el;
  return (
    (el.querySelector(
      ':scope > .alert:not(.debug-stub)',
    ) as HTMLElement | null) ||
    (el.querySelector(':scope > [class*="foe-card"]') as HTMLElement | null) ||
    (el.querySelector(':scope > .card') as HTMLElement | null) ||
    (el.querySelector('.alert:not(.debug-stub)') as HTMLElement | null) ||
    (el.querySelector('[class*="foe-card"]') as HTMLElement | null) ||
    (el.querySelector('.card') as HTMLElement | null) ||
    el
  );
}

/**
 * Insert or refresh a panel's debug stub with a raw (escaped) dump of its
 * current rendered content. The stub is kept as the first child of the panel's
 * card so it reads as attached, while sibling nodes and their listeners survive.
 */
function upsertDebugStub(el: HTMLElement, panelId: string): void {
  const data = stripDebugStubs(el.innerHTML);

  if (typeof el.querySelector === 'function') {
    const host = resolveDebugStubHost(el);
    const existing =
      (el.querySelector(
        `.debug-stub[data-foe-stub-for="${panelId}"]`,
      ) as HTMLElement | null) ||
      (el.querySelector('.debug-stub') as HTMLElement | null);

    if (existing && existing.parentElement === host) {
      existing.setAttribute('data-foe-stub-for', panelId);
      const pre = existing.querySelector('pre');
      if (data && pre) {
        if (pre.textContent !== data) pre.textContent = data;
        return;
      }
      if (!data && !pre) return;
    }
    if (existing) existing.remove();
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
function removeDebugStubs(): void {
  if (debugStubObserver) {
    debugStubObserver.disconnect();
    debugStubObserver = null;
  }
  if (typeof document.querySelectorAll !== 'function') return;
  const stubs = document.querySelectorAll('.debug-stub');
  stubs.forEach((stub) => {
    const parent = stub.parentNode as Node | null;
    if (parent?.removeChild) parent.removeChild(stub);
  });
}

/** Rebuild stubs for every visible topmost panel with its live content. */
function syncDebugStubs(): void {
  if (typeof document === 'undefined') return;

  const targets: Array<[string, HTMLElement]> = [];
  for (const id of DEBUG_STUB_PANEL_IDS) {
    const el = document.getElementById(id);
    if (!el || !isPanelVisible(el)) continue;
    if (hasVisibleStubAncestor(el)) continue;
    if (stripDebugStubs(el.innerHTML).trim() === '') continue;
    targets.push([id, el]);
  }
  const keep = new Set(targets.map(([id]) => id));

  if (typeof document.querySelectorAll === 'function') {
    for (const stub of document.querySelectorAll('.debug-stub')) {
      const owner =
        stub.getAttribute('data-foe-stub-for') ||
        (stub as HTMLElement).dataset?.foeStubFor ||
        '';
      const ownerEl = owner ? document.getElementById(owner) : null;
      if (!keep.has(owner) || !isPanelVisible(ownerEl)) {
        const parent = stub.parentNode as Node | null;
        if (parent?.removeChild) parent.removeChild(stub);
      }
    }
  }

  for (const [id, el] of targets) upsertDebugStub(el, id);
}

function scheduleDebugStubSync(): void {
  if (debugStubSyncQueued) return;
  debugStubSyncQueued = true;
  const run = (): void => {
    debugStubSyncQueued = false;
    syncDebugStubs();
  };
  if (typeof queueMicrotask === 'function') queueMicrotask(run);
  else if (typeof setTimeout === 'function') setTimeout(run, 0);
  else run();
}

/** Watch panel mount/render mutations so stubs always reflect live content. */
function ensureDebugStubObserver(): void {
  if (debugStubObserver || typeof MutationObserver === 'undefined') return;
  if (typeof document === 'undefined') return;
  const root = document.body || document.documentElement;
  if (!root) return;
  debugStubObserver = new MutationObserver((mutations) => {
    const relevant = mutations.some((m) => {
      if ((m.target as Element)?.closest?.('.debug-stub')) return false;
      const nodes = [
        ...Array.from(m.addedNodes),
        ...Array.from(m.removedNodes),
      ] as Element[];
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
export function getAllowedPanelsForView(view: string): Set<string> | null {
  const list = (CONTEXT_ALLOWED_PANELS as Record<string, readonly string[]>)[
    view
  ];
  if (!list) return null;
  const allowed = new Set<string>();
  for (const id of list) {
    let cursor: string | null = id;
    while (cursor && !allowed.has(cursor)) {
      allowed.add(cursor);
      cursor = PANEL_PARENT[cursor] || null;
    }
  }
  return allowed;
}

/** Hide every non-permitted panel and reveal permitted panels obeying options. */
function applyContextVisibility(
  opts: ShowOptionsState,
  activeView: string,
): boolean {
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

export function applyCardVisibility(
  optionsOverride: ShowOptionsState | null = null,
  debugOverride: boolean | null = null,
  viewOverride: ViewState | string | null = null,
): void {
  if (typeof document === 'undefined') return;
  const opts: ShowOptionsState = optionsOverride || showOptionsState || {};
  const isDebug =
    debugOverride !== null && debugOverride !== undefined ?
      Boolean(debugOverride)
    : isDebugEnabledGlobal();

  let activeView: ViewFilter = currentView;
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
function applyUnconstrainedVisibility(opts: ShowOptionsState): void {
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
