/**
 * BoostService.js
 *
 * Decoupled domain service for Forge of Empires military and city boost matrices.
 * Handles BoostService.getAllBoosts and BoostService.getTimerBoost RPC payloads,
 * aggregating combat and production boosts across features using BigNumber precision.
 */

const BigNumber = require('bignumber.js');
const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

const KNOWN_FEATURES = [
  'all',
  'battleground',
  'guild_expedition',
  'guild_raids',
];

function createFeatureBoostMatrix() {
  return {
    attackingAttack: new BigNumber(0),
    attackingDefense: new BigNumber(0),
    defendingAttack: new BigNumber(0),
    defendingDefense: new BigNumber(0),
  };
}

class BoostService {
  constructor() {
    this.rawBoosts = [];
    this.timerBoosts = [];
    this.lastUpdated = null;

    this.features = {};
    for (const f of KNOWN_FEATURES) {
      this.features[f] = createFeatureBoostMatrix();
    }
    this.production = {
      coin: new BigNumber(0),
      supply: new BigNumber(0),
      forgePoints: new BigNumber(0),
    };

    this.getAllBoosts = this.getAllBoosts.bind(this);
    this.getTimerBoost = this.getTimerBoost.bind(this);
  }

  /**
   * Register with a MessageDispatcher instance.
   * @param {Object} [dispatcher=messageDispatcher]
   * @returns {BoostService} this
   */
  register(dispatcher = messageDispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register('BoostService', 'getAllBoosts', this.getAllBoosts);
      dispatcher.register('BoostService', 'getTimerBoost', this.getTimerBoost);
    }
    return this;
  }

  /**
   * Reset boost matrices to zero BigNumbers.
   */
  reset() {
    for (const f of KNOWN_FEATURES) {
      this.features[f] = createFeatureBoostMatrix();
    }
    this.production.coin = new BigNumber(0);
    this.production.supply = new BigNumber(0);
    this.production.forgePoints = new BigNumber(0);
  }

  /**
   * Process BoostService.getAllBoosts RPC messages.
   * @param {Object} msg
   * @returns {Object} aggregation summary
   */
  getAllBoosts(msg) {
    const list = Array.isArray(msg?.responseData) ? msg.responseData : [];
    this.rawBoosts = list;
    this.reset();

    for (const item of list) {
      const val = new BigNumber(item.value || 0);
      const feature = item.targetedFeature || 'all';

      // Production boosts
      if (item.type === 'coin_production') {
        this.production.coin = this.production.coin.plus(val);
      } else if (item.type === 'supply_production') {
        this.production.supply = this.production.supply.plus(val);
      } else if (
        item.type === 'forge_points_production' ||
        item.type === 'fp_production_boost'
      ) {
        this.production.forgePoints = this.production.forgePoints.plus(val);
      }

      // Feature matrix boosts
      if (this.features[feature]) {
        const matrix = this.features[feature];
        switch (item.type) {
          case 'att_boost_attacker':
            matrix.attackingAttack = matrix.attackingAttack.plus(val);
            break;
          case 'def_boost_attacker':
            matrix.attackingDefense = matrix.attackingDefense.plus(val);
            break;
          case 'att_boost_defender':
            matrix.defendingAttack = matrix.defendingAttack.plus(val);
            break;
          case 'def_boost_defender':
            matrix.defendingDefense = matrix.defendingDefense.plus(val);
            break;
          case 'att_def_boost_attacker':
            matrix.attackingAttack = matrix.attackingAttack.plus(val);
            matrix.attackingDefense = matrix.attackingDefense.plus(val);
            break;
          case 'att_def_boost_defender':
            matrix.defendingAttack = matrix.defendingAttack.plus(val);
            matrix.defendingDefense = matrix.defendingDefense.plus(val);
            break;
          case 'att_def_boost_attacker_defender':
            matrix.attackingAttack = matrix.attackingAttack.plus(val);
            matrix.attackingDefense = matrix.attackingDefense.plus(val);
            matrix.defendingAttack = matrix.defendingAttack.plus(val);
            matrix.defendingDefense = matrix.defendingDefense.plus(val);
            break;
        }
      }
    }

    this.lastUpdated = Date.now();
    return {
      success: true,
      totalEntries: list.length,
      boosts: this.getAggregatedBoosts(),
    };
  }

  /**
   * Process BoostService.getTimerBoost RPC messages.
   * @param {Object} msg
   * @returns {Object}
   */
  getTimerBoost(msg) {
    const list =
      Array.isArray(msg?.responseData) ? msg.responseData
      : Array.isArray(msg?.responseData?.timerBoosts) ?
        msg.responseData.timerBoosts
      : [];

    this.timerBoosts = list.map((item) => ({
      type: item.type || '',
      value: new BigNumber(item.value || 0),
      expireTime: item.expireTime || 0,
      raw: item,
    }));

    return {
      success: true,
      count: this.timerBoosts.length,
      timerBoosts: this.timerBoosts,
    };
  }

  getTimerBoostSum(type, nowSeconds = Date.now() / 1000) {
    let sum = new BigNumber(0);
    for (const b of this.timerBoosts) {
      if (
        b.type === type &&
        (b.expireTime === 0 || b.expireTime > nowSeconds)
      ) {
        sum = sum.plus(b.value);
      }
    }
    return sum;
  }

  getTotalBoost(feature, combatType) {
    const base = this.features.all?.[combatType] || new BigNumber(0);
    if (feature === 'all' || !this.features[feature]) {
      return base;
    }
    const addon = this.features[feature][combatType] || new BigNumber(0);
    return base.plus(addon);
  }

  getAggregatedBoosts() {
    return {
      all: this.features.all,
      battleground: this.features.battleground,
      guild_expedition: this.features.guild_expedition,
      guild_raids: this.features.guild_raids,
      production: this.production,
    };
  }
}

const boostService = new BoostService();
if (messageDispatcher && typeof messageDispatcher.register === 'function') {
  boostService.register(messageDispatcher);
}

module.exports = {
  BoostService,
  boostService,
  getAllBoosts: boostService.getAllBoosts,
  getTimerBoost: boostService.getTimerBoost,
};
module.exports.default = boostService;
