/** Cultural Settlement (#cultural) renderer, extracted from OutpostService.js. */
const { createLogger } = require('../utils/logger.js');

const logger = createLogger('CulturalPanel');

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
      const showOptMod = require('../state/showOptions.js');
      return showOptMod.showOptions || showOptMod;
    } catch {
      try {
        const showOptMod = require('../vars/showOptions.js');
        return showOptMod.showOptions || showOptMod;
      } catch {}
    }
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
    const escName =
      helper?.escapeHTML ? helper.escapeHTML(settlementName) : settlementName;
    html += ` <span class="badge bg-primary ms-1">${escName}</span>`;
  }
  if (totalAdv > 0) {
    html += ` <span class="badge bg-info text-dark ms-1">${unlockedAdv}/${totalAdv} (${pct}%)</span>`;
  }
  html += `</p>`;
  html += `<div id="culturalText" class="overflow-y resize collapse ${isCollapsed ? '' : 'show'}">`;

  if (totalAdv > 0) {
    html += `<div class="progress mb-2 mx-2" style="height: 16px;">`;
    html += `<div class="progress-bar bg-success" role="progressbar" style="width: ${pct}%;" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">${pct}%</div>`;
    html += `</div>`;
  }

  const costKeys = Object.keys(remainingCosts);
  if (costKeys.length > 0) {
    html += `<div class="px-2 small mb-1 fw-bold"><span data-i18n="remaining_cultural_goods">Remaining Goods Required</span>:</div>`;
    html += `<table class="table table-sm table-striped align-middle mb-0"><caption class="visually-hidden"><span data-i18n="cultural">Cultural Settlement</span></caption><thead><tr>`;
    html += `<th scope="col" class="text-start"><span data-i18n="resource">Resource</span></th>`;
    html += `<th scope="col" class="text-end"><span data-i18n="required">Required</span></th>`;
    html += `</tr></thead><tbody>`;

    for (const res of costKeys) {
      const amount = remainingCosts[res];
      const resLabel = helper?.escapeHTML ? helper.escapeHTML(res) : res;
      html += `<tr><td class="text-start">${resLabel}</td><td class="text-end">${amount.toLocaleString()}</td></tr>`;
    }
    html += `</tbody></table>`;
  }

  html += `</div></div>`;
  targetEl.innerHTML = html;

  if (collapse?.fCollapseCultural) {
    const culturalToggle =
      document.getElementById('culturalicon') ||
      document.getElementById('culturalTextLabel');
    culturalToggle?.addEventListener('click', collapse.fCollapseCultural);
  }
  if (helper?.translateContainer) {
    helper.translateContainer(targetEl);
  }

  logger.debug('cultural panel rendered', {
    settlement: activeSettlement?.name || null,
    advancements: totalAdv,
    costKeys: costKeys.length,
  });
}

module.exports = { renderCulturalPanel, setShowOptions };
module.exports.default = renderCulturalPanel;
