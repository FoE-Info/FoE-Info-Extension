/**
 * treasuryPanel.js
 *
 * Unified Guild Treasury panel controller:
 * - Table row generation for goods, medals, and special resources
 * - Treasury reserves card renderer and event bindings
 * - Treasury logs card renderer and player totals
 * - Reactive store subscription (bindTreasuryPanel)
 */

const { createLogger } = require('../utils/logger.js');
const { treasuryState } = require('../state/GuildDomainState.js');

let logger = null;
try {
  logger = createLogger('TreasuryPanel');
} catch {}

let defaultElement = null;
let defaultCollapse = null;
let defaultCopy = null;
let defaultHelper = null;
let defaultShowOptions = null;
let defaultToolOptions = null;
let defaultSetTreasurySize = null;
let defaultResourceDefs = null;
let defaultTranslateContainer = null;
let defaultPanelResize = null;

try {
  defaultElement = require('../fn/AddElement.js');
} catch {}
try {
  defaultCollapse = require('../fn/collapse.js');
} catch {}
try {
  defaultCopy = require('../fn/copy.js');
} catch {}
try {
  defaultHelper = require('../fn/helper.js');
} catch {}
try {
  defaultShowOptions = require('../vars/showOptions.js');
} catch {}
try {
  defaultToolOptions = require('../fn/globals.js').toolOptions;
} catch {}
try {
  ({ setTreasurySize: defaultSetTreasurySize } = require('./panelResize.js'));
} catch {}
try {
  ({
    ResourceDefs: defaultResourceDefs,
  } = require('../msg/ResourceService.js'));
} catch {}
try {
  defaultPanelResize = require('./panelResize.js');
} catch {}
try {
  defaultTranslateContainer = require('../fn/i18n.js').translateContainer;
} catch {}

// ============================================================================
// 1. TABLE BUILDER & RESOURCE TALLIES
// ============================================================================

function getResourceAmount(res, id) {
  if (!res) return 0;
  const val = res instanceof Map ? res.get(id) : res[id];
  if (val == null) return 0;
  if (typeof val.toNumber === 'function') return val.toNumber();
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
}

function buildTreasuryTableHtml({ resources, rssDefs = [], helper = {} }) {
  if (!resources) return '';

  logger?.debug('Building treasury table rows', {
    hasResources: !!resources,
    rssDefsCount: rssDefs.length,
  });

  let tableRows = '';
  const numAges = helper.numAges ?? 0;
  const matchedIds = new Set(['medals']);

  for (let i = 0; i < numAges; i++) {
    let eraTreasuryText = '';
    let currentEraName = '';
    rssDefs.forEach((rssDef) => {
      const amount = getResourceAmount(resources, rssDef.id);
      if (
        typeof helper.fLevelfromAge === 'function' &&
        helper.fLevelfromAge(rssDef.era) == numAges - i &&
        amount > 0
      ) {
        matchedIds.add(rssDef.id);
        if (typeof helper.fGVGagesname === 'function') {
          currentEraName = helper.fGVGagesname(rssDef.era);
        }
        if (!currentEraName) {
          currentEraName = rssDef.era;
        }
        const displayName = rssDef.name || rssDef.id;
        const safeName =
          typeof helper.escapeHTML === 'function' ?
            helper.escapeHTML(displayName)
          : displayName;
        eraTreasuryText += `<tr><td class="text-start">${safeName}</td><td class="text-end">${amount.toLocaleString()}</td></tr>`;
      }
    });
    if (eraTreasuryText) {
      tableRows += `<tr><td colspan="2" class="goods-era-header">${currentEraName}</td></tr>${eraTreasuryText}`;
    }
  }

  const medals = getResourceAmount(resources, 'medals');
  if (medals > 0) {
    tableRows += `<tr><td class="text-start">Medals</td><td class="text-end">${medals.toLocaleString()}</td></tr>`;
  }

  let otherTreasuryText = '';
  const allEntries =
    resources instanceof Map ?
      Array.from(resources.entries())
    : Object.entries(resources);
  for (const [resId] of allEntries) {
    if (!matchedIds.has(resId)) {
      const amount = getResourceAmount(resources, resId);
      if (amount > 0) {
        const displayName =
          (typeof helper.fResourceShortName === 'function' ?
            helper.fResourceShortName(resId)
          : null) || resId;
        const safeName =
          typeof helper.escapeHTML === 'function' ?
            helper.escapeHTML(displayName)
          : displayName;
        otherTreasuryText += `<tr><td class="text-start">${safeName}</td><td class="text-end">${amount.toLocaleString()}</td></tr>`;
      }
    }
  }
  if (otherTreasuryText) {
    tableRows += `<tr><td colspan="2" class="goods-era-header">Other</td></tr>${otherTreasuryText}`;
  }

  return tableRows;
}

