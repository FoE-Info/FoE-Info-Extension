/**
 * CastleSystemService.js
 *
 * Decoupled domain service for Forge of Empires Castle System.
 * Handles CastleSystemService.getOverview and CastleSystemService.getCastleSystemPlayer
 * RPC payloads, tracking castle level, next point thresholds, and daily reward collection timestamps.
 */

const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

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
}

const castleSystemService = new CastleSystemService();
if (messageDispatcher && typeof messageDispatcher.register === 'function') {
  castleSystemService.register(messageDispatcher);
}

module.exports = {
  CastleSystemService,
  castleSystemService,
  getOverview: castleSystemService.getOverview,
  getCastleSystemPlayer: castleSystemService.getCastleSystemPlayer,
};
module.exports.default = castleSystemService;
