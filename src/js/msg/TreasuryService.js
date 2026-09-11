/**
 * TreasuryService.js
 *
 * Decoupled domain service for Forge of Empires Guild Treasury.
 * Handles ClanService.getTreasuryLogs and ResourceService.getTreasuryBag RPC payloads,
 * tracking guild treasury reserves, member donations, and expenditures with BigNumber precision.
 */

const BigNumber = require('bignumber.js');
const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

let element = null;
let collapse = null;
let copy = null;
let helper = null;
let showOptions = { showTreasury: true };

if (typeof __webpack_require__ !== 'undefined') {
  try {
    element = require('../fn/AddElement');
  } catch {}
  try {
    collapse = require('../fn/collapse.js');
  } catch {}
  try {
    copy = require('../fn/copy.js');
  } catch {}
  try {
    helper = require('../fn/helper.js');
  } catch {}
  try {
    const showOptMod = require('../vars/showOptions.js');
    if (showOptMod?.showOptions) showOptions = showOptMod.showOptions;
  } catch {}
}

class TreasuryLogEntry {
  constructor(raw = {}) {
    this.action = raw.action || '';
    this.resource = raw.resource || '';
    this.amount = new BigNumber(raw.amount || 0);
    this.playerId = raw.player?.id || 0;
    this.playerName = raw.player?.name || '';
    this.date = raw.date || raw.time || 0;
    this.raw = raw;
  }

  isDonation() {
    const act = this.action.toLowerCase();
    return act.includes('donation') || act.includes('building production');
  }

  isExpenditure() {
    const act = this.action.toLowerCase();
    return (
      act.includes('spent') ||
      act.includes('unlocked') ||
      act.includes('deployment') ||
      act.includes('place building')
    );
  }
}

class TreasuryService {
  constructor() {
    this.reserves = new Map();
    this.logs = [];
    this.totalMedalsDonated = new BigNumber(0);
    this.totalMedalsSpent = new BigNumber(0);
    this.totalGoodsDonated = new BigNumber(0);
    this.playerDonations = new Map();
    this.lastUpdated = null;

    this.getTreasuryLogs = this.getTreasuryLogs.bind(this);
    this.getTreasuryBag = this.getTreasuryBag.bind(this);
  }

