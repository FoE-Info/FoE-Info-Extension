/**
 * GbDonationState.js
 *
 * Reactive state store for Great Buildings reward notifications.
 * GbDonationService publishes prepared reward payloads; the UI binding renders
 * them.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GbDonationState');
} catch {}

class GbDonationState {
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

  setReward(payload) {
    this.reward = payload || null;
    this.notify('reward');
  }

  getReward() {
    return this.reward;
  }
}

const gbDonationState = new GbDonationState();

module.exports = { GbDonationState, gbDonationState };
module.exports.default = gbDonationState;
