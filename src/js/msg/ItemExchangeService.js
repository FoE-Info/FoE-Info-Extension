/**
 * ItemExchangeService.js
 *
 * Decoupled domain service for Forge of Empires Antiques Dealer.
 * Handles ItemExchangeService.getConfig RPC payloads, managing exchange durations,
 * value output multipliers, and slot unlocking thresholds.
 */

const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

class ItemExchangeService {
  constructor() {
    this.exchangeTimes = [];
    this.outputModifiersBoost = [];
    this.costModifiersBoost = [];
    this.slotUnlockExchangeCounts = [];
    this.lastUpdated = null;

    this.getConfig = this.getConfig.bind(this);
  }

  register(dispatcher = messageDispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register('ItemExchangeService', 'getConfig', this.getConfig);
    }
    return this;
  }

  getConfig(msg) {
    const data = msg?.responseData || {};

    this.exchangeTimes = data.exchangeTimes || [];
    this.outputModifiersBoost = data.outputModifiersBoost || [];
    this.costModifiersBoost = data.costModifiersBoost || [];
    this.slotUnlockExchangeCounts = data.slotUnlockExchangeCounts || [];
    this.lastUpdated = Date.now();

    return {
      success: true,
      exchangeTimesCount: this.exchangeTimes.length,
      slotsCount: this.slotUnlockExchangeCounts.length,
      config: data,
    };
  }

  getExchangeTimes() {
    return this.exchangeTimes;
  }

  getSlotUnlockExchangeCounts() {
    return this.slotUnlockExchangeCounts;
  }

  getRequiredExchangesForSlot(slotIndex) {
    if (slotIndex >= 0 && slotIndex < this.slotUnlockExchangeCounts.length) {
      return this.slotUnlockExchangeCounts[slotIndex];
    }
    return null;
  }

  getOutputModifierForDuration(seconds) {
    const entry = this.exchangeTimes.find((t) => t.exchangeTime === seconds);
    return entry ? entry.outputModifier : 1.0;
  }
}

const itemExchangeService = new ItemExchangeService();
if (messageDispatcher && typeof messageDispatcher.register === 'function') {
  itemExchangeService.register(messageDispatcher);
}

module.exports = {
  ItemExchangeService,
  itemExchangeService,
  getConfig: itemExchangeService.getConfig,
};
module.exports.default = itemExchangeService;
