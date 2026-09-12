/**
 * OutpostService.js
 *
 * Decoupled domain service for Forge of Empires Cultural Settlements and Era Outposts.
 * Handles OutpostService.getAll and OutpostService.startEraOutpost RPC payloads,
 * tracking settlement progression, era requirements, and active colonies.
 */

const { messageDispatcher } = require('../protocol/MessageDispatcher.js');
const {
  renderCulturalPanel,
  setShowOptions,
} = require('../ui/renderCulturalPanel.js');

const CULTURAL_GOODS_MAP = {
  vikings: ['axes', 'mead', 'horns', 'wool'],
  egyptians: ['barley', 'pottery', 'flowers', 'sacrificial_offerings'],
  japanese: ['soy', 'paintings', 'armor', 'instruments'],
  aztecs: ['vegetables', 'headdress', 'maize', 'stone_figures'],
  mughals: ['basmati', 'saree', 'spices', 'lotus'],
  pirates: ['pirate_fish', 'pirate_spice', 'pirate_rum', 'pirate_cannons'],
  polynesia: ['fresh_fish', 'coconuts', 'kava', 'catamarans'],
};

function isSettlementActive(raw = {}) {
  if (
    raw.isActive === true ||
    raw.isCurrent === true ||
    raw.active === true ||
    raw.is_active === true
  ) {
    return true;
  }
  if (raw.startedAt && !raw.finishedAt) {
    if (!raw.expireAt) return true;
    const expiryMs =
      typeof raw.expireAt === 'number' && raw.expireAt < 1e11 ?
        raw.expireAt * 1000
      : raw.expireAt;
    return typeof expiryMs === 'number' ? expiryMs > Date.now() : true;
  }
  return false;
}

class Settlement {
  constructor(raw = {}) {
    this.content = raw.content || '';
    this.name = raw.name || '';
    this.contentName = raw.contentName || '';
    this.description = raw.description || '';
    this.minEra = raw.minEra || '';
    this.isActive = isSettlementActive(raw);

    if (!raw.goodsResourceIds) {
      const matchKey =
        `${this.content} ${this.name} ${this.contentName} ${raw.id || ''}`.toLowerCase();
      for (const [culture, goods] of Object.entries(CULTURAL_GOODS_MAP)) {
        if (matchKey.includes(culture)) {
          raw.goodsResourceIds = goods;
          break;
        }
      }
    }

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
      this.settlements.find((s) => s.isActive || isSettlementActive(s.raw)) ||
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
    const allResourceKeys = new Set();
    for (const adv of this.advancements) {
      const res = adv.requirements?.resources || {};
      for (const [key, amount] of Object.entries(res)) {
        allResourceKeys.add(key);
        if (!adv.isUnlocked && typeof amount === 'number' && amount > 0) {
          costs[key] = (costs[key] || 0) + amount;
        }
      }
    }
    this.remainingCosts = costs;

    const costKeys = Array.from(allResourceKeys);
    if (costKeys.length > 0) {
      const matchedCulture =
        this.settlements.find((s) =>
          s.raw?.goodsResourceIds?.some((g) => costKeys.includes(g)),
        ) ||
        this.settlements.find((s) => {
          const matchKey =
            `${s.content} ${s.name} ${s.contentName} ${s.raw?.id || ''}`.toLowerCase();
          for (const [culture, goods] of Object.entries(CULTURAL_GOODS_MAP)) {
            if (
              matchKey.includes(culture) &&
              goods.some((g) => costKeys.includes(g))
            ) {
              return true;
            }
          }
          return false;
        });

      const activeHasMatchingGoods =
        this.activeSettlement?.raw?.goodsResourceIds?.some((g) =>
          costKeys.includes(g),
        );

      if (
        matchedCulture &&
        (!this.activeSettlement ||
          !this.activeSettlement.isActive ||
          !activeHasMatchingGoods)
      ) {
        this.activeSettlement = matchedCulture;
        this.activeSettlement.isActive = true;
      } else if (
        !matchedCulture &&
        (!this.activeSettlement ||
          !this.activeSettlement.isActive ||
          !activeHasMatchingGoods)
      ) {
        for (const [cultureKey, goods] of Object.entries(CULTURAL_GOODS_MAP)) {
          if (goods.some((g) => costKeys.includes(g))) {
            const names = {
              vikings: 'Vikings',
              egyptians: 'Egyptian Settlement',
              japanese: 'Feudal Japan',
              aztecs: 'Aztecs',
              mughals: 'Mughal Empire',
              pirates: 'Pirates',
              polynesia: 'Polynesia',
            };
            this.activeSettlement = new Settlement({
              id: cultureKey,
              content: cultureKey,
              name: names[cultureKey] || cultureKey,
              goodsResourceIds: goods,
              isActive: true,
            });
            break;
          }
        }
      }
    }

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

const outpostService = new OutpostService();

const exportsObj = {
  OutpostService,
  Settlement,
  outpostService,
  getAll: outpostService.getAll,
  startEraOutpost: outpostService.startEraOutpost,
  handleAdvancements: outpostService.handleAdvancements,
  handleUnlockAdvancement: outpostService.handleUnlockAdvancement,
  renderCulturalPanel,
  setShowOptions,
  isSettlementActive,
  CULTURAL_GOODS_MAP,
};
exportsObj.default = exportsObj;

module.exports = exportsObj;
