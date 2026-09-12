/**
 * IncidentState.js
 *
 * Reactive state store for city incidents and server time synchronization.
 * HiddenRewardService and TimeService publish updates;
 * UI render bindings subscribe and repaint #incidents.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('IncidentState');
} catch {}

class IncidentState {
  constructor({ logger: log = logger } = {}) {
    this.incidents = [];
    this.serverTime = 0;
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
   * @param {'incidents'|'serverTime'|'all'} channel
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

  setIncidents(incidents) {
    this.incidents = Array.isArray(incidents) ? incidents : [];
    this.notify('incidents');
  }

  getIncidents() {
    return this.incidents;
  }

  setServerTime(time) {
    this.serverTime = Number(time) || 0;
    this.notify('serverTime');
  }

  getServerTime() {
    return this.serverTime;
  }
}

const incidentState = new IncidentState();

module.exports = { IncidentState, incidentState };
module.exports.default = incidentState;
