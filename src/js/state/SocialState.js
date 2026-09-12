/**
 * SocialState.js
 *
 * Reactive state store for the player's social lists (friends, guild members,
 * neighbours). OtherPlayerService publishes the latest lists; UI consumers read
 * the live values instead of snapshotting the service.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('SocialState');
} catch {}

class SocialState {
  constructor({ logger: log = logger } = {}) {
    this.friends = [];
    this.guildMembers = [];
    this.hoodlist = [];
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

  setLists({ friends, guildMembers, hoodlist } = {}) {
    if (Array.isArray(friends)) this.friends = friends;
    if (Array.isArray(guildMembers)) this.guildMembers = guildMembers;
    if (Array.isArray(hoodlist)) this.hoodlist = hoodlist;
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
}

const socialState = new SocialState();

module.exports = { SocialState, socialState };
module.exports.default = socialState;
