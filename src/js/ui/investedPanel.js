/**
 * investedPanel.js
 *
 * Unified Great Building investments summary panel (#invested) controller:
 * - Investment calculations & net profit/loss summary
 * - Storage settings & hidden investments persistence
 * - Interactive copy and collapse event attachments
 * - Reactive InvestedState subscription (bindInvestedPanel)
 */

const { calculateInvestments } = require('../calc/InvestedCalculator.js');
let element = {};
try {
  element = require('./AddElement.js');
} catch {}
let collapse = {};
try {
  collapse = require('../fn/collapse.js');
} catch {}
let copy = {};
try {
  copy = require('../fn/copy.js');
} catch {}
let helper = {};
try {
  helper = require('../fn/helper.js');
} catch {}
let storage = {};
try {
  storage = require('../fn/storage.js');
} catch {}
let showOptions = {};
try {
  showOptions = require('../state/showOptions.js').showOptions || {};
} catch {}
let state = {};
try {
  state = require('../state/state.js');
} catch {}
const { investedState } = require('../state/GreatBuildingDomainState.js');

const cityinvested = state.cityinvested;

let cachedContributions = [];
let cachedArcBonus = 90;

function getStoredHiddenKeys() {
  const sync = storage.getSync ? storage.getSync('hiddenInvestments') : null;
  if (Array.isArray(sync)) return new Set(sync);
  try {
    const raw =
      typeof localStorage !== 'undefined' ?
        localStorage.getItem('hiddenInvestments')
      : null;
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function getStoredInvestSettings() {
  const sync = storage.getSync ? storage.getSync('investSettings') : null;
  if (sync && typeof sync === 'object') {
    return {
      showHiddenGb: Boolean(sync.showHiddenGb),
      calculateOnlySafeProfit: Boolean(sync.calculateOnlySafeProfit),
    };
  }
  try {
    const raw =
      typeof localStorage !== 'undefined' ?
        localStorage.getItem('investSettings')
      : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        showHiddenGb: Boolean(parsed.showHiddenGb),
        calculateOnlySafeProfit: Boolean(parsed.calculateOnlySafeProfit),
      };
    }
  } catch {}
  return { showHiddenGb: false, calculateOnlySafeProfit: false };
}

/**
 * Main rendering orchestrator for Great Building contributions.
 *
 * @param {Array<Object>} [rawContributions] Optional new contributions payload to cache
 * @param {number} [arcBonusPercent] Optional Arc bonus percentage
 */
function renderInvestedPanel(rawContributions, arcBonusPercent) {
  if (typeof document === 'undefined') return;

  if (rawContributions !== undefined) {
    cachedContributions =
      Array.isArray(rawContributions) ? rawContributions : (
        rawContributions?.responseData || []
      );
  }
  if (arcBonusPercent !== undefined && typeof arcBonusPercent === 'number') {
    cachedArcBonus = arcBonusPercent;
  }

  const targetEl =
    document.getElementById('invested') ||
    document.getElementById('cityinvested') ||
    cityinvested;
  if (!targetEl) return;

  if (!showOptions.showInvested || cachedContributions.length === 0) {
    targetEl.innerHTML = '';
    return;
  }

  const hiddenKeys = getStoredHiddenKeys();
  const settings = getStoredInvestSettings();
  const data = calculateInvestments(
    cachedContributions,
    cachedArcBonus,
    hiddenKeys,
    settings,
  );

  const isCollapsed = Boolean(collapse?.collapseInvested);
  const availableFP = Number(state?.availablePacksFP) || 0;
  const netProfit = data.netProfitLossBN;
  const profitClass =
    netProfit.isGreaterThanOrEqualTo(0) ? 'text-success' : 'text-danger';
  const profitSign = netProfit.isGreaterThanOrEqualTo(0) ? '+' : '';

  let html = `<div class="alert alert-success alert-dismissible show" role="status" aria-live="polite">`;
  html += element?.close ? element.close() : '';
  html +=
    element?.copy ?
      element.copy('investedCopyID', 'success', 'right', isCollapsed)
    : '';
  html += `<p id="investedTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#investedText" aria-expanded="${!isCollapsed}" aria-controls="investedText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">`;
  html +=
    element?.icon ?
      element.icon('investedicon', 'investedText', isCollapsed)
    : '';
  html += `<strong><span data-i18n="fp_status">FP Status</span>:</strong> `;
  html += `<span id="onHandFP" class="ms-2">${isCollapsed ? `<span data-i18n="available">Available FP</span>: ${availableFP.toLocaleString()} FP` : ''}</span></p>`;
  html += `<div id="investedText" class="collapse ${isCollapsed ? '' : 'show'}">`;

  // Summary statistics (Original FP Status)
  html += `<div id="investedSummaryStats">`;
  html += `<span data-i18n="available">Available FP</span>: <strong id="availableFPID">${availableFP.toLocaleString()} FP</strong><br>`;
  html += `<span data-i18n="fp_invested">FP Invested</span>: <strong id="onHandFP2">${data.totalInvested} FP</strong> (${data.results.length} <span data-i18n="gb">GB</span>)<br>`;
  html += `<span data-i18n="gb">GB</span> <span data-i18n="reward">Rewards</span>: <strong>${data.totalReturn} FP</strong> (+${data.arcBonusPercent}%)<br>`;
  html += `<span data-i18n="total">Total</span> <span data-i18n="profit">Profit</span>/<span data-i18n="loss">Loss</span>: <strong class="${profitClass}">${profitSign}${data.netProfitLoss} FP</strong>`;
  html += `</div>`;
  html += `</div></div>`;

  targetEl.innerHTML = html;

  // Bind event listeners
  const copyBtn = document.getElementById('investedCopyID');
  copyBtn?.addEventListener('click', copy?.fInvestedCopy);

  const labelEl = document.getElementById('investedTextLabel');
  labelEl?.addEventListener('click', (e) => {
    if (
      e?.target &&
      typeof e.target.closest === 'function' &&
      e.target.closest('#investedicon')
    ) {
      return;
    }
    collapse?.fCollapseInvested?.();
  });
  const iconEl = document.getElementById('investedicon');
  if (iconEl && iconEl !== labelEl) {
    iconEl.addEventListener('click', () => {
      collapse?.fCollapseInvested?.();
    });
  }

  helper?.translateContainer?.(targetEl);
}

function bindInvestedPanel(
  state = investedState,
  { renderInvested = renderInvestedPanel } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'contributions' && channel !== 'all') return;
    const payload = snapshot.getContributions();
    if (!payload || typeof renderInvested !== 'function') return;
    renderInvested(payload.list, payload.arcBonusPercent);
  });
}

module.exports = {
  renderInvestedPanel,
  bindInvestedPanel,
  getStoredHiddenKeys,
  getStoredInvestSettings,
};
module.exports.default = renderInvestedPanel;
module.exports.renderInvestedPanel = renderInvestedPanel;
