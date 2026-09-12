/** Army (#army) panel renderer, extracted from ArmyUnitManagementService.js. */
const { createLogger } = require('../utils/logger.js');

const logger = createLogger('ArmyPanel');

const safeRequire = (loader) => {
  try {
    return loader();
  } catch {
    return null;
  }
};

const element = safeRequire(() => require('../fn/AddElement.js'));
const collapse = safeRequire(() => require('../fn/collapse.js'));
const helper = safeRequire(() => require('../fn/helper.js'));
const panelResize = safeRequire(() => require('./panelResize.js'));

// Single long-lived fallback observer reused across renders. The primary path
// binds through panelResize.bindResizableCollapse; this observer only exists
// when that binder is unavailable, and is disconnected before re-observing to
// avoid retaining detached panel nodes.
let armyResizeObserver = null;
let armyResizeTarget = null;
let armyResizeHandler = null;

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
  armyHTML += `<p id="armyTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#armyText" aria-expanded="${!isCollapsed}" aria-controls="armyText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">`;
  armyHTML += iconHtml;
  armyHTML += `<strong>Army:</strong> <span id="armyUnits" class="ms-2">${
    isCollapsed ?
      `Rogues: ${rogues.toLocaleString()} Units: ${allUnits.toLocaleString()}`
    : ''
  }</span></p>`;
  armyHTML += `<div id="armyText" style="height: ${armySize}px" class="overflow-y resize collapse ${
    isCollapsed ? '' : 'show'
  }"><p class="">`;
  const diffHtml =
    diff !== 0 ?
      ` <span class="${diff > 0 ? 'green' : 'red'}">${diff > 0 ? '+' : ''}${diff}</span>`
    : '';
  armyHTML += `<span id="armyUnits2">Rogues: ${rogues.toLocaleString()}</span>${diffHtml}<br><span id="armyUnits3">Units: ${allUnits.toLocaleString()}</span><br>`;

  const resolveAgeLevel = getAgeLevel || helper?.fLevelfromAge || (() => 0);
  const armyText = unitsPerEra
    .sort((a, b) => resolveAgeLevel(b.era) - resolveAgeLevel(a.era))
    .map((item) => item.text)
    .join('<br>');

  targetDiv.innerHTML = armyHTML + armyText + `</p></div></div>`;

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
    const bindFn =
      bindFnOverride ||
      (panelResize && typeof panelResize.bindResizableCollapse === 'function' ?
        panelResize.bindResizableCollapse
      : null);
    if (bindFn) {
      bindFn({
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
    helper.translateContainer(armyDiv);
  }

  logger.debug('army panel rendered', {
    rogues,
    allUnits,
    unitsPerEra: unitsPerEra.length,
    armySize,
  });
  return targetDiv;
}

module.exports = { renderArmyPanel };
module.exports.default = renderArmyPanel;
