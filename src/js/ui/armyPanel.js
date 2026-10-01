/**
 * armyPanel.js
 *
 * Unified Army panel controller:
 * - renderArmyPanel (DOM markup, rogue counts, unit categorization, collapse state)
 * - bindArmyPanel (reactive ArmyState subscription & render routing)
 */

const { createLogger } = require('../utils/logger.js');
const { armyState } = require('../state/ArmyState.js');
const { escapeHTML } = require('../utils/escape.js');
const { fEraAbbreviation } = require('../calc/eraMapping.js');
const { copyPlainText } = require('../utils/copy.js');
const { formatArmyCopy } = require('./armyCopy.js');

const logger = createLogger('ArmyPanel');

const safeRequire = (loader) => {
  try {
    return loader();
  } catch {
    return null;
  }
};

const element = safeRequire(() => require('./AddElement.js'));
const collapse = safeRequire(() => require('../fn/collapse.mjs'));
const helper = safeRequire(() => require('../fn/helper.mjs'));
const panelResize = safeRequire(() => require('./panelResize.js'));

let armyResizeBinding = null;
let armyResizeObserver = null;
let armyResizeTarget = null;
let armyResizeHandler = null;

function disconnectArmyResize() {
  if (armyResizeBinding && typeof armyResizeBinding.disconnect === 'function') {
    armyResizeBinding.disconnect();
    armyResizeBinding = null;
  }
  if (
    armyResizeObserver &&
    typeof armyResizeObserver.disconnect === 'function'
  ) {
    armyResizeObserver.disconnect();
    armyResizeObserver = null;
  }
}

