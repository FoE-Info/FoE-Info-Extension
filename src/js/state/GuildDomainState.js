/**
 * GuildDomainState.js
 *
 * Unified reactive state domain for guild features:
 * - GuildBattlegroundState (GBG targets, results, leaderboards, province buildings)
 * - ExpeditionState (GE contributions & international rankings)
 * - QuantumState (QI member activity & leaderboards)
 * - TreasuryState (Guild treasury reserves, logs, totals)
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GuildDomainState');
} catch {}

class GuildBattlegroundState {
  constructor({ logger: log = logger } = {}) {
    this.targets = null;
    this.result = null;
    this.leaderboard = null;
    this.province = null;
    this.performance = null;
    this.targetMessageActive = false;
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
   * @param {'targets'|'result'|'leaderboard'|'province'|'performance'|'all'} channel
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

  setTargets(payload) {
    this.targets = payload || null;
    this.notify('targets');
  }

  setTargetMessageActive(active) {
    this.targetMessageActive = Boolean(active);
  }

  isTargetMessageActive() {
    return this.targetMessageActive;
  }

  getTargets() {
    return this.targets;
  }

  setResult(payload) {
    this.result = payload || null;
    this.notify('result');
  }

  getResult() {
    return this.result;
  }

  setLeaderboard(payload) {
    this.leaderboard = payload || null;
    this.notify('leaderboard');
  }

  getLeaderboard() {
    return this.leaderboard;
  }

  setProvince(payload) {
    this.province = payload || null;
    this.notify('province');
  }

  getProvince() {
    return this.province;
  }

  setPerformance(payload) {
    this.performance = payload || null;
    this.notify('performance');
  }

  getPerformance() {
    return this.performance;
  }
}

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

  reset() {
    this.internationalEntries = null;
    this.contributionEntries = null;
  }
}

class QuantumState {
  constructor({ logger: log = logger } = {}) {
    this.members = [];
    this.leaderboard = [];
    this.lastSaved = null;
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
   * @param {'members'|'leaderboard'|'all'} changed
   */
  notify(changed = 'all') {
    for (const fn of this.subscribers) {
      try {
        fn(this, changed);
      } catch (err) {
        this.logger?.error?.('Reactive subscriber failed', {
          changed,
          error: err?.message || String(err),
        });
      }
    }
  }

  setMemberActivity(members, savedAt = Date.now()) {
    this.members = Array.isArray(members) ? members : [];
    this.lastSaved = savedAt;
    this.notify('members');
  }

  setLeaderboard(rankings) {
    this.leaderboard = Array.isArray(rankings) ? rankings : [];
    this.notify('leaderboard');
  }

  getMemberActivity() {
    return this.members;
  }

  getLeaderboard() {
    return this.leaderboard;
  }

  getLastSaved() {
    return this.lastSaved;
  }
}

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

class GuildDomainState {
  constructor({ logger: log = logger } = {}) {
    this.battleground = new GuildBattlegroundState({ logger: log });
    this.expedition = new ExpeditionState({ logger: log });
    this.quantum = new QuantumState({ logger: log });
    this.treasury = new TreasuryState({ logger: log });
  }
}

const guildBattlegroundState = new GuildBattlegroundState();
const expeditionState = new ExpeditionState();
const quantumState = new QuantumState();
const treasuryState = new TreasuryState();
const guildDomainState = new GuildDomainState();

module.exports = {
  GuildBattlegroundState,
  guildBattlegroundState,
  ExpeditionState,
  expeditionState,
  QuantumState,
  quantumState,
  TreasuryState,
  treasuryState,
  GuildDomainState,
  guildDomainState,
};
module.exports.default = guildDomainState;
