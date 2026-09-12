/**
 * InvestedState.js
 *
 * Reactive state store for the invested-contributions panel.
 * InvestedService publishes the parsed contributions list and Arc bonus; the UI
 * binding renders them.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('InvestedState');
} catch {}

class InvestedState {
  constructor({ logger: log = logger } = {}) {
    this.contributions = null;
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
   * @param {'contributions'|'all'} channel
   */
  notify(channel = 'contributions') {
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

  setContributions(payload) {
    this.contributions = payload || null;
    this.notify('contributions');
  }

  getContributions() {
    return this.contributions;
  }
}

const investedState = new InvestedState();

module.exports = { InvestedState, investedState };
module.exports.default = investedState;
