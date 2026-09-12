/**
 * GuildBattlegroundState.js
 *
 * Reactive state store for the Guild Battlegrounds panels.
 * GuildBattlegroundService publishes prepared targets/result/leaderboard/
 * building-cost payloads; the UI binding renders them.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GuildBattlegroundState');
} catch {}

class GuildBattlegroundState {
  constructor({ logger: log = logger } = {}) {
    this.targets = null;
    this.result = null;
    this.leaderboard = null;
    this.province = null;
    this.performance = null;
    this.subscribers = new Set();
    this.logger = log;
  }

  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  unsubscribe(fn) {
    this.subscribers.delete(fn);
  }

  /**
   * @param {'targets'|'result'|'leaderboard'|'province'|'performance'|'all'} channel
   */
  notify(channel = 'all') {
    for (const fn of this.subscribers) {
      try {
        fn(this, channel);
      } catch (err) {
        this.logger?.error?.('Reactive subscriber failed', {
          channel,
          error: err?.message || String(err),
        });
      }
    }
  }

  setTargets(payload) {
    this.targets = payload || null;
    this.notify('targets');
  }

  getTargets() {
    return this.targets;
  }

  setResult(payload) {
    this.result = payload || null;
    this.notify('result');
  }

  getResult() {
    return this.result;
  }

  setLeaderboard(payload) {
    this.leaderboard = payload || null;
    this.notify('leaderboard');
  }

  getLeaderboard() {
    return this.leaderboard;
  }

  setProvince(payload) {
    this.province = payload || null;
    this.notify('province');
  }

  getProvince() {
    return this.province;
  }

  setPerformance(payload) {
    this.performance = payload || null;
    this.notify('performance');
  }

  getPerformance() {
    return this.performance;
  }
}

const guildBattlegroundState = new GuildBattlegroundState();

module.exports = { GuildBattlegroundState, guildBattlegroundState };
module.exports.default = guildBattlegroundState;
