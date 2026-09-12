/**
 * GreatBuildingsState.js
 *
 * Reactive state store for the Great Buildings panels (contributors, info, and
 * donation). GreatBuildingsService publishes prepared render payloads; the UI
 * binding renders them.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GreatBuildingsState');
} catch {}

class GreatBuildingsState {
  constructor({ logger: log = logger } = {}) {
    this.donors = null;
    this.info = null;
    this.donation = null;
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
   * @param {'donors'|'info'|'donation'|'all'} channel
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

  setDonors(payload) {
    this.donors = payload || null;
    this.notify('donors');
  }

  getDonors() {
    return this.donors;
  }

  setInfo(payload) {
    this.info = payload || null;
    this.notify('info');
  }

  getInfo() {
    return this.info;
  }

  setDonation(payload) {
    this.donation = payload || null;
    this.notify('donation');
  }

  getDonation() {
    return this.donation;
  }
}

const greatBuildingsState = new GreatBuildingsState();

module.exports = { GreatBuildingsState, greatBuildingsState };
module.exports.default = greatBuildingsState;
