/**
 * outpostPanel.js
 *
 * Unified Cultural Settlement (Outpost) panel controller:
 * - DOM card rendering, advancement progress badges, and remaining costs table
 * - Reactive OutpostState subscription (bindOutpostPanel)
 */

const { createLogger } = require('../utils/logger.js');
const { outpostState } = require('../state/CityDomainState.js');

const logger = createLogger('OutpostPanel');

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

let showOptions = null;

function getResolvedShowOptions() {
  if (showOptions) return showOptions;
  if (typeof __webpack_require__ !== 'undefined') {
    try {
      const showOptModule = require('../vars/showOptions.js');
      return showOptModule.showOptions || showOptModule;
    } catch {}
  }
  return null;
}

function setShowOptions(opts) {
  showOptions = opts;
}

function renderCulturalPanel(
  activeSettlement,
  advancements = [],
  remainingCosts = {},
  context = {},
) {
  if (typeof document === 'undefined') return;
  const targetEl = context.targetEl || document.getElementById('cultural');
  if (!targetEl) return;

  const currentOpts = getResolvedShowOptions();
  if (
    currentOpts &&
    (currentOpts.showSettlement === false || currentOpts.showCultural === false)
  ) {
    targetEl.innerHTML = '';
    targetEl.style.display = 'none';
    return;
  }

  const totalAdv = advancements.length;
  if (!activeSettlement && totalAdv === 0) {
    targetEl.innerHTML = '';
    targetEl.style.display = 'none';
    return;
  }

  targetEl.style.display = '';

  const isCollapsed =
    collapse?.collapseCultural !== undefined ?
      !!collapse.collapseCultural
    : true;
  const settlementName =
    activeSettlement?.name ||
    activeSettlement?.contentName ||
    'Cultural Settlement';
  const unlockedAdv = advancements.filter((a) => a.isUnlocked).length;
  const pct = totalAdv > 0 ? Math.round((unlockedAdv / totalAdv) * 100) : 0;

  let html = `<div class="alert alert-secondary alert-dismissible show collapsed" role="status" aria-live="polite">`;
  if (element?.close) html += element.close();
  html += `<p id="culturalTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#culturalText" aria-expanded="${!isCollapsed}" aria-controls="culturalText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">`;
  if (element?.icon)
    html += element.icon('culturalicon', 'culturalText', isCollapsed);
  html += `<strong><span data-i18n="cultural">Cultural Settlement</span>:</strong>`;
  if (activeSettlement) {
    html += ` <span class="ms-1">${settlementName}</span>`;
  }
  if (totalAdv > 0) {
    html += ` <span class="badge bg-info text-dark ms-1">${unlockedAdv}/${totalAdv} (${pct}%)</span>`;
  }
  html += `</p>`;
  html += `<div id="culturalText" class="overflow-y resize collapse ${isCollapsed ? '' : 'show'}">`;

  if (totalAdv > 0) {
    html += `<div class="mb-2 small px-2">`;
    html += `Advancements: <strong>${unlockedAdv} of ${totalAdv} unlocked</strong>`;
    html += `</div>`;
  }

  const costKeys = Object.keys(remainingCosts);
  if (costKeys.length > 0) {
    html += `<table class="table table-sm table-striped align-middle mb-0"><caption class="visually-hidden"><span>Remaining Costs</span></caption><thead><tr>`;
    html += `<th scope="col" class="text-start">Resource</th>`;
    html += `<th scope="col" class="text-end">Needed</th>`;
    html += `</tr></thead><tbody>`;
    for (const key of costKeys) {
      const goodName = key;
      const count = remainingCosts[key] || 0;
      html += `<tr><td class="text-start">${goodName}</td><td class="text-end font-monospace">${count}</td></tr>`;
    }
    html += `</tbody></table>`;
  }

  html += `</div></div>`;
  targetEl.innerHTML = html;

  if (collapse?.fCollapseCultural) {
    const labelEl = document.getElementById('culturalTextLabel');
    if (labelEl) labelEl.addEventListener('click', collapse.fCollapseCultural);
    const iconEl = document.getElementById('culturalicon');
    if (iconEl && iconEl !== labelEl) {
      iconEl.addEventListener('click', collapse.fCollapseCultural);
    }
  }
  if (helper?.translateContainer) {
    helper.translateContainer(targetEl);
  }

  logger.debug('cultural panel rendered', {
    settlement: settlementName,
    advancementsCount: totalAdv,
    costCount: costKeys.length,
  });
}

function bindOutpostPanel(
  state = outpostState,
  { renderCultural = renderCulturalPanel } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'cultural' && channel !== 'all') return;
    const payload = snapshot.getCulturalPanel();
    if (!payload) return;
    renderCultural(
      payload.activeSettlement,
      payload.advancements,
      payload.remainingCosts,
    );
  });
}

module.exports = {
  renderCulturalPanel,
  setShowOptions,
  bindOutpostPanel,
  default: renderCulturalPanel,
};
