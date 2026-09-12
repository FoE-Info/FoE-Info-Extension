/**
 * VisitedCityState.js
 *
 * Reactive state store for the visited-player city card. OtherPlayerService
 * publishes the prepared render payload; the UI binding renders it.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('VisitedCityState');
} catch {}

class VisitedCityState {
  constructor({ logger: log = logger } = {}) {
    this.visit = null;
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
   * @param {'visit'|'all'} channel
   */
  notify(channel = 'visit') {
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

  setVisit(payload) {
    this.visit = payload || null;
    this.notify('visit');
  }

  getVisit() {
    return this.visit;
  }
}

const visitedCityState = new VisitedCityState();

module.exports = { VisitedCityState, visitedCityState };
module.exports.default = visitedCityState;
