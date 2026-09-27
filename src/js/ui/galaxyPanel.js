/**
 * galaxyPanel.js
 *
 * Unified Blue Galaxy panel controller:
 * - Candidate building grouping & list markup formatting
 * - Collapsible card rendering & context gating
 * - Reactive store subscription (bindGalaxyRender)
 */

const {
  getTopReadyGalaxyBuildings,
} = require('../calc/BlueGalaxyCalculator.js');
const {
  blueGalaxyState: defaultBlueGalaxyState,
} = require('../state/CityDomainState.js');
const element = require('./AddElement.js');
const { backfillPendingNames } = require('../fn/liveNameResolver.js');
const { formatTime } = require('../utils/date.js');
const { escapeHTML } = require('../utils/escape.js');

// ============================================================================
// 1. BUILDING GROUPER & LIST MARKUP
// ============================================================================

/**
 * Groups buildings by name, FP amount, ready status, and debug timer.
 *
 * @param {Array<Object>} buildings - Array of candidate building objects.
 * @param {boolean} [isDebug=false] - Whether debug mode is active.
 * @returns {Array<Object>} Array of grouped building descriptors.
 */
function groupGalaxyBuildings(buildings, isDebug = false) {
  if (!Array.isArray(buildings) || buildings.length === 0) return [];

  const groups = [];
  for (const item of buildings) {
    const timerStr =
      isDebug ?
        item.transition && item.transition <= 2000000000 ?
          formatTime(item.transition)
        : 'READY'
      : '';
    const isReady = Boolean(item.isReady);
    const key = `${item.name}|${item.fp}|${isReady}|${timerStr}`;

    const existing = groups.find((g) => g.key === key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.push({
        key,
        count: 1,
        name: item.name,
        fp: item.fp,
        isReady,
        timerStr,
      });
    }
  }
  return groups;
}

/**
 * Renders HTML markup for the grouped Galaxy buildings.
 *
 * @param {Array<Object>} groupedBuildings - Grouped buildings from groupGalaxyBuildings.
 * @param {boolean} [isDebug=false] - Whether debug mode is active.
 * @param {Function|null} [t=null] - Translation lookup, injected by the caller.
 * @returns {string} HTML markup string.
 */
function renderGalaxyBuildingList(groupedBuildings, isDebug = false, t = null) {
  if (!Array.isArray(groupedBuildings) || groupedBuildings.length === 0) {
    return `<p class="text-muted mb-0">${t?.('no_ready_buildings') ?? 'No ready buildings with FP production'}</p>`;
  }

  let buildingsHtml = '<p class="mb-0">';
  for (const group of groupedBuildings) {
    if (isDebug) {
      buildingsHtml += `${group.count}x ${group.fp}FP ${escapeHTML(group.name)} [${group.isReady ? 'READY' : group.timerStr}]<br>`;
    } else {
      buildingsHtml += `${group.count}x ${group.fp}FP ${escapeHTML(group.name)}<br>`;
    }
  }
  buildingsHtml += '</p>';
  return buildingsHtml;
}

// ============================================================================
// 2. PANEL RENDERING & CONTEXT GATING
// ============================================================================

/** Galaxy is context-gated: hidden in GBG/GE/QI/SETTLEMENT/OTHER_PLAYER. */
function contextAllowsGalaxy() {
  try {
    const vis = require('./cardVisibility.js');
    const allowed = vis.getAllowedPanelsForView?.(vis.getCurrentView?.());
    return allowed ? allowed.has('galaxy') : true;
  } catch {
    return true;
  }
}

/**
 * Binds click listeners for collapsing/expanding the Galaxy panel.
 */
function bindGalaxyCollapseEvents({ el, onToggleCollapse }) {
  if (!el || typeof onToggleCollapse !== 'function') {
    return;
  }

  const labelEl =
    typeof document !== 'undefined' ?
      document.getElementById('galaxyTextLabel')
    : el.querySelector?.('#galaxyTextLabel');

  if (labelEl) {
    labelEl.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#galaxyicon')
      ) {
        return;
      }
      onToggleCollapse();
    });
  }

  const iconEl =
    typeof document !== 'undefined' ?
      document.getElementById('galaxyicon')
    : el.querySelector?.('#galaxyicon');

  if (iconEl && iconEl !== labelEl) {
    iconEl.addEventListener('click', () => {
      onToggleCollapse();
    });
  }
}

