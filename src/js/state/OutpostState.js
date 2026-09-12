/**
 * OutpostState.js
 *
 * Reactive state store for the Cultural Settlement panel. OutpostService
 * publishes the resolved settlement/advancements/costs; the UI binding renders.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('OutpostState');
} catch {}

class OutpostState {
  constructor({ logger: log = logger } = {}) {
    this.culturalPanel = null;
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
   * @param {'cultural'|'all'} channel
   */
  notify(channel = 'cultural') {
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

  setCulturalPanel(payload) {
    this.culturalPanel = payload || null;
    this.notify('cultural');
  }

  getCulturalPanel() {
    return this.culturalPanel;
  }
}

const outpostState = new OutpostState();

module.exports = { OutpostState, outpostState };
module.exports.default = outpostState;
