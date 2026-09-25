/**
 * GreatBuildingDomainState.js
 *
 * Unified reactive state domain for Great Buildings:
 * - GreatBuildingsState (overview, info, donors, donation)
 * - GbDonationState (reward notifications)
 * - InvestedState (player contribution tracking & Arc returns)
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GreatBuildingDomainState');
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

class GreatBuildingDomainState {
  constructor({ logger: log = logger } = {}) {
    this.greatBuildings = new GreatBuildingsState({ logger: log });
    this.donation = new GbDonationState({ logger: log });
    this.invested = new InvestedState({ logger: log });
  }
}

const greatBuildingsState = new GreatBuildingsState();
const gbDonationState = new GbDonationState();
const investedState = new InvestedState();
const greatBuildingDomainState = new GreatBuildingDomainState();

module.exports = {
  GreatBuildingsState,
  greatBuildingsState,
  GbDonationState,
  gbDonationState,
  InvestedState,
  investedState,
  GreatBuildingDomainState,
  greatBuildingDomainState,
};
module.exports.default = greatBuildingDomainState;
