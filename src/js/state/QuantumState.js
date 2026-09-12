/**
 * QuantumState.js
 *
 * Reactive state store for Quantum Incursions (QI). Domain services publish
 * member-activity and leaderboard updates; UI renderers subscribe and repaint,
 * mirroring the BlueGalaxyState notify() pattern.
 */

class QuantumState {
  constructor() {
    this.members = [];
    this.leaderboard = [];
    this.lastSaved = null;
    this.subscribers = new Set();
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
      } catch {}
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

const quantumState = new QuantumState();

module.exports = {
  QuantumState,
  quantumState,
};
module.exports.default = quantumState;
