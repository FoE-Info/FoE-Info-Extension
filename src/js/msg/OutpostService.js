/**
 * OutpostService.js
 *
 * Decoupled domain service for Forge of Empires Cultural Settlements and Era Outposts.
 * Handles OutpostService.getAll and OutpostService.startEraOutpost RPC payloads,
 * tracking settlement progression, era requirements, and active colonies.
 */

const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

let element = null;
let collapse = null;
let helper = null;
let showOptions = null;

if (typeof __webpack_require__ !== 'undefined') {
  try {
    element = require('../fn/AddElement.js');
  } catch {}
  try {
    collapse = require('../fn/collapse.js');
  } catch {}
  try {
    helper = require('../fn/helper.js');
  } catch {}
  try {
    const showOptMod = require('../vars/showOptions.js');
    if (showOptMod?.showOptions) showOptions = showOptMod.showOptions;
  } catch {}
}

class Settlement {
  constructor(raw = {}) {
    this.content = raw.content || '';
    this.name = raw.name || '';
    this.contentName = raw.contentName || '';
    this.description = raw.description || '';
    this.minEra = raw.minEra || '';
    this.isActive = Boolean(raw.isActive || raw.isCurrent || raw.active);
    this.raw = raw;
  }
}

class OutpostService {
  constructor() {
    this.settlements = [];
    this.activeSettlement = null;
    this.advancements = [];
    this.remainingCosts = {};
    this.activeEraOutpost = null;
    this.lastUpdated = null;

    this.getAll = this.getAll.bind(this);
    this.startEraOutpost = this.startEraOutpost.bind(this);
    this.handleAdvancements = this.handleAdvancements.bind(this);
    this.handleUnlockAdvancement = this.handleUnlockAdvancement.bind(this);
  }

  register(dispatcher = messageDispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register('OutpostService', 'getAll', this.getAll);
      dispatcher.register(
        'OutpostService',
        'startEraOutpost',
        this.startEraOutpost,
      );
      dispatcher.register(
        'AdvancementService',
        'getAll',
        this.handleAdvancements,
      );
      dispatcher.register(
        'AdvancementService',
        'unlock',
        this.handleUnlockAdvancement,
      );
    }
    return this;
  }

  getAll(msg) {
    const rawList =
      Array.isArray(msg?.responseData) ? msg.responseData
      : Array.isArray(msg?.responseData?.settlements) ?
        msg.responseData.settlements
      : [];

    this.settlements = rawList.map((s) => new Settlement(s));
    this.activeSettlement =
      this.settlements.find((s) => s.isActive) ||
      this.settlements.find((s) => s.raw && s.raw.id && !s.raw.finishedAt) ||
      null;
    this.lastUpdated = Date.now();
    renderCulturalPanel(
      this.activeSettlement,
      this.advancements,
      this.remainingCosts,
    );

    return {
      success: true,
      total: this.settlements.length,
      activeSettlement: this.activeSettlement,
      settlements: this.settlements,
    };
  }

  handleAdvancements(msg) {
    const rawList = Array.isArray(msg?.responseData) ? msg.responseData : [];
    this.advancements = rawList.map((a) => ({
      id: a.id || '',
      name: a.name || '',
      isUnlocked: !!a.isUnlocked,
      requirements: a.requirements || {},
      rewards: a.rewards || [],
      raw: a,
    }));

    const costs = {};
    for (const adv of this.advancements) {
      if (adv.isUnlocked) continue;
      const res = adv.requirements?.resources || {};
      for (const [key, amount] of Object.entries(res)) {
        if (typeof amount === 'number' && amount > 0) {
          costs[key] = (costs[key] || 0) + amount;
        }
      }
    }
    this.remainingCosts = costs;
    this.lastUpdated = Date.now();
    renderCulturalPanel(
      this.activeSettlement,
      this.advancements,
      this.remainingCosts,
    );

    return {
      success: true,
      total: this.advancements.length,
      unlocked: this.advancements.filter((a) => a.isUnlocked).length,
      remainingCosts: this.remainingCosts,
    };
  }

  handleUnlockAdvancement(msg) {
    if (
      msg?.responseData?.__class__ === 'Success' &&
      this.advancements.length > 0
    ) {
      const nextLocked = this.advancements.find((a) => !a.isUnlocked);
      if (nextLocked) {
        nextLocked.isUnlocked = true;
        const costs = {};
        for (const adv of this.advancements) {
          if (adv.isUnlocked) continue;
          const res = adv.requirements?.resources || {};
          for (const [key, amount] of Object.entries(res)) {
            if (typeof amount === 'number' && amount > 0) {
              costs[key] = (costs[key] || 0) + amount;
            }
          }
        }
        this.remainingCosts = costs;
        this.lastUpdated = Date.now();
        renderCulturalPanel(
          this.activeSettlement,
          this.advancements,
          this.remainingCosts,
        );
      }
    }
    return { success: true };
  }

  startEraOutpost(msg) {
    const data =
      Array.isArray(msg?.responseData) ?
        msg.responseData[0]
      : msg?.responseData;

    this.activeEraOutpost = data || null;
    this.lastUpdated = Date.now();

    return {
      success: true,
      activeEraOutpost: this.activeEraOutpost,
    };
  }

  getAllSettlements() {
    return this.settlements;
  }

  getSettlementByContent(content) {
    return this.settlements.find((s) => s.content === content) || null;
  }

  getActiveEraOutpost() {
    return this.activeEraOutpost;
  }

  getActiveSettlement() {
    return this.activeSettlement;
  }

  getAdvancements() {
    return this.advancements;
  }

  getRemainingCosts() {
    return this.remainingCosts;
  }
}