  register(dispatcher = messageDispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register(
        'ClanService',
        'getTreasuryLogs',
        this.getTreasuryLogs,
      );
      dispatcher.register(
        'ResourceService',
        'getTreasuryBag',
        this.getTreasuryBag,
      );
    }
    return this;
  }

  getTreasuryBag(msg) {
    const rawList =
      Array.isArray(msg?.responseData) ? msg.responseData
      : msg?.responseData ? [msg.responseData]
      : [];

    for (const item of rawList) {
      if (!item) continue;
      const bagType =
        typeof item.type === 'object' ? item.type?.value : item.type;
      if (
        !bagType ||
        bagType === 'ClanMain' ||
        String(bagType).toLowerCase().includes('clan') ||
        String(bagType).toLowerCase().includes('treasury')
      ) {
        const resources = item.resources?.resources || item.resources || {};
        for (const [key, val] of Object.entries(resources)) {
          this.reserves.set(key, new BigNumber(val || 0));
        }
      }
    }
    this.lastUpdated = Date.now();
    renderTreasuryPanel(this.reserves);

    return {
      success: true,
      totalReserves: this.reserves.size,
      reserves: this.reserves,
    };
  }

  getTreasuryLogs(msg) {
    const rawLogs =
      Array.isArray(msg?.responseData?.logs) ? msg.responseData.logs
      : Array.isArray(msg?.responseData) ? msg.responseData
      : [];

    this.logs = rawLogs.map((l) => new TreasuryLogEntry(l));
    this.totalMedalsDonated = new BigNumber(0);
    this.totalMedalsSpent = new BigNumber(0);
    this.totalGoodsDonated = new BigNumber(0);
    this.playerDonations.clear();

    for (const entry of this.logs) {
      const isMedals = entry.resource === 'medals';
      const pName = entry.playerName || 'Unknown';

      if (!this.playerDonations.has(pName)) {
        this.playerDonations.set(pName, {
          medalsDonated: new BigNumber(0),
          medalsSpent: new BigNumber(0),
          goodsDonated: new BigNumber(0),
          goodsSpent: new BigNumber(0),
        });
      }
      const playerStat = this.playerDonations.get(pName);

      if (isMedals) {
        if (entry.isDonation()) {
          this.totalMedalsDonated = this.totalMedalsDonated.plus(entry.amount);
          playerStat.medalsDonated = playerStat.medalsDonated.plus(
            entry.amount,
          );
        } else {
          this.totalMedalsSpent = this.totalMedalsSpent.plus(entry.amount);
          playerStat.medalsSpent = playerStat.medalsSpent.plus(entry.amount);
        }
      } else {
        if (entry.isDonation()) {
          this.totalGoodsDonated = this.totalGoodsDonated.plus(entry.amount);
          playerStat.goodsDonated = playerStat.goodsDonated.plus(entry.amount);
        } else {
          playerStat.goodsSpent = playerStat.goodsSpent.plus(entry.amount);
        }
      }
    }
    this.lastUpdated = Date.now();
    renderTreasuryLogPanel(
      this.logs,
      this.totalGoodsDonated,
      this.totalMedalsDonated,
      this.totalMedalsSpent,
    );

    return {
      success: true,
      totalLogs: this.logs.length,
      totalMedalsDonated: this.totalMedalsDonated,
      totalMedalsSpent: this.totalMedalsSpent,
      totalGoodsDonated: this.totalGoodsDonated,
    };
  }

  getReserve(resourceId) {
    return this.reserves.get(resourceId) || new BigNumber(0);
  }

  getTreasuryReserves() {
    return this.reserves;
  }

  getLogs() {
    return this.logs;
  }

  getTotalMedalsDonated() {
    return this.totalMedalsDonated;
  }

  getTotalMedalsSpent() {
    return this.totalMedalsSpent;
  }

  getTotalGoodsDonated() {
    return this.totalGoodsDonated;
  }

  getDonationsByPlayer(playerName) {
    return (
      this.playerDonations.get(playerName) || {
        medalsDonated: new BigNumber(0),
        medalsSpent: new BigNumber(0),
        goodsDonated: new BigNumber(0),
        goodsSpent: new BigNumber(0),
      }
    );
  }
}

function renderTreasuryPanel(reserves) {
  if (typeof document === 'undefined') return;
  const targetEl = document.getElementById('treasury');
  if (!targetEl) return;

  if (showOptions && showOptions.showTreasury === false) {
    targetEl.innerHTML = '';
    return;
  }

  const isCollapsed =
    collapse?.collapseTreasury !== undefined ?
      !!collapse.collapseTreasury
    : true;
  let html = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">`;
  if (element?.close) html += element.close();
  if (element?.copy)
    html += element.copy('treasuryCopyID', 'success', 'right', isCollapsed);
  html += `<p id="treasuryTextLabel" href="#treasuryText" data-bs-toggle="collapse" role="button">`;
  if (element?.icon)
    html += element.icon('treasuryicon', 'treasuryText', isCollapsed);
  html += `<strong><span data-i18n="treasury">Guild Treasury</span>:</strong>`;
  html += ` <span class="ms-1 small">(${reserves.size} <span data-i18n="resources">Resources</span>)</span></p>`;
  html += `<div id="treasuryText" class="overflow-y resize collapse ${isCollapsed ? '' : 'show'}">`;
  html += `<table id="treasurytable" class="goods-table w-100 table table-sm table-striped"><thead><tr><th class="text-start"><span data-i18n="resource">Resource</span></th><th class="text-end"><span data-i18n="amount">Amount</span></th></tr></thead><tbody>`;

  for (const [resId, amountBN] of reserves.entries()) {
    if (amountBN.isZero()) continue;
    const name = helper?.escapeHTML ? helper.escapeHTML(resId) : resId;
    const amountStr = amountBN.toNumber().toLocaleString();
    html += `<tr><td class="text-start ps-3">${name}</td><td class="text-end font-monospace">${amountStr}</td></tr>`;
  }

  html += `</tbody></table></div></div>`;
  targetEl.innerHTML = html;

  if (copy?.TreasuryCopy) {
    document
      .getElementById('treasuryCopyID')
      ?.addEventListener('click', copy.TreasuryCopy);
  }
  if (collapse?.fCollapseTreasury) {
    document
      .getElementById('treasuryTextLabel')
      ?.addEventListener('click', collapse.fCollapseTreasury);
  }
  if (helper?.translateContainer) {
    helper.translateContainer(targetEl);
  }
}

