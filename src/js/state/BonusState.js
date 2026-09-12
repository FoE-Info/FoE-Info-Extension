/**
 * BonusState.js
 *
 * Reactive state store for the server-boost Bonus panel. BonusService publishes
 * parsed limited-bonus totals; the UI binding replays them to the panel.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('BonusState');
} catch {}

class BonusState {
  constructor({ logger: log = logger } = {}) {
    this.bonusHTML = '';
    this.aid = 0;
    this.spoils = 0;
    this.diplomatic = 0;
    this.strike = 0;
    this.dailyForgePoints = null;
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
   * @param {'bonus'|'all'} channel
   */
  notify(channel = 'bonus') {
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

  setSummary({
    bonusHTML = '',
    aid = 0,
    spoils = 0,
    diplomatic = 0,
    strike = 0,
    dailyForgePoints = null,
  } = {}) {
    this.bonusHTML = bonusHTML;
    this.aid = aid;
    this.spoils = spoils;
    this.diplomatic = diplomatic;
    this.strike = strike;
    this.dailyForgePoints = dailyForgePoints;
    this.notify('bonus');
  }

  getBonusHTML() {
    return this.bonusHTML;
  }

  getSummary() {
    return {
      aid: this.aid,
      spoils: this.spoils,
      diplomatic: this.diplomatic,
      strike: this.strike,
    };
  }

  getAid() {
    return this.aid;
  }

  getSpoils() {
    return this.spoils;
  }

  getDiplomatic() {
    return this.diplomatic;
  }

  getStrike() {
    return this.strike;
  }

  getDailyForgePoints() {
    return this.dailyForgePoints;
  }
}

const bonusState = new BonusState();

module.exports = { BonusState, bonusState };
module.exports.default = bonusState;
