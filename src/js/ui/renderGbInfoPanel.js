/**
 * renderGbInfoPanel.js
 *
 * Renders the dedicated "Show Current Level" / "GB Info" panel (#gbInfo) in panel.html.
 * Displays Great Building name, current/max level, current/total FP progress, remaining FP,
 * and next production transition time if available.
 */

let element = {};
let collapse = {};
let helper = {};

try {
  element = require('../fn/AddElement.js');
} catch {}
try {
  collapse = require('../fn/collapse.js');
} catch {}
try {
  helper = require('../fn/helper.js');
} catch {}
let dateUtils = {};
try {
  dateUtils = require('../utils/date.js');
} catch {}

function safeEscape(val) {
  if (typeof helper.escapeHTML === 'function') {
    return helper.escapeHTML(val);
  }
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderGbInfoPanel(
  targetEl,
  gbData = {},
  playerName = '',
  showOptions = {},
) {
  if (!targetEl) return;

  const isEnabled = showOptions.showGBInfo !== false;
  if (
    !isEnabled ||
    !gbData ||
    (!gbData.name && !gbData.level && !gbData.id && !gbData.cityentity_id)
  ) {
    targetEl.innerHTML = '';
    return;
  }

  if (targetEl.style && targetEl.style.display === 'none') {
    targetEl.style.display = '';
  }

  const isCollapsed = !!collapse.collapseGBInfo;
  const level = gbData.level || 0;
  const maxLevel = gbData.max_level || level + 1;
  const currentFp = gbData.current || 0;
  const totalFp = gbData.total || 0;
  const remainingFp = totalFp - currentFp;

  const readyAt =
    gbData.readyAt ??
    gbData.next_state_transition_at ??
    gbData.state?.next_state_transition_at;

  const gbName = safeEscape(gbData.name || 'Great Building');

  const closeBtnHtml =
    typeof element.close === 'function' ?
      element.close()
    : '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';

  const iconHtml =
    typeof element.icon === 'function' ?
      element.icon('gbinfoicon', 'gbInfoCollapse', isCollapsed)
    : `<span id="gbinfoicon" class="header-icon collapse-toggle fw-bold font-monospace align-middle" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="${!isCollapsed}" aria-controls="gbInfoCollapse" data-bs-target="#gbInfoCollapse" data-bs-toggle="collapse">${isCollapsed ? '[+]' : '[-]'}</span>`;

  let html = `<div class="alert alert-dark alert-dismissible show" role="alert">`;
  html += closeBtnHtml;
  html += `<p id="gbInfoTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#gbInfoCollapse" aria-expanded="${!isCollapsed}" aria-controls="gbInfoCollapse" class="pe-4 mb-0 cursor-pointer user-select-none" style="cursor: pointer; user-select: none;">`;
  html += iconHtml;
  html += ` <strong><span data-i18n="gb">GB</span> <span data-i18n="info">Info</span>:</strong></p>`;

  html += `<div id="gbInfoCollapse" class="collapse ${isCollapsed ? '' : 'show'}">`;
  if (playerName) {
    html += `<div>Owner: ${safeEscape(playerName)}</div>`;
  }
  html += `<div>Building: ${gbName}</div>`;
  html += `<div>Level: ${level} / ${maxLevel}</div>`;
  html += `<div>Invested: ${currentFp} of ${totalFp} FP</div>`;
  html += `<div>Total Remaining: ${remainingFp} FP</div>`;

  if (typeof readyAt === 'number' && readyAt > 0 && !Number.isNaN(readyAt)) {
    const formattedReady =
      typeof dateUtils.formatDateTime === 'function' ?
        dateUtils.formatDateTime(readyAt)
      : new Date(readyAt * 1000).toLocaleString();
    if (formattedReady) {
      html += `<div>Ready: ${formattedReady}</div>`;
    }
  }

  html += `</div></div>`;

  targetEl.innerHTML = html;

  const labelEl = targetEl.querySelector('#gbInfoTextLabel');
  if (labelEl) {
    labelEl.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#gbinfoicon')
      ) {
        return;
      }
      if (typeof collapse.fCollapseGBInfo === 'function') {
        collapse.fCollapseGBInfo();
      }
    });
  }
  const iconEl = targetEl.querySelector('#gbinfoicon');
  if (iconEl && iconEl !== labelEl) {
    iconEl.addEventListener('click', () => {
      if (typeof collapse.fCollapseGBInfo === 'function') {
        collapse.fCollapseGBInfo();
      }
    });
  }

  if (typeof helper.translateContainer === 'function') {
    helper.translateContainer(targetEl);
  }
}

module.exports = {
  renderGbInfoPanel,
};
module.exports.default = renderGbInfoPanel;
module.exports.renderGbInfoPanel = renderGbInfoPanel;