function renderTreasuryLogPanel(
  logs,
  totalGoodsDonated,
  totalMedalsDonated,
  totalMedalsSpent,
) {
  if (typeof document === 'undefined') return;
  const targetEl = document.getElementById('treasuryLog');
  if (!targetEl) return;

  if (showOptions && showOptions.showTreasury === false) {
    targetEl.innerHTML = '';
    return;
  }

  const isCollapsed =
    collapse?.collapseTreasuryLog !== undefined ?
      !!collapse.collapseTreasuryLog
    : true;
  let html = `<div class="alert alert-info alert-dismissible show collapsed" role="alert">`;
  if (element?.close) html += element.close();
  if (element?.copy)
    html += element.copy('treasuryLogCopyID', 'info', 'right', isCollapsed);
  html += `<p id="treasuryLogTextLabel" href="#treasuryLogText" data-bs-toggle="collapse" role="button">`;
  if (element?.icon)
    html += element.icon('treasuryLogicon', 'treasuryLogText', isCollapsed);
  html += `<strong><span data-i18n="treasury_logs">Treasury Logs</span>:</strong>`;
  html += ` <span class="ms-1 small">(${logs.length} <span data-i18n="entries">Entries</span>)</span></p>`;
  html += `<div id="treasuryLogText" class="overflow-y resize collapse ${isCollapsed ? '' : 'show'}">`;
  html += `<div class="mb-2 small px-2">`;
  html += `<span data-i18n="goods_donated">Goods Donated</span>: <strong>${totalGoodsDonated.toNumber().toLocaleString()}</strong> | `;
  html += `<span data-i18n="medals_donated">Medals Donated</span>: <strong>${totalMedalsDonated.toNumber().toLocaleString()}</strong> | `;
  html += `<span data-i18n="medals_spent">Medals Spent</span>: <strong>${totalMedalsSpent.toNumber().toLocaleString()}</strong>`;
  html += `</div>`;
  html += `<table class="table table-sm table-striped align-middle mb-0"><thead><tr>`;
  html += `<th class="text-start"><span data-i18n="player">Player</span></th>`;
  html += `<th class="text-start"><span data-i18n="action">Action</span></th>`;
  html += `<th class="text-start"><span data-i18n="resource">Resource</span></th>`;
  html += `<th class="text-end"><span data-i18n="amount">Amount</span></th>`;
  html += `</tr></thead><tbody>`;

  for (const entry of logs.slice(0, 50)) {
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
    const isDonation = entry.isDonation();
    const amountClass = isDonation ? 'text-success' : 'text-danger';
    const amountSign = isDonation ? '+' : '-';
    const amountStr = entry.amount.toNumber().toLocaleString();

    html += `<tr>`;
    html += `<td class="text-start">${pName}</td>`;
    html += `<td class="text-start small text-muted">${act}</td>`;
    html += `<td class="text-start">${rName}</td>`;
    html += `<td class="text-end font-monospace ${amountClass}">${amountSign}${amountStr}</td>`;
    html += `</tr>`;
  }

  html += `</tbody></table></div></div>`;
  targetEl.innerHTML = html;

  if (collapse?.fCollapseTreasuryLog) {
    document
      .getElementById('treasuryLogTextLabel')
      ?.addEventListener('click', collapse.fCollapseTreasuryLog);
  }
  if (helper?.translateContainer) {
    helper.translateContainer(targetEl);
  }
}

const treasuryService = new TreasuryService();
if (messageDispatcher && typeof messageDispatcher.register === 'function') {
  treasuryService.register(messageDispatcher);
}

module.exports = {
  TreasuryService,
  TreasuryLogEntry,
  treasuryService,
  getTreasuryLogs: treasuryService.getTreasuryLogs,
  getTreasuryBag: treasuryService.getTreasuryBag,
};
module.exports.default = treasuryService;
