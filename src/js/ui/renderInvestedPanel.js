/**
 * renderInvestedPanel.js
 *
 * Renders the Great Building investments summary panel (#invested) in panel.html.
 * Provides interactive visibility toggles to hide/unhide stale Great Buildings,
 * settings drawer with switches for "Show hidden GBs" and "Calculate only safe profit/loss",
 * and real-time calculation updates.
 */

import { calculateInvestments } from '../calc/InvestedCalculator.js';
import * as element from '../fn/AddElement.js';
import * as collapse from '../fn/collapse.js';
import * as copy from '../fn/copy.js';
import * as helper from '../fn/helper.js';
import * as storage from '../fn/storage.js';
import { showOptions } from '../vars/showOptions.js';
import { cityinvested } from '../vars/state.js';
import * as state from '../vars/state.js';

let cachedContributions = [];
let cachedArcBonus = 90;
let settingsDrawerOpen = false;

function getStoredHiddenKeys() {
  const sync = storage.getSync('hiddenInvestments');
  if (Array.isArray(sync)) return new Set(sync);
  try {
    const raw =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('foe_hidden_investments');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveHiddenKeys(keySubSet) {
  const arr = Array.from(keySubSet);
  storage.set('hiddenInvestments', arr);
  try {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem('foe_hidden_investments', JSON.stringify(arr));
  } catch {}
}

function getStoredInvestSettings() {
  const sync = storage.getSync('investSettings');
  if (sync && typeof sync === 'object') {
    return {
      showHiddenGb: !!sync.showHiddenGb,
      calculateOnlySafeProfit: !!sync.calculateOnlySafeProfit,
    };
  }
  try {
    const raw =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('foe_invest_settings');
    if (raw) {
      const p = JSON.parse(raw);
      return {
        showHiddenGb: !!p.showHiddenGb,
        calculateOnlySafeProfit: !!p.calculateOnlySafeProfit,
      };
    }
  } catch {}
  return { showHiddenGb: false, calculateOnlySafeProfit: false };
}

function saveInvestSettings(settings) {
  storage.set('investSettings', settings);
  try {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem('foe_invest_settings', JSON.stringify(settings));
  } catch {}
}

/**
 * Main rendering orchestrator for Great Building contributions.
 *
 * @param {Array<Object>} [rawContributions] Optional new contributions payload to cache
 * @param {number} [arcBonusPercent] Optional Arc bonus percentage
 */
export function renderInvestedPanel(rawContributions, arcBonusPercent) {
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

  const isCollapsed = !!collapse.collapseInvested;
  const availableFP = Number(state?.availablePacksFP) || 0;
  const netProfit = data.netProfitLossBN;
  const profitClass =
    netProfit.isGreaterThanOrEqualTo(0) ? 'text-success' : 'text-danger';
  const profitSign = netProfit.isGreaterThanOrEqualTo(0) ? '+' : '';

  let html = `<div class="alert alert-success alert-dismissible show" role="status" aria-live="polite">`;
  html += element.close();
  html += element.copy('investedCopyID', 'success', 'right', isCollapsed);
  /* Future feature: Settings button in header
  html += `<span id="investedSettingsBtn" role="button" tabindex="0" class="badge rounded-pill bg-secondary float-end right-button me-1" title="Settings" aria-label="Settings" style="display: ${isCollapsed ? 'none' : 'block'};"><span class="header-icon material-icons-outlined md-12 align-middle">settings</span></span>`;
  */
  html += `<p id="investedTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#investedText" aria-expanded="${!isCollapsed}" aria-controls="investedText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">`;
  html += element.icon('investedicon', 'investedText', isCollapsed);
  html += `<strong><span data-i18n="fp_status">FP Status</span>:</strong> `;
  html += `<span id="onHandFP" class="ms-2">${isCollapsed ? `<span data-i18n="available">Available FP</span>: ${availableFP.toLocaleString()} FP` : ''}</span></p>`;
  html += `<div id="investedText" class="collapse ${isCollapsed ? '' : 'show'}">`;

  /* Future feature: Settings drawer
  html += `<div id="investedSettingsBar" class="p-2 mb-2 bg-dark bg-opacity-25 rounded border border-secondary border-opacity-25" style="display: ${settingsDrawerOpen ? 'block' : 'none'};">`;
  html += `<div class="d-flex flex-wrap gap-3 small align-items-center">`;
  html += `<div class="form-check form-switch mb-0"><input class="form-check-input" type="checkbox" id="investShowHidden" ${settings.showHiddenGb ? 'checked' : ''}><label class="form-check-label ms-1" for="investShowHidden" data-i18n="show_hidden_gb">Show hidden GBs</label></div>`;
  html += `<div class="form-check form-switch mb-0"><input class="form-check-input" type="checkbox" id="investSafeOnly" ${settings.calculateOnlySafeProfit ? 'checked' : ''}><label class="form-check-label ms-1" for="investSafeOnly" data-i18n="calculate_safe_profit">Calculate only safe profit/loss</label></div>`;
  html += `</div></div>`;
  */

  // Summary statistics (Original FP Status)
  html += `<div id="investedSummaryStats">`;
  html += `<span data-i18n="available">Available FP</span>: <strong id="availableFPID">${availableFP.toLocaleString()} FP</strong><br>`;
  html += `<span data-i18n="fp_invested">FP Invested</span>: <strong id="onHandFP2">${data.totalInvested} FP</strong> (${data.results.length} <span data-i18n="gb">GB</span>)<br>`;
  html += `<span data-i18n="gb">GB</span> <span data-i18n="reward">Rewards</span>: <strong>${data.totalReturn} FP</strong> (+${data.arcBonusPercent}%)<br>`;
  html += `<span data-i18n="total">Total</span> <span data-i18n="profit">Profit</span>/<span data-i18n="loss">Loss</span>: <strong class="${profitClass}">${profitSign}${data.netProfitLoss} FP</strong>`;
  html += `</div>`;

  /* Future feature: Detailed investments table
  html += `<div class="table-responsive"><table class="table table-sm table-striped align-middle mb-0">`;
  html += `<thead><tr><th class="text-center" style="width: 28px;"></th><th><span data-i18n="player">Player</span></th><th><span data-i18n="gb">GB</span></th><th><span data-i18n="rank">Rank</span></th><th><span data-i18n="progress">Progress</span></th><th><span data-i18n="invested">Invested</span></th><th><span data-i18n="reward">Reward</span></th><th>+/-</th></tr></thead><tbody>`;
  for (const item of data.results) {
    const itemDiff = item.profit;
    const itemSign = itemDiff.isGreaterThanOrEqualTo(0) ? '+' : '';
    const itemClass = item.is_hidden ? 'text-muted' : item.is_safe ? (itemDiff.isGreaterThanOrEqualTo(0) ? 'text-success' : 'text-danger') : (itemDiff.isGreaterThanOrEqualTo(0) ? 'text-warning' : 'text-danger');
    const gbName = helper.escapeHTML(item.name || helper.fGBname(item.city_entity_id) || item.city_entity_id || '-');
    const playerName = helper.escapeHTML(item.player.name);
    const rankDisplay = item.rank !== null && item.rank !== undefined ? `P${item.rank}` : '-';
    const eyeIcon = item.is_hidden ? 'visibility_off' : 'visibility';
    const eyeTitle = item.is_hidden ? 'Unhide GB' : 'Hide GB';
    const eyeClass = item.is_hidden ? 'text-muted' : 'text-primary';
    const progressDisplay = item.max_progress ? `<small>${item.current_progress || 0}/${item.max_progress}</small> ` + (item.is_safe ? `<span class="material-icons-outlined text-success md-12 align-middle" title="Locked/Safe spot">lock</span>` : `<span class="material-icons-outlined text-warning md-12 align-middle" title="Unsafe spot (${item.remaining_fp} remaining)">lock_open</span>`) : '-';
    const rowDimmed = item.is_hidden ? ' opacity-50 fst-italic' : '';
    html += `<tr class="${rowDimmed}">`;
    html += `<td class="text-center"><span class="invest-eye-btn material-icons-outlined md-14 ${eyeClass}" role="button" tabindex="0" data-key="${item.key}" title="${eyeTitle}">${eyeIcon}</span></td>`;
    html += `<td>${playerName}</td><td>${gbName} ${item.level ? `<small class="text-muted">(${item.level})</small>` : ''}</td><td>${rankDisplay}</td><td>${progressDisplay}</td><td>${item.invested.toString()}</td><td>${item.returnFP.toString()}</td><td class="${itemClass}">${itemSign}${itemDiff.toString()}${!item.is_safe && !item.is_hidden ? '*' : ''}</td></tr>`;
  }
  html += `</tbody></table></div>`;
  */

  html += `</div></div>`;

  targetEl.innerHTML = html;

  // Bind event listeners
  const copyBtn = document.getElementById('investedCopyID');
  copyBtn?.addEventListener('click', copy.fInvestedCopy);

  const labelEl = document.getElementById('investedTextLabel');
  labelEl?.addEventListener('click', (e) => {
    if (
      e?.target &&
      typeof e.target.closest === 'function' &&
      e.target.closest('#investedicon')
    ) {
      return;
    }
    collapse.fCollapseInvested();
  });
  const iconEl = document.getElementById('investedicon');
  if (iconEl && iconEl !== labelEl) {
    iconEl.addEventListener('click', () => {
      collapse.fCollapseInvested();
    });
  }

  /* Future feature listeners
  const settingsBtn = document.getElementById('investedSettingsBtn');
  settingsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsDrawerOpen = !settingsDrawerOpen;
    const bar = document.getElementById('investedSettingsBar');
    if (bar) bar.style.display = settingsDrawerOpen ? 'block' : 'none';
  });

  const showHiddenCb = document.getElementById('investShowHidden');
  showHiddenCb?.addEventListener('change', (e) => {
    const current = getStoredInvestSettings();
    current.showHiddenGb = e.target.checked;
    saveInvestSettings(current);
    renderInvestedPanel();
  });

  const safeOnlyCb = document.getElementById('investSafeOnly');
  safeOnlyCb?.addEventListener('change', (e) => {
    const current = getStoredInvestSettings();
    current.calculateOnlySafeProfit = e.target.checked;
    saveInvestSettings(current);
    renderInvestedPanel();
  });

  targetEl.querySelectorAll('.invest-eye-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.getAttribute('data-key');
      if (!key) return;
      const keys = getStoredHiddenKeys();
      if (keys.has(key)) keys.delete(key); else keys.add(key);
      saveHiddenKeys(keys);
      renderInvestedPanel();
    });
  });
  */

  helper.translateContainer(targetEl);
}

export default renderInvestedPanel;
