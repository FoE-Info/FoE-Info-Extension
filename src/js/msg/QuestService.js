/**
 * QuestService.js
 *
 * Decoupled domain service for Forge of Empires Quest progression.
 * Handles QuestService.getUpdates, QuestService.getQuestPeriods, and
 * QuestService.getQuestCategoryTimes RPC payloads, tracking active, completed,
 * and recurring quests along with reset countdowns.
 */

const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

const COMPLETED_QUEST_STATES = new Set([
  'fulfilled',
  'collect',
  'closed',
  'completed',
]);

class Quest {
  constructor(raw = {}) {
    this.id = raw.id || 0;
    this.title = raw.title || '';
    this.windowTitle = raw.windowTitle || '';
    this.type = raw.type || 'side';
    this.state = raw.state || 'accepted';
    this.priority = raw.priority || 0;
    this.questGiver = raw.questGiver || null;
    this.successConditions = raw.successConditions || [];
    this.raw = raw;
  }

  isFulfilled() {
    return this.state === 'fulfilled' || this.state === 'collect';
  }

  isActive() {
    return this.state === 'accepted' || this.state === 'fulfilled';
  }

  isCompleted() {
    return COMPLETED_QUEST_STATES.has(this.state);
  }

  getRewards() {
    const rewards = this.raw?.genericRewards;
    return Array.isArray(rewards) ? rewards : [];
  }
}

class QuestService {
  constructor(deps = {}) {
    this.quests = new Map();
    this.questPeriods = [];
    this.categoryTimes = null;
    this.lastUpdated = null;
    this.rewardRenderer = deps.rewardRenderer || null;
    this.rewardedQuestIds = new Set();
    this.suppressStartupQuests = deps.suppressStartupQuests === true;
    this.hasProcessedInitial = false;

    this.getUpdates = this.getUpdates.bind(this);
    this.getQuestPeriods = this.getQuestPeriods.bind(this);
    this.getQuestCategoryTimes = this.getQuestCategoryTimes.bind(this);
  }

  register(dispatcher = messageDispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register('QuestService', 'getUpdates', this.getUpdates);
      dispatcher.register(
        'QuestService',
        'getQuestPeriods',
        this.getQuestPeriods,
      );
      dispatcher.register(
        'QuestService',
        'getQuestCategoryTimes',
        this.getQuestCategoryTimes,
      );
    }
    return this;
  }

  resolveRewardRenderer() {
    if (this.rewardRenderer) return this.rewardRenderer;
    if (typeof __webpack_require__ !== 'undefined') {
      try {
        this.rewardRenderer = require('../ui/RewardRenderer.js');
      } catch {
        this.rewardRenderer = null;
      }
    }
    return this.rewardRenderer;
  }

  resolveShowRewards() {
    if (typeof this.showRewards === 'boolean') return this.showRewards;
    if (typeof __webpack_require__ !== 'undefined') {
      try {
        const options = require('../state/showOptions.js');
        const value = options?.showOptions?.showRewards ?? options?.showRewards;
        if (typeof value === 'boolean') return value;
      } catch {
        // showOptions unavailable — default on below.
      }
    }
    return true;
  }

  routeCompletedRewards() {
    if (!this.resolveShowRewards()) return;

    const renderer = this.resolveRewardRenderer();
    const showRewardFn =
      (renderer && typeof renderer.showReward === 'function' ?
        renderer.showReward
      : null) ||
      (renderer?.default && typeof renderer.default.showReward === 'function' ?
        renderer.default.showReward
      : null);
    if (!showRewardFn) return;

    for (const quest of this.quests.values()) {
      if (!quest.isCompleted() || this.rewardedQuestIds.has(quest.id)) continue;
      this.rewardedQuestIds.add(quest.id);
      for (const reward of quest.getRewards()) {
        if (!reward || typeof reward !== 'object') continue;
        showRewardFn('quest', reward);
      }
    }
  }

  getUpdates(msg) {
    const rawList =
      Array.isArray(msg?.responseData) ? msg.responseData
      : Array.isArray(msg?.responseData?.quests) ? msg.responseData.quests
      : [];

    const isInitialBatch =
      this.suppressStartupQuests && !this.hasProcessedInitial;

    this.quests.clear();
    for (const q of rawList) {
      const quest = new Quest(q);
      this.quests.set(quest.id, quest);
      if (isInitialBatch && quest.isCompleted()) {
        this.rewardedQuestIds.add(quest.id);
      }
    }
    this.hasProcessedInitial = true;
    this.lastUpdated = Date.now();

    this.routeCompletedRewards();

    return {
      success: true,
      total: this.quests.size,
      activeCount: this.getActiveQuests().length,
      quests: Array.from(this.quests.values()),
    };
  }

  getQuestPeriods(msg) {
    const rawList =
      Array.isArray(msg?.responseData) ? msg.responseData
      : Array.isArray(msg?.responseData?.periods) ? msg.responseData.periods
      : [];

    this.questPeriods = rawList;
    this.lastUpdated = Date.now();

    return {
      success: true,
      total: this.questPeriods.length,
      periods: this.questPeriods,
    };
  }

  getQuestCategoryTimes(msg) {
    this.categoryTimes = msg?.responseData || null;
    this.lastUpdated = Date.now();

    return {
      success: true,
      categoryTimes: this.categoryTimes,
    };
  }

  getAllQuests() {
    return Array.from(this.quests.values());
  }

  getActiveQuests() {
    return this.getAllQuests().filter((q) => q.isActive());
  }

  getFulfilledQuests() {
    return this.getAllQuests().filter((q) => q.isFulfilled());
  }

  getQuestsByType(type) {
    return this.getAllQuests().filter((q) => q.type === type);
  }

  getQuestById(id) {
    return this.quests.get(id) || null;
  }

  getPeriods() {
    return this.questPeriods;
  }

  getCategoryTimes() {
    return this.categoryTimes;
  }
}

const questService = new QuestService({ suppressStartupQuests: true });

module.exports = {
  QuestService,
  Quest,
  questService,
  getUpdates: questService.getUpdates,
  getQuestPeriods: questService.getQuestPeriods,
  getQuestCategoryTimes: questService.getQuestCategoryTimes,
};
module.exports.default = questService;
