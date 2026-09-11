/**
 * HiddenRewardService.js
 *
 * Decoupled domain service for Forge of Empires incidents (hidden rewards).
 * Handles HiddenRewardService.getOverview RPC payloads, parsing road and wilderness
 * incidents, calculating duration/expiration, and providing rarity breakdowns.
 */

const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

class HiddenReward {
  constructor(raw = {}) {
    this.hiddenRewardId = raw.hiddenRewardId || 0;
    this.type = raw.type || '';
    this.startTime = raw.startTime || 0;
    this.expireTime = raw.expireTime || 0;
    this.durationSeconds =
      this.expireTime && this.startTime ? this.expireTime - this.startTime : 0;
    this.position = raw.position || null;
    this.positionContext = raw.position?.context || '';
    this.rarity = raw.rarity || 'common';
    this.formattedRarity =
      this.rarity ?
        this.rarity.charAt(0).toUpperCase() + this.rarity.slice(1)
      : 'Common';
  }

  isExpired(nowSeconds = Date.now() / 1000) {
    return nowSeconds >= this.expireTime;
  }

  remainingSeconds(nowSeconds = Date.now() / 1000) {
    return Math.max(0, Math.floor(this.expireTime - nowSeconds));
  }
}

let defaultState = null;
let defaultHelper = null;
if (typeof __webpack_require__ !== 'undefined') {
  try {
    defaultState = require('../vars/state.js');
  } catch {}
  try {
    defaultHelper = require('../fn/helper.js');
  } catch {}
}

class HiddenRewardService {
  constructor(options = {}) {
    this.incidents = [];
    this.lastUpdated = null;
    this.onOverviewCallbacks = [];
    this.state = options.state || null;
    this.helper = options.helper || null;

    this.getOverview = this.getOverview.bind(this);
    this.onOverview = this.onOverview.bind(this);
    this.setState = this.setState.bind(this);
    this.setHelper = this.setHelper.bind(this);
  }

  onOverview(callback) {
    if (typeof callback === 'function') {
      this.onOverviewCallbacks.push(callback);
    }
    return this;
  }

  setState(state) {
    this.state = state;
    return this;
  }

  setHelper(helper) {
    this.helper = helper;
    return this;
  }

  /**
   * Register with a MessageDispatcher instance.
   * @param {Object} [dispatcher=messageDispatcher]
   * @returns {HiddenRewardService} this
   */
  register(dispatcher = messageDispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register(
        'HiddenRewardService',
        'getOverview',
        this.getOverview,
      );
    }
    return this;
  }

  /**
   * Handle HiddenRewardService.getOverview RPC messages.
   * @param {Object} msg
   * @returns {Object} parsing summary
   */
  getOverview(msg) {
    const rawRewards =
      msg?.responseData?.hiddenRewards ||
      (Array.isArray(msg?.responseData) ? msg.responseData : []);

    this.incidents = rawRewards.map((item) => new HiddenReward(item));
    this.lastUpdated = Date.now();

    const targetState = this.state || defaultState;
    if (targetState && typeof targetState.setHiddenRewards === 'function') {
      targetState.setHiddenRewards(rawRewards);
    }

    const targetHelper = this.helper || defaultHelper;
    if (targetHelper && typeof targetHelper.fShowIncidents === 'function') {
      targetHelper.fShowIncidents();
    }

    for (const cb of this.onOverviewCallbacks) {
      try {
        cb(rawRewards, this.incidents);
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) {
          console.error(
            '[HiddenRewardService] onOverview callback error:',
            err,
          );
        }
      }
    }

    return {
      success: true,
      total: this.incidents.length,
      incidents: this.incidents,
      breakdown: this.getRarityBreakdown(),
    };
  }

  getIncidents() {
    return this.incidents;
  }

  getActiveIncidents(nowSeconds = Date.now() / 1000) {
    return this.incidents.filter(
      (inc) => inc.startTime <= nowSeconds && !inc.isExpired(nowSeconds),
    );
  }

  getRarityBreakdown() {
    const breakdown = { common: 0, uncommon: 0, rare: 0 };
    for (const inc of this.incidents) {
      const r = inc.rarity || 'common';
      breakdown[r] = (breakdown[r] || 0) + 1;
    }
    return breakdown;
  }

  getContextBreakdown() {
    const breakdown = {};
    for (const inc of this.incidents) {
      const ctx = inc.positionContext || 'unknown';
      breakdown[ctx] = (breakdown[ctx] || 0) + 1;
    }
    return breakdown;
  }
}

const hiddenRewardService = new HiddenRewardService();

module.exports = {
  HiddenRewardService,
  HiddenReward,
  hiddenRewardService,
  getOverview: hiddenRewardService.getOverview,
};
module.exports.default = hiddenRewardService;
