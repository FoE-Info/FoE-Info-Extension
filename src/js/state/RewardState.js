/**
 * RewardState.js
 *
 * Reactive state store for the shared reward pipeline. Producers
 * (CityProductionService, QuestService, ...) publish `{ source, payload }`
 * entries; the UI binding routes them through the unified showReward renderer.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('RewardState');
} catch {}

class RewardState {
  constructor({ logger: log = logger } = {}) {
    this.reward = null;
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
   * @param {'reward'|'all'} channel
   */
  notify(channel = 'reward') {
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

  setReward(entry) {
    this.reward = entry || null;
    this.notify('reward');
  }

  getReward() {
    return this.reward;
  }
}

const rewardState = new RewardState();

module.exports = { RewardState, rewardState };
module.exports.default = rewardState;
