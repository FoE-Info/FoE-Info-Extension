/**
 * FriendsTavernService.js
 *
 * Decoupled domain service for Forge of Empires Friends Tavern.
 * Handles FriendsTavernService.getOtherTavernStates and FriendsTavernService.getSittingPlayersCount,
 * tracking visiting availability, chair capacities, and players currently sitting in the tavern.
 */

const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

class OtherTavernState {
  constructor(raw = {}) {
    this.ownerId = raw.ownerId || 0;
    this.state = raw.state || 'noChair';
    this.unlockedChairCount = raw.unlockedChairCount || 0;
    this.sittingPlayerCount = raw.sittingPlayerCount || 0;
    this.raw = raw;
  }

  canSit() {
    return (
      this.state === 'canSit' ||
      (this.state !== 'noChair' &&
        this.state !== 'satDown' &&
        this.state !== 'alreadyVisited' &&
        this.sittingPlayerCount < this.unlockedChairCount)
    );
  }

  getAvailableSeats() {
    return Math.max(0, this.unlockedChairCount - this.sittingPlayerCount);
  }
}

class FriendsTavernService {
  constructor() {
    this.otherTavernStates = new Map();
    this.sittingPlayers = [];
    this.lastUpdated = null;

    this.getOtherTavernStates = this.getOtherTavernStates.bind(this);
    this.getSittingPlayersCount = this.getSittingPlayersCount.bind(this);
  }

  register(dispatcher = messageDispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register(
        'FriendsTavernService',
        'getOtherTavernStates',
        this.getOtherTavernStates,
      );
      dispatcher.register(
        'FriendsTavernService',
        'getSittingPlayersCount',
        this.getSittingPlayersCount,
      );
    }
    return this;
  }

  getOtherTavernStates(msg) {
    const rawList =
      Array.isArray(msg?.responseData) ? msg.responseData
      : Array.isArray(msg?.responseData?.states) ? msg.responseData.states
      : [];

    this.otherTavernStates.clear();
    for (const item of rawList) {
      const stateObj = new OtherTavernState(item);
      this.otherTavernStates.set(stateObj.ownerId, stateObj);
    }
    this.lastUpdated = Date.now();

    return {
      success: true,
      total: this.otherTavernStates.size,
      sitReadyCount: this.getSitReadyCount(),
      states: Array.from(this.otherTavernStates.values()),
    };
  }

  getSittingPlayersCount(msg) {
    const rawList =
      Array.isArray(msg?.responseData) ? msg.responseData
      : typeof msg?.responseData === 'number' ? [msg.responseData]
      : [];

    this.sittingPlayers = rawList;
    this.lastUpdated = Date.now();

    return {
      success: true,
      count: this.sittingPlayers.length,
      players: this.sittingPlayers,
    };
  }

  getTavernState(ownerId) {
    return this.otherTavernStates.get(ownerId) || null;
  }

  getAllTavernStates() {
    return Array.from(this.otherTavernStates.values());
  }

  getSitReadyCount() {
    let count = 0;
    for (const s of this.otherTavernStates.values()) {
      if (s.canSit()) count++;
    }
    return count;
  }

  getStateBreakdown() {
    const breakdown = {};
    for (const s of this.otherTavernStates.values()) {
      breakdown[s.state] = (breakdown[s.state] || 0) + 1;
    }
    return breakdown;
  }

  getSittingPlayers() {
    return this.sittingPlayers;
  }

  getSittingCount() {
    return this.sittingPlayers.length;
  }
}

const friendsTavernService = new FriendsTavernService();

module.exports = {
  FriendsTavernService,
  OtherTavernState,
  friendsTavernService,
  getOtherTavernStates: friendsTavernService.getOtherTavernStates,
  getSittingPlayersCount: friendsTavernService.getSittingPlayersCount,
};
module.exports.default = friendsTavernService;
