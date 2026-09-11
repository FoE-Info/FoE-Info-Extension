/**
 * CastleSystemService.js
 *
 * Decoupled domain service for Forge of Empires Castle System.
 * Handles CastleSystemService.getOverview and CastleSystemService.getCastleSystemPlayer
 * RPC payloads, tracking castle level, next point thresholds, and daily reward collection timestamps.
 */

const { messageDispatcher } = require('../protocol/MessageDispatcher.js');
const {
  getCastleBoostsForStage,
} = require('../calc/boosts/CastleBoostCalculator.js');

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('CastleSystemService');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

class CastleSystemService {
  constructor() {
    this.level = 0;
    this.nextCastlePoints = null;
    this.dailyPointsCollectionAvailableAt = 0;
    this.dailyBonusPointsCollectionAvailableAt = 0;
    this.dailyRewardCollectionAvailableAt = 0;
    this.lastUpdated = null;

    this.getOverview = this.getOverview.bind(this);
    this.getCastleSystemPlayer = this.getCastleSystemPlayer.bind(this);
  }

  /**
   * Register with a MessageDispatcher instance.
   * @param {Object} [dispatcher=messageDispatcher]
   * @returns {CastleSystemService} this
   */
  register(dispatcher = messageDispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register(
        'CastleSystemService',
        'getOverview',
        this.getOverview,
      );
      dispatcher.register(
        'CastleSystemService',
        'getCastleSystemPlayer',
        this.getCastleSystemPlayer,
      );
    }
    return this;
  }

  /**
   * Handle CastleSystemService.getOverview RPC messages.
   * @param {Object} msg
   * @returns {Object} parsing summary
   */
  getOverview(msg) {
    const data = msg?.responseData || {};
    this.dailyPointsCollectionAvailableAt =
      data.dailyPointsCollectionAvailableAt || 0;
    this.dailyBonusPointsCollectionAvailableAt =
      data.dailyBonusPointsCollectionAvailableAt || 0;
    this.dailyRewardCollectionAvailableAt =
      data.dailyRewardCollectionAvailableAt || 0;
    this.lastUpdated = Date.now();

    logger.debug('getOverview parsed', {
      dailyPointsCollectionAvailableAt: this.dailyPointsCollectionAvailableAt,
      dailyBonusPointsCollectionAvailableAt:
        this.dailyBonusPointsCollectionAvailableAt,
      dailyRewardCollectionAvailableAt: this.dailyRewardCollectionAvailableAt,
    });

    return {
      success: true,
      dailyPointsCollectionAvailableAt: this.dailyPointsCollectionAvailableAt,
      dailyBonusPointsCollectionAvailableAt:
        this.dailyBonusPointsCollectionAvailableAt,
      dailyRewardCollectionAvailableAt: this.dailyRewardCollectionAvailableAt,
    };
  }

  /**
   * Handle CastleSystemService.getCastleSystemPlayer RPC messages.
   * @param {Object} msg
   * @returns {Object} parsing summary
   */
  getCastleSystemPlayer(msg) {
    const data = msg?.responseData || {};
    this.level = typeof data.level === 'number' ? data.level : 0;
    this.nextCastlePoints = data.nextCastlePoints || null;
    this.lastUpdated = Date.now();

    logger.debug('getCastleSystemPlayer parsed', {
      level: this.level,
      nextCastlePoints: this.nextCastlePoints,
    });

    return {
      success: true,
      level: this.level,
      nextCastlePoints: this.nextCastlePoints,
    };
  }

  getLevel() {
    return this.level;
  }

  getNextCastlePoints() {
    return this.nextCastlePoints;
  }

  isDailyRewardAvailable(nowSeconds = Date.now() / 1000) {
    return (
      this.dailyRewardCollectionAvailableAt > 0 &&
      nowSeconds >= this.dailyRewardCollectionAvailableAt
    );
  }

  isDailyPointsAvailable(nowSeconds = Date.now() / 1000) {
    return (
      this.dailyPointsCollectionAvailableAt > 0 &&
      nowSeconds >= this.dailyPointsCollectionAvailableAt
    );
  }

  isDailyBonusPointsAvailable(nowSeconds = Date.now() / 1000) {
    return (
      this.dailyBonusPointsCollectionAvailableAt > 0 &&
      nowSeconds >= this.dailyBonusPointsCollectionAvailableAt
    );
  }

  getSummary() {
    return {
      level: this.level,
      nextCastlePoints: this.nextCastlePoints,
      dailyPointsCollectionAvailableAt: this.dailyPointsCollectionAvailableAt,
      dailyBonusPointsCollectionAvailableAt:
        this.dailyBonusPointsCollectionAvailableAt,
      dailyRewardCollectionAvailableAt: this.dailyRewardCollectionAvailableAt,
      lastUpdated: this.lastUpdated,
    };
  }

  /**
   * Get estimated military boosts for a Castle System visual stage (0-7).
   * Used for visited players where exact level is not exposed by InnoGames RPC.
   *
   * @param {number|string} stage Visual stage 0-7
   * @returns {{ attackerAtt: number, attackerDef: number, defenderAtt: number, defenderDef: number }}
   */
  getBoostsForStage(stage) {
    const s = parseInt(stage, 10);
    const boosts = getCastleBoostsForStage(s);
    if (!boosts) {
      logger.debug('getBoostsForStage unknown stage', { stage });
      return null;
    }
    logger.debug('getBoostsForStage resolved', {
      stage: s,
      boost: boosts.attackerAtt,
    });
    return boosts;
  }

  /**
   * Resolve Castle System boosts for an entity on a city map.
   *
   * @param {Object} entity CityMap entity
   * @returns {{ attackerAtt: number, attackerDef: number, defenderAtt: number, defenderDef: number }|null}
   */
  getBoostsForEntity(entity) {
    if (!entity?.cityentity_id) return null;
    const match = entity.cityentity_id.match(/CastleSystem(\d+)/);
    if (!match) return null;
    return getCastleBoostsForStage(parseInt(match[1], 10));
  }
}

const castleSystemService = new CastleSystemService();

module.exports = {
  CastleSystemService,
  castleSystemService,
  getOverview: castleSystemService.getOverview,
  getCastleSystemPlayer: castleSystemService.getCastleSystemPlayer,
  getBoostsForStage:
    castleSystemService.getBoostsForStage.bind(castleSystemService),
  getBoostsForEntity:
    castleSystemService.getBoostsForEntity.bind(castleSystemService),
};
module.exports.default = castleSystemService;
