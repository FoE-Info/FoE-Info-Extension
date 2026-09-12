/**
 * TreasuryState.js
 *
 * Reactive state store for the Guild Treasury. TreasuryService publishes reserves
 * and log/totals payloads; UI renderers subscribe and repaint, matching the
 * BlueGalaxyState / StartupRenderState notify() pattern.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('TreasuryState');
} catch {}

class TreasuryState {
  constructor({ logger: log = logger } = {}) {
    this.reserves = null;
    this.logs = [];
    this.totals = null;
    this.showTreasury = true;
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
   * @param {'reserves'|'logs'|'all'} channel
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

  setReserves(reserves) {
    this.reserves = reserves || null;
    this.notify('reserves');
  }

  setLogs(logs, totals, options = {}) {
    this.logs = Array.isArray(logs) ? logs : [];
    this.totals = totals || null;
    if (options.showTreasury !== undefined) {
      this.showTreasury = options.showTreasury !== false;
    }
    this.notify('logs');
  }

  getReserves() {
    return this.reserves;
  }

  getLogs() {
    return this.logs;
  }

  getTotals() {
    return this.totals;
  }

  getShowTreasury() {
    return this.showTreasury;
  }
}

const treasuryState = new TreasuryState();

module.exports = { TreasuryState, treasuryState };
module.exports.default = treasuryState;
