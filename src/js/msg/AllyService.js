/**
 * AllyService.js
 *
 * Decoupled domain service for Forge of Empires Historical Allies.
 * Handles AllyService.getAssignedAllies RPC payloads, tracking ally assignments,
 * levels, rarity tiers, and aggregating combat boost hints with BigNumber precision.
 */

const BigNumber = require('bignumber.js');
const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

const KNOWN_FEATURES = [
  'all',
  'battleground',
  'guild_expedition',
  'guild_raids',
];

function createBoostMatrix() {
  return {
    attackingAttack: new BigNumber(0),
    attackingDefense: new BigNumber(0),
    defendingAttack: new BigNumber(0),
    defendingDefense: new BigNumber(0),
  };
}

class AssignedAlly {
  constructor(raw = {}) {
    this.id = raw.id || 0;
    this.allyId = raw.allyId || '';
    this.rarity =
      raw.rarity?.value ||
      (typeof raw.rarity === 'string' ? raw.rarity : 'common');
    this.mapEntityId = raw.mapEntityId || 0;
    this.level = raw.level || raw.currentLevel?.level || 1;
    this.currentLevel = raw.currentLevel || null;
    this.nextLevel = raw.nextLevel || null;
    this.boosts = raw.currentLevel?.boosts || [];
    this.raw = raw;
  }
}

class AllyService {
  constructor() {
    this.assignedAllies = [];
    this.lastUpdated = null;

    this.getAssignedAllies = this.getAssignedAllies.bind(this);
  }

  /**
   * Register with a MessageDispatcher instance.
   * @param {Object} [dispatcher=messageDispatcher]
   * @returns {AllyService} this
   */
  register(dispatcher = messageDispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register(
        'AllyService',
        'getAssignedAllies',
        this.getAssignedAllies,
      );
    }
    return this;
  }

  /**
   * Handle AllyService.getAssignedAllies RPC messages.
   * @param {Object} msg
   * @returns {Object} parsing summary
   */
  getAssignedAllies(msg) {
    const list =
      Array.isArray(msg?.responseData) ? msg.responseData
      : Array.isArray(msg?.responseData?.assignedAllies) ?
        msg.responseData.assignedAllies
      : [];

    this.assignedAllies = list.map((item) => new AssignedAlly(item));
    this.lastUpdated = Date.now();

    return {
      success: true,
      total: this.assignedAllies.length,
      allies: this.assignedAllies,
    };
  }

  getAllies() {
    return this.assignedAllies;
  }

  getAllyById(id) {
    return this.assignedAllies.find((a) => a.id === id) || null;
  }

  getAlliesByAllyId(allyId) {
    return this.assignedAllies.filter((a) => a.allyId === allyId);
  }

  getAlliesByBuilding(mapEntityId) {
    return this.assignedAllies.filter((a) => a.mapEntityId === mapEntityId);
  }

  /**
   * Aggregate combat boosts provided by all assigned allies across features using BigNumber.
   * @returns {Object} map of feature -> boost matrix
   */
  getTotalAllyBoosts() {
    const totals = {};
    for (const f of KNOWN_FEATURES) {
      totals[f] = createBoostMatrix();
    }

    for (const ally of this.assignedAllies) {
      for (const boost of ally.boosts) {
        const feature = boost.targetedFeature || 'all';
        const val = new BigNumber(boost.value || 0);

        if (!totals[feature]) {
          totals[feature] = createBoostMatrix();
        }
        const matrix = totals[feature];

        switch (boost.type) {
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

    return totals;
  }
}

const allyService = new AllyService();
if (messageDispatcher && typeof messageDispatcher.register === 'function') {
  allyService.register(messageDispatcher);
}

module.exports = {
  AllyService,
  AssignedAlly,
  allyService,
  getAssignedAllies: allyService.getAssignedAllies,
};
module.exports.default = allyService;