// ============================================================================
// 2. TREASURY RESERVES PANEL
// ============================================================================

function clearElement(el, resetClass = false) {
  if (!el) return;
  if (typeof el.replaceChildren === 'function') {
    el.replaceChildren();
  }
  el.innerHTML = '';
  if (resetClass) {
    el.className = '';
  }
}

function clearForTreasury(containers = {}) {
  clearElement(containers.cityinvested);
  clearElement(containers.output);
  clearElement(containers.overview);
  clearElement(containers.alerts);
  clearElement(containers.donationDIV);
  clearElement(containers.incidents);
  clearElement(containers.donation2DIV);
  clearElement(containers.donationDIV2);
  clearElement(containers.greatbuilding);
  clearElement(containers.gbInfoDIV);
  clearElement(containers.guild);
  clearElement(containers.debug);
  clearElement(containers.info);
  clearElement(containers.visitstats, true);
  clearElement(containers.cultural, true);
  clearElement(containers.friendsDiv);
}

function resolveTreasuryDeps(deps = {}) {
  return {
    elem: deps.element || defaultElement || {},
    col: deps.collapse || defaultCollapse || {},
    toolOpts: deps.toolOptions || defaultToolOptions || {},
    help: deps.helper || defaultHelper || {},
    rssDefs: deps.ResourceDefs || defaultResourceDefs || [],
    cpy: deps.copy || defaultCopy || {},
    setTreasuryHeight:
      deps.setTreasurySize || defaultSetTreasurySize || (() => {}),
    translate:
      deps.translateContainer || defaultTranslateContainer || (() => {}),
  };
}

function bindTreasuryEvents({
  treasuryContainer,
  doc,
  cpy,
  col,
  treasuryHeight,
  setTreasuryHeight,
  bindResizableCollapse,
  ResizeObs,
}) {
  if (!treasuryContainer && !doc) return;

  const copyBtn =
    (typeof treasuryContainer?.querySelector === 'function' ?
      treasuryContainer.querySelector('#treasuryCopyID')
    : null) ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasuryCopyID')
    : null);
  const copyHandler = cpy?.TreasuryCopy || cpy?.fTreasuryCopy;
  if (copyBtn && typeof copyHandler === 'function') {
    copyBtn.addEventListener('click', copyHandler);
  }

  const labelBtn =
    (typeof treasuryContainer?.querySelector === 'function' ?
      treasuryContainer.querySelector('#treasuryTextLabel')
    : null) ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasuryTextLabel')
    : null);
  if (labelBtn && typeof col?.fCollapseTreasury === 'function') {
    labelBtn.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#treasuryicon')
      ) {
        return;
      }
      col.fCollapseTreasury();
    });
  }

  const iconBtn =
    (typeof treasuryContainer?.querySelector === 'function' ?
      treasuryContainer.querySelector('#treasuryicon')
    : null) ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasuryicon')
    : null);
  if (
    iconBtn &&
    iconBtn !== labelBtn &&
    typeof col?.fCollapseTreasury === 'function'
  ) {
    iconBtn.addEventListener('click', () => {
      col.fCollapseTreasury();
    });
  }

  if (typeof bindResizableCollapse === 'function') {
    const collapseTarget =
      (typeof treasuryContainer?.querySelector === 'function' ?
        treasuryContainer.querySelector('#treasuryText')
      : null) ||
      (doc && typeof doc.getElementById === 'function' ?
        doc.getElementById('treasuryText')
      : null);
    if (collapseTarget) {
      bindResizableCollapse({
        collapseTarget,
        setHeightFn: (h) => {
          setTreasuryHeight(h);
        },
        minHeight: 80,
      });
    }
  } else if (typeof ResizeObs === 'function') {
    const collapseTarget =
      (typeof treasuryContainer?.querySelector === 'function' ?
        treasuryContainer.querySelector('#treasuryText')
      : null) ||
      (doc && typeof doc.getElementById === 'function' ?
        doc.getElementById('treasuryText')
      : null);
    if (collapseTarget) {
      let treasuryResizeObserver = null;
      try {
        treasuryResizeObserver = new ResizeObs((entries) => {
          for (const entry of entries) {
            const height = Math.round(entry.contentRect.height);
            if (height >= 80) {
              setTreasuryHeight(height);
            }
          }
        });
        treasuryResizeObserver.observe(collapseTarget);
      } catch {}
    }
  }
}

