/**
 * ArmyState.js
 *
 * Reactive state store for the Army panel. ArmyUnitManagementService publishes
 * the prepared render payload; the UI binding renders it.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('ArmyState');
} catch {}

class ArmyState {
  constructor({ logger: log = logger } = {}) {
    this.armyPanel = null;
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
   * @param {'army'|'all'} channel
   */
  notify(channel = 'army') {
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

  setArmyPanel(payload) {
    this.armyPanel = payload || null;
    this.notify('army');
  }

  getArmyPanel() {
    return this.armyPanel;
  }
}

const armyState = new ArmyState();

module.exports = { ArmyState, armyState };
module.exports.default = armyState;
