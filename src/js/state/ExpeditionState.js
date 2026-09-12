/**
 * ExpeditionState.js
 *
 * Reactive state store for the Guild Expedition panel. GuildExpeditionService
 * publishes parsed international/contribution entries; the UI binding renders
 * them. Caches replace the former module-level service caches so tests can
 * reset deterministically via reset().
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('ExpeditionState');
} catch {}

class ExpeditionState {
  constructor({ logger: log = logger } = {}) {
    this.internationalEntries = null;
    this.contributionEntries = null;
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
   * @param {'international'|'contribution'|'all'} channel
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

  setInternationalEntries(entries) {
    this.internationalEntries = Array.isArray(entries) ? entries : [];
    this.notify('international');
  }

  getInternationalEntries() {
    return this.internationalEntries;
  }

  setContributionEntries(entries) {
    this.contributionEntries = Array.isArray(entries) ? entries : [];
    this.notify('contribution');
  }

  getContributionEntries() {
    return this.contributionEntries;
  }

  /** Clear cached entries without notifying (used by tests and route resets). */
  reset() {
    this.internationalEntries = null;
    this.contributionEntries = null;
  }
}

const expeditionState = new ExpeditionState();

module.exports = { ExpeditionState, expeditionState };
module.exports.default = expeditionState;