function renderTreasuryPanel(resources, deps = {}) {
  if (!resources) return;
  const containers = deps.containers || deps;
  if (containers && typeof containers === 'object') {
    clearForTreasury(containers);
  }

  const showOpts = deps.showOptions || defaultShowOptions;
  if (showOpts && showOpts.showTreasury === false) return;

  const doc =
    deps.document || (typeof document !== 'undefined' ? document : null);
  const treasuryContainer =
    deps.treasury ||
    containers.treasury ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasury')
    : null);
  if (!treasuryContainer) return;

  logger?.debug('Rendering treasury panel', {
    hasContainer: Boolean(treasuryContainer),
    isMap: resources instanceof Map,
  });

  if (treasuryContainer.classList?.contains('d-none')) {
    treasuryContainer.classList.remove('d-none');
  }
  if (treasuryContainer.style) {
    treasuryContainer.style.display = '';
  }

  const {
    elem,
    col,
    toolOpts,
    help,
    rssDefs,
    cpy,
    setTreasuryHeight,
    translate,
  } = resolveTreasuryDeps(deps);

  const closeHtml =
    typeof elem.close === 'function' ?
      elem.close()
    : '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
  const isCollapsed = Boolean(col.collapseTreasury);
  const iconHtml =
    typeof elem.icon === 'function' ?
      elem.icon('treasuryicon', 'treasuryText', isCollapsed)
    : '';
  const copyHtml =
    typeof elem.copy === 'function' ?
      elem.copy('treasuryCopyID', 'success', 'right', isCollapsed)
    : '';
  const rawTreasuryHeight = toolOpts.treasurySize;
  const treasuryHeight =
    typeof rawTreasuryHeight === 'number' && rawTreasuryHeight >= 80 ?
      rawTreasuryHeight
    : 200;

  let treasuryHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="status" aria-live="polite">
	${closeHtml}<p id="treasuryTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#treasuryText" aria-expanded="${!isCollapsed}" aria-controls="treasuryText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">`;
  treasuryHTML += iconHtml;
  treasuryHTML += `<strong><span data-i18n="treasury">Guild Treasury:</span></strong></p>`;
  treasuryHTML += copyHtml;
  treasuryHTML += `<div id="treasuryText" style="height: ${treasuryHeight}px" class="overflow-y resize collapse ${
    isCollapsed ? '' : 'show'
  }"><table id="treasurytable" class="goods-table w-100"><caption class="visually-hidden"><span data-i18n="treasury">Guild Treasury</span></caption><thead><tr><th scope="col" class="text-start"><span data-i18n="type">Type</span></th><th scope="col" class="text-end"><span data-i18n="amount">Amount</span></th></tr></thead><tbody>`;

  if (typeof deps.initTreasury === 'function') {
    deps.initTreasury(resources);
  }

  const tableRows = buildTreasuryTableHtml({
    resources,
    rssDefs,
    helper: help,
  });
  treasuryHTML += tableRows;
  treasuryContainer.innerHTML = treasuryHTML + `</tbody></table></div></div>`;

  const ResizeObs =
    deps.ResizeObserver ||
    (typeof ResizeObserver !== 'undefined' ? ResizeObserver : null);

  bindTreasuryEvents({
    treasuryContainer,
    doc,
    cpy,
    col,
    treasuryHeight,
    setTreasuryHeight,
    bindResizableCollapse:
      deps.bindResizableCollapse || defaultPanelResize?.bindResizableCollapse,
    ResizeObs,
  });

  if (doc && doc.body) {
    translate(doc.body);
  } else {
    translate(treasuryContainer);
  }
}

// ============================================================================
// 3. TREASURY LOGS PANEL
// ============================================================================

