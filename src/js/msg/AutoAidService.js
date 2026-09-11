/**
 * AutoAidService.js
 *
 * Decoupled domain service for Forge of Empires Auto-Aid feature.
 * Handles AutoAidService.getStates RPC payloads, tracking available aid targets
 * across neighbors, guild members, and friends, along with cooldown statuses.
 */

const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

class AutoAidState {
  constructor(raw = {}) {
    this.id = raw.id || '';
    this.availablePeers = raw.availablePeers || 0;
    this.totalPeers = raw.totalPeers || 0;
    this.stateClass = raw.__class__ || 'AutoAidIdleState';
    this.nextAidTime = raw.nextAidTime || raw.cooldownEndTime || 0;
    this.raw = raw;
  }

  isIdle() {
    return this.stateClass === 'AutoAidIdleState';
  }

  isCooldown(nowSeconds = Date.now() / 1000) {
    if (this.stateClass === 'AutoAidCooldownState') return true;
    return this.nextAidTime > nowSeconds;
  }

  canAid(nowSeconds = Date.now() / 1000) {
    return this.availablePeers > 0 && !this.isCooldown(nowSeconds);
  }
}

class AutoAidService {
  constructor() {
    this.states = new Map();
    this.lastUpdated = null;

    this.getStates = this.getStates.bind(this);
  }

  register(dispatcher = messageDispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register('AutoAidService', 'getStates', this.getStates);
    }
    return this;
  }

  getStates(msg) {
    const rawList =
      Array.isArray(msg?.responseData) ? msg.responseData
      : Array.isArray(msg?.responseData?.states) ? msg.responseData.states
      : [];

    this.states.clear();
    for (const item of rawList) {
      const stateObj = new AutoAidState(item);
      this.states.set(stateObj.id, stateObj);
    }
    this.lastUpdated = Date.now();

    return {
      success: true,
      total: this.states.size,
      totalAvailable: this.getTotalAvailablePeers(),
      states: Array.from(this.states.values()),
    };
  }

  getState(id) {
    return this.states.get(id) || null;
  }

  getAllStates() {
    return Array.from(this.states.values());
  }

  getAvailablePeers(id) {
    const s = this.getState(id);
    return s ? s.availablePeers : 0;
  }

  getTotalAvailablePeers() {
    let sum = 0;
    for (const s of this.states.values()) {
      sum += s.availablePeers;
    }
    return sum;
  }

  canAid(id, nowSeconds = Date.now() / 1000) {
    const s = this.getState(id);
    return s ? s.canAid(nowSeconds) : false;
  }
}

const autoAidService = new AutoAidService();

module.exports = {
  AutoAidService,
  AutoAidState,
  autoAidService,
  getStates: autoAidService.getStates,
};
module.exports.default = autoAidService;