function renderCulturalPanel(
  activeSettlement,
  advancements = [],
  remainingCosts = {},
) {
  if (typeof document === 'undefined') return;
  const targetEl = document.getElementById('cultural');
  if (!targetEl) return;

  if (showOptions && showOptions.showCultural === false) {
    targetEl.innerHTML = '';
    return;
  }

  const isCollapsed =
    collapse?.collapseCultural !== undefined ?
      !!collapse.collapseCultural
    : true;
  const settlementName =
    activeSettlement?.name ||
    activeSettlement?.contentName ||
    'Cultural Settlement';
  const totalAdv = advancements.length;
  const unlockedAdv = advancements.filter((a) => a.isUnlocked).length;
  const pct = totalAdv > 0 ? Math.round((unlockedAdv / totalAdv) * 100) : 0;

  let html = `<div class="alert alert-secondary alert-dismissible show collapsed" role="alert">`;
  if (element?.close) html += element.close();
  html += `<p id="culturalTextLabel" href="#culturalText" data-bs-toggle="collapse" role="button">`;
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

  if (!activeSettlement && totalAdv === 0) {
    html += `<div class="p-2 text-muted small"><span data-i18n="no_settlement_active">No active cultural settlement advancement data available.</span></div>`;
  } else {
    if (totalAdv > 0) {
      html += `<div class="progress mb-2 mx-2" style="height: 16px;">`;
      html += `<div class="progress-bar bg-success" role="progressbar" style="width: ${pct}%;" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">${pct}%</div>`;
      html += `</div>`;
    }

    const costKeys = Object.keys(remainingCosts);
    if (costKeys.length > 0) {
      html += `<div class="px-2 small mb-1 fw-bold"><span data-i18n="remaining_cultural_goods">Remaining Goods Required</span>:</div>`;
      html += `<table class="table table-sm table-striped align-middle mb-0"><thead><tr>`;
      html += `<th class="text-start"><span data-i18n="resource">Resource</span></th>`;
      html += `<th class="text-end"><span data-i18n="required">Required</span></th>`;
      html += `</tr></thead><tbody>`;

      for (const res of costKeys) {
        const amount = remainingCosts[res];
        const resLabel = helper?.escapeHTML ? helper.escapeHTML(res) : res;
        html += `<tr><td class="text-start ps-3">${resLabel}</td><td class="text-end font-monospace">${amount.toLocaleString()}</td></tr>`;
      }
      html += `</tbody></table>`;
    }
  }

  html += `</div></div>`;
  targetEl.innerHTML = html;

  if (collapse?.fCollapseCultural) {
    document
      .getElementById('culturalTextLabel')
      ?.addEventListener('click', collapse.fCollapseCultural);
  }
  if (helper?.translateContainer) {
    helper.translateContainer(targetEl);
  }
}

const outpostService = new OutpostService();
if (messageDispatcher && typeof messageDispatcher.register === 'function') {
  outpostService.register(messageDispatcher);
}

module.exports = {
  OutpostService,
  Settlement,
  outpostService,
  getAll: outpostService.getAll,
  startEraOutpost: outpostService.startEraOutpost,
  handleAdvancements: outpostService.handleAdvancements,
  handleUnlockAdvancement: outpostService.handleUnlockAdvancement,
  renderCulturalPanel,
};
module.exports.default = outpostService;
