/**
 * renderTreasuryPanel.js
 *
 * Renders the Guild Treasury card and delegates table building and event binding.
 * Decoupled from src/js/ui/panelDispatcher.js.
 * Dual CJS/ESM exports.
 */

const { buildTreasuryTableHtml } = require('./treasuryTableBuilder.js');

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
let logger = null;

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
  const showOptModule = require('../vars/showOptions.js');
  defaultShowOptions =
    showOptModule.showOptions || showOptModule.default || showOptModule;
} catch {}
try {
  const globalsModule = require('../fn/globals.js');
  defaultToolOptions = globalsModule.toolOptions;
  defaultSetTreasurySize = globalsModule.setTreasurySize;
} catch {}
try {
  const stateModule = require('../state/state.js');
  defaultResourceDefs = stateModule.ResourceDefs;
} catch {}
try {
  const i18nModule = require('../fn/i18n.js');
  defaultTranslateContainer = i18nModule.translateContainer;
} catch {}
try {
  defaultPanelResize = require('./panelResize.js');
} catch {}
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('RenderTreasuryPanel');
} catch {}

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
  if (!treasuryContainer) return;

  logger?.debug('Binding treasury panel events', {
    hasContainer: !!treasuryContainer,
    hasDoc: !!doc,
    hasCopy: !!cpy?.TreasuryCopy,
    hasCollapse: !!col?.fCollapseTreasury,
  });

  const copyBtn =
    (typeof treasuryContainer.querySelector === 'function' ?
      treasuryContainer.querySelector('#treasuryCopyID')
    : null) ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasuryCopyID')
    : null);
  if (copyBtn && typeof cpy?.TreasuryCopy === 'function') {
    copyBtn.addEventListener('click', cpy.TreasuryCopy);
  }

  const labelBtn =
    (typeof treasuryContainer.querySelector === 'function' ?
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
    (typeof treasuryContainer.querySelector === 'function' ?
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

  const treasuryDiv =
    (typeof treasuryContainer.querySelector === 'function' ?
      treasuryContainer.querySelector('#treasuryText')
    : null) ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasuryText')
    : null);
  if (treasuryDiv) {
    const bindResize =
      bindResizableCollapse || defaultPanelResize?.bindResizableCollapse;
    if (typeof bindResize === 'function') {
      try {
        bindResize({
          element: treasuryDiv,
          initialHeight: treasuryHeight,
          onHeightChange: (h) => {
            if (typeof setTreasuryHeight === 'function') {
              setTreasuryHeight(h);
            }
          },
          ResizeObserverClass: ResizeObs,
        });
      } catch (err) {
        logger?.warn('Failed to bind resizable collapse on treasuryText', err);
      }
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

module.exports = {
  renderTreasuryPanel,
  bindTreasuryEvents,
  clearForTreasury,
  default: {
    renderTreasuryPanel,
    bindTreasuryEvents,
    clearForTreasury,
  },
};