function renderGalaxyPanel({
  container = null,
  candidates = [],
  charges = 0,
  currentEpoch = Math.floor(Date.now() / 1000),
  isDebug = false,
  isCollapsed = false,
  onToggleCollapse = null,
  t = null,
  showOptions = null,
} = {}) {
  if (!contextAllowsGalaxy()) {
    const el =
      container ||
      (typeof document !== 'undefined' ?
        document.getElementById('galaxy')
      : null);
    if (el) {
      el.style.display = 'none';
      el.innerHTML = '';
    }
    return;
  }

  const el =
    container ||
    (typeof document !== 'undefined' ?
      document.getElementById('galaxy')
    : null);

  if (!el) {
    return;
  }

  if (showOptions && showOptions.showGalaxy === false) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  const validCharges = Math.max(0, charges || 0);

  if (validCharges === 0 && !isDebug) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  const translate =
    typeof t === 'function' ? t : (key, fallback) => fallback || key;
  const titleText = translate(
    'galaxy_double_collection',
    'Galaxy Double Collection:',
  );
  const triesText = translate('tries_remaining', 'Tries Remaining:');

  const topBuildings = getTopReadyGalaxyBuildings(
    candidates,
    validCharges,
    currentEpoch,
    isDebug,
  );
  const groupedBuildings = groupGalaxyBuildings(topBuildings, isDebug);
  const buildingsHtml = renderGalaxyBuildingList(groupedBuildings, isDebug, t);

  const collapseClass = isCollapsed ? '' : 'show';
  const collapseIcon = isCollapsed ? '[+]' : '[-]';

  el.innerHTML = `
    <div class="alert alert-success alert-dismissible show collapsed mb-2" role="status" aria-live="polite">${element.close()}
      <p id="galaxyTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#galaxyText" aria-expanded="${!isCollapsed}" aria-controls="galaxyText" class="cursor-pointer user-select-none mb-1" style="cursor: pointer; user-select: none;">
        <span class="header-icon collapse-toggle fw-bold font-monospace" id="galaxyicon" role="button" tabindex="-1" aria-hidden="true" aria-label="Toggle section" aria-expanded="${!isCollapsed}" aria-controls="galaxyText" data-bs-target="#galaxyText" data-bs-toggle="collapse">${collapseIcon}</span>
        <strong><span data-i18n="galaxy_double_collection">${titleText}</span></strong>
      </p>
      <div id="galaxyText" class="resize collapse ${collapseClass}" style="max-height: 20em; overflow-y: auto;">
        <div class="foe-panel-body">
          <p class="mb-1"><span data-i18n="tries_remaining">${triesText}</span> <span id="galaxyID">${validCharges}</span></p>
          ${buildingsHtml}
        </div>
      </div>
    </div>
  `.trim();

  el.style.display = 'block';
  backfillPendingNames(el);
  bindGalaxyCollapseEvents({ el, onToggleCollapse });
}

function showGalaxy({
  blueGalaxyState = null,
  epocTime = null,
  isDebug = null,
  collapse = null,
  showOptions = null,
  t = null,
} = {}) {
  const activeState = blueGalaxyState || defaultBlueGalaxyState;
  const galaxyEl =
    typeof document !== 'undefined' ? document.getElementById('galaxy') : null;

  let currentEpoch = epocTime;
  if (currentEpoch == null) {
    let globalEpoch = 0;
    try {
      globalEpoch = require('../vars/state.js').EpocTime;
    } catch {}
    currentEpoch =
      globalEpoch && globalEpoch > 1000000000 ?
        globalEpoch
      : Math.floor(Date.now() / 1000);
  }

  let debugFlag = isDebug;
  if (debugFlag == null) {
    try {
      debugFlag = require('../vars/state.js').debugEnabled;
    } catch {
      debugFlag = false;
    }
  }

  let isCollapsed = false;
  let onToggleCollapse = null;
  if (collapse) {
    isCollapsed = collapse.collapseGalaxy;
    onToggleCollapse = collapse.fCollapseGalaxy;
  } else {
    try {
      const c = require('../fn/collapse.js');
      isCollapsed = c.collapseGalaxy;
      onToggleCollapse = c.fCollapseGalaxy;
    } catch {}
  }

  let opts = showOptions;
  if (opts == null) {
    try {
      opts = require('../vars/showOptions.js').showOptions;
    } catch {}
  }

  let tFn = t;
  if (tFn == null) {
    try {
      tFn = require('../fn/i18n.js').t;
    } catch {}
  }

  if (activeState && Array.isArray(activeState.candidates)) {
    backfillPendingNames(activeState.candidates);
  }

  renderGalaxyPanel({
    container: galaxyEl,
    candidates: activeState ? activeState.candidates : [],
    charges: activeState ? activeState.charges : 0,
    currentEpoch,
    isDebug: Boolean(debugFlag),
    isCollapsed: Boolean(isCollapsed),
    onToggleCollapse,
    t: tFn,
    showOptions: opts,
  });
}

function updateGalaxy(reward) {
  if (reward && typeof reward === 'object' && defaultBlueGalaxyState) {
    defaultBlueGalaxyState.updateEntity(reward);
  }
}

// ============================================================================
// 3. REACTIVE STORE BINDING
// ============================================================================

function bindGalaxyRender(
  state = defaultBlueGalaxyState,
  { render = showGalaxy } = {},
) {
  if (!state || typeof state.setRenderCallback !== 'function') {
    return () => {};
  }
  state.setRenderCallback(() => render());
  return () => state.setRenderCallback(null);
}

if (
  defaultBlueGalaxyState &&
  typeof defaultBlueGalaxyState.setRenderCallback === 'function' &&
  !defaultBlueGalaxyState.renderCallback
) {
  defaultBlueGalaxyState.setRenderCallback(() => showGalaxy());
}

module.exports = {
  bindGalaxyCollapseEvents,
  bindGalaxyRender,
  contextAllowsGalaxy,
  groupGalaxyBuildings,
  renderGalaxyBuildingList,
  renderGalaxyPanel,
  showGalaxy,
  updateGalaxy,
};
module.exports.default = module.exports;