function renderTreasuryLogPanel(logs, totals = {}, context = {}) {
  const {
    totalGoodsDonated,
    totalMedalsDonated,
    totalMedalsSpent,
    totalLogCount,
  } = totals;
  const { showTreasury = true, targetEl = null } = context;

  const element = context.element || defaultElement;
  const collapse = context.collapse || defaultCollapse;
  const helper = context.helper || defaultHelper;

  if (typeof document === 'undefined') return;
  const target = targetEl || document.getElementById('treasuryLog');
  if (!target) return;

  const list = Array.isArray(logs) ? logs : [];

  if (showTreasury === false) {
    target.innerHTML = '';
    target.style.display = 'none';
    return;
  }
  target.style.display = '';

  const isCollapsed =
    collapse?.collapseTreasuryLog !== undefined ?
      !!collapse.collapseTreasuryLog
    : true;
  let html = `<div class="alert alert-info alert-dismissible show collapsed" role="status" aria-live="polite">`;
  if (element?.close) html += element.close();
  if (element?.copy)
    html += element.copy('treasuryLogCopyID', 'info', 'right', isCollapsed);
  html += `<p id="treasuryLogTextLabel" href="#treasuryLogText" data-bs-toggle="collapse" role="button">`;
  if (element?.icon)
    html += element.icon('treasuryLogicon', 'treasuryLogText', isCollapsed);
  html += `<strong><span data-i18n="treasury_logs">Treasury Logs</span>:</strong>`;
  html += ` <span class="ms-1 small">(${list.length}/${totalLogCount ?? list.length} <span data-i18n="entries">Entries</span>)</span></p>`;
  html += `<div id="treasuryLogText" class="overflow-y resize collapse ${isCollapsed ? '' : 'show'}">`;
  html += `<div class="mb-2 small px-2">`;
  html += `<span data-i18n="goods_donated">Goods Donated</span>: <strong>${totalGoodsDonated?.toNumber ? totalGoodsDonated.toNumber().toLocaleString() : (totalGoodsDonated || 0).toLocaleString()}</strong> | `;
  html += `<span data-i18n="medals_donated">Medals Donated</span>: <strong>${totalMedalsDonated?.toNumber ? totalMedalsDonated.toNumber().toLocaleString() : (totalMedalsDonated || 0).toLocaleString()}</strong> | `;
  html += `<span data-i18n="medals_spent">Medals Spent</span>: <strong>${totalMedalsSpent?.toNumber ? totalMedalsSpent.toNumber().toLocaleString() : (totalMedalsSpent || 0).toLocaleString()}</strong>`;
  html += `</div>`;
  html += `<table class="table table-sm table-striped align-middle mb-0"><caption class="visually-hidden"><span data-i18n="treasury">Guild Treasury</span></caption><thead><tr>`;
  html += `<th scope="col" class="text-start"><span data-i18n="player">Player</span></th>`;
  html += `<th scope="col" class="text-start"><span data-i18n="action">Action</span></th>`;
  html += `<th scope="col" class="text-start"><span data-i18n="resource">Resource</span></th>`;
  html += `<th scope="col" class="text-end"><span data-i18n="amount">Amount</span></th>`;
  html += `</tr></thead><tbody>`;

  for (const entry of list.slice(0, 50)) {
    const pName =
      helper?.escapeHTML ?
        helper.escapeHTML(entry.playerName || 'Unknown')
      : entry.playerName || 'Unknown';
    const rName =
      helper?.escapeHTML ?
        helper.escapeHTML(entry.resource || '')
      : entry.resource;
    const act =
      helper?.escapeHTML ? helper.escapeHTML(entry.action || '') : entry.action;
    const isDonation =
      typeof entry.isDonation === 'function' ? entry.isDonation() : true;
    const amountClass = isDonation ? 'text-success' : 'text-danger';
    const amountSign = isDonation ? '+' : '-';
    const amountStr =
      entry.amount?.toNumber ?
        entry.amount.toNumber().toLocaleString()
      : Number(entry.amount || 0).toLocaleString();

    html += `<tr>`;
    html += `<td class="text-start">${pName}</td>`;
    html += `<td class="text-start small text-muted">${act}</td>`;
    html += `<td class="text-start">${rName}</td>`;
    html += `<td class="text-end ${amountClass}">${amountSign}${amountStr}</td>`;
    html += `</tr>`;
  }

  html += `</tbody></table></div></div>`;
  target.innerHTML = html;

  if (collapse?.fCollapseTreasuryLog) {
    const labelEl = document.getElementById('treasuryLogTextLabel');
    if (labelEl)
      labelEl.addEventListener('click', collapse.fCollapseTreasuryLog);
  }
  if (helper?.translateContainer) {
    helper.translateContainer(target);
  }

  logger?.debug('treasury log rendered', {
    displayedCount: Math.min(list.length, 50),
    totalLogCount,
  });
}

// ============================================================================
// 4. REACTIVE STORE BINDING
// ============================================================================

function bindTreasuryPanel(
  state = treasuryState,
  {
    renderReserves = renderTreasuryPanel,
    renderLogs = renderTreasuryLogPanel,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel === 'reserves' || channel === 'all') {
      const reserves = snapshot.getReserves();
      if (reserves) renderReserves(reserves);
    }
    if (channel === 'logs' || channel === 'all') {
      renderLogs(snapshot.getLogs(), snapshot.getTotals(), {
        showTreasury: snapshot.getShowTreasury(),
      });
    }
  });
}

const defaultExport = {
  renderTreasuryPanel,
  renderTreasuryLogPanel,
  bindTreasuryEvents,
  clearForTreasury,
  getResourceAmount,
  buildTreasuryTableHtml,
  bindTreasuryPanel,
};

module.exports = {
  bindTreasuryPanel,
  renderTreasuryPanel,
  renderTreasuryLogPanel,
  clearForTreasury,
  bindTreasuryEvents,
  getResourceAmount,
  buildTreasuryTableHtml,
  default: defaultExport,
};