function renderArmyPanel(params = {}) {
  const {
    rogues = 0,
    allUnits = 0,
    diff = 0,
    unitsPerEra = [],
    armySize = 185,
    showArmy = true,
    fallbackDiv = null,
    getAgeLevel = null,
    onResize = null,
    bindResizableCollapse: bindFnOverride = null,
    ResizeObserverClass = null,
  } = params;

  if (typeof document === 'undefined') return null;
  if (!(showArmy && (rogues || allUnits))) return null;

  const targetDiv = document.getElementById('army') || fallbackDiv;
  if (!targetDiv) return null;

  const isCollapsed = collapse?.collapseArmy ?? false;
  const closeBtn =
    element && typeof element.close === 'function' ?
      element.close()
    : '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
  const iconHtml =
    element && typeof element.icon === 'function' ?
      element.icon('armyicon', 'armyText', isCollapsed)
    : '';

  let armyHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">`;
  armyHTML += closeBtn;
  armyHTML += `<button type="button" id="armyCopyID" class="badge rounded-pill bg-success right-button" style="display: ${isCollapsed ? 'none' : 'block'}" data-i18n="copy">Copy</button>`;
  armyHTML += `<p id="armyTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#armyText" aria-expanded="${!isCollapsed}" aria-controls="armyText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">`;
  armyHTML += `<span class="army-heading">${iconHtml}<strong><span data-i18n="army_title">Army</span>:</strong></span> <span id="armyUnits">${
    isCollapsed ?
      `<span class="army-total"><span data-i18n="army_units">Units</span>: ${allUnits.toLocaleString()}</span> <span class="army-total"><span data-i18n="rogues">Rogues</span>: ${rogues.toLocaleString()}</span>`
    : ''
  }</span></p>`;
  armyHTML += `<div id="armyText" style="height: ${armySize}px" class="overflow-y resize collapse ${
    isCollapsed ? '' : 'show'
  }"><div class="overflow-y">`;
  const diffHtml =
    diff !== 0 ?
      ` <span class="${diff > 0 ? 'green' : 'red'}">${diff > 0 ? '+' : ''}${diff}</span>`
    : '';
  armyHTML += `<div class="mb-2"><strong data-i18n="total">Total</strong><br><span id="armyUnits3"><span data-i18n="army_units">Units</span>: ${allUnits.toLocaleString()}</span><br><span id="armyUnits2"><span data-i18n="rogues">Rogues</span>: ${rogues.toLocaleString()}</span>${diffHtml}</div>`;

  const resolveAgeLevel = getAgeLevel || helper?.fLevelfromAge || (() => 0);
  const sortedUnits = [...unitsPerEra].sort(
    (a, b) => resolveAgeLevel(b.era) - resolveAgeLevel(a.era),
  );
  armyHTML += `<table class="goods-table w-100"><thead><tr><th scope="col" class="text-start"><span data-i18n="type">Type</span></th><th scope="col" class="text-end"><span data-i18n="amount">Amount</span></th></tr></thead><tbody>`;
  let previousEra = null;
  for (const item of sortedUnits) {
    if (item.era !== previousEra) {
      armyHTML += `<tr class="goods-era-header"><th colspan="2" scope="rowgroup">${escapeHTML(fEraAbbreviation(item.era))}</th></tr>`;
      previousEra = item.era;
    }
    if (item.name == null || item.amount == null) {
      armyHTML += `<tr><td colspan="2">${item.text || ''}</td></tr>`;
      continue;
    }
    const change = Number(item.change) || 0;
    const changeHtml =
      change ?
        ` <span class="${change > 0 ? 'green' : 'red'}">${change > 0 ? '+' : ''}${change.toLocaleString()}</span>`
      : '';
    armyHTML += `<tr><td class="text-start">${escapeHTML(item.name)}</td><td class="text-end">${Number(item.amount).toLocaleString()}${changeHtml}</td></tr>`;
  }
  targetDiv.innerHTML = armyHTML + `</tbody></table></div></div></div>`;

  document.getElementById('armyCopyID')?.addEventListener('click', () => {
    const body = document.getElementById('armyText');
    if (body) copyPlainText(formatArmyCopy(body));
  });

  const labelEl = document.getElementById('armyTextLabel');
  if (labelEl && collapse && typeof collapse.fCollapseArmy === 'function') {
    labelEl.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#armyicon')
      ) {
        return;
      }
      collapse.fCollapseArmy();
    });
  }
  const iconEl = document.getElementById('armyicon');
  if (
    iconEl &&
    iconEl !== labelEl &&
    collapse &&
    typeof collapse.fCollapseArmy === 'function'
  ) {
    iconEl.addEventListener('click', () => {
      collapse.fCollapseArmy();
    });
  }

  const armyDiv = document.getElementById('armyText');
  if (armyDiv) {
    disconnectArmyResize();
    const bindFn =
      bindFnOverride ||
      (panelResize && typeof panelResize.bindResizableCollapse === 'function' ?
        panelResize.bindResizableCollapse
      : null);
    if (bindFn) {
      armyResizeBinding = bindFn({
        element: armyDiv,
        initialSize: armySize,
        minSize: 50,
        onResize,
        ResizeObserverClass,
      });
    } else if (ResizeObserverClass || typeof ResizeObserver !== 'undefined') {
      const ObserverClass = ResizeObserverClass || ResizeObserver;
      armyResizeTarget = armyDiv;
      armyResizeHandler = onResize;
      if (!armyResizeObserver) {
        armyResizeObserver = new ObserverClass((entries) => {
          for (const entry of entries) {
            const target = entry.target || armyResizeTarget;
            if (
              target?.classList?.contains('collapsing') ||
              (target?.classList && !target.classList.contains('show'))
            ) {
              continue;
            }
            const height = entry.contentRect?.height;
            if (height && height >= 50 && armyResizeHandler) {
              armyResizeHandler(height);
            }
          }
        });
      }
      if (typeof armyResizeObserver.disconnect === 'function') {
        armyResizeObserver.disconnect();
      }
      armyResizeObserver.observe(armyDiv);
    }
  }

  if (armyDiv && helper && typeof helper.translateContainer === 'function') {
    helper.translateContainer(targetDiv);
  }

  logger.debug('army panel rendered', {
    rogues,
    allUnits,
    unitsPerEra: unitsPerEra.length,
    armySize,
  });
  return targetDiv;
}

function bindArmyPanel(
  state = armyState,
  { renderArmy = renderArmyPanel } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  const unsubscribe = state.subscribe((snapshot, channel) => {
    if (channel !== 'army' && channel !== 'all') return;
    const payload = snapshot.getArmyPanel();
    if (payload) renderArmy(payload);
  });
  return () => {
    disconnectArmyResize();
    unsubscribe();
  };
}

module.exports = {
  renderArmyPanel,
  bindArmyPanel,
  disconnectArmyResize,
};
module.exports.default = renderArmyPanel;
