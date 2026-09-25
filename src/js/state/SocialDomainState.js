/**
 * SocialDomainState.js
 *
 * Unified reactive state domain for social interactions:
 * - SocialState (friends, guild members, neighbours lists)
 * - VisitedCityState (visited-player city overview & buildings)
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('SocialDomainState');
} catch {}

class SocialState {
  constructor({ logger: log = logger } = {}) {
    this.friends = [];
    this.guildMembers = [];
    this.hoodlist = [];
    this.options = {};
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
   * @param {'lists'|'all'} channel
   */
  notify(channel = 'lists') {
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

  setLists({ friends, guildMembers, hoodlist, options } = {}) {
    if (Array.isArray(friends)) this.friends = friends;
    if (Array.isArray(guildMembers)) this.guildMembers = guildMembers;
    if (Array.isArray(hoodlist)) this.hoodlist = hoodlist;
    if (options && typeof options === 'object') this.options = options;
    this.notify('lists');
  }

  getFriends() {
    return this.friends;
  }

  getGuildMembers() {
    return this.guildMembers;
  }

  getHoodlist() {
    return this.hoodlist;
  }

  getOptions() {
    return this.options;
  }
}

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

class SocialDomainState {
  constructor({ logger: log = logger } = {}) {
    this.social = new SocialState({ logger: log });
    this.visitedCity = new VisitedCityState({ logger: log });
  }
}

const socialState = new SocialState();
const visitedCityState = new VisitedCityState();
const socialDomainState = new SocialDomainState();

module.exports = {
  SocialState,
  socialState,
  VisitedCityState,
  visitedCityState,
  SocialDomainState,
  socialDomainState,
};
module.exports.default = socialDomainState;
