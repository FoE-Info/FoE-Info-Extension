/**
 * StartupRenderState.js
 *
 * Reactive render-intent store for StartupService. The RPC/service layer
 * publishes city-stats and building-collection payloads; UI renderers subscribe
 * and repaint, matching the BlueGalaxyState / QuantumState notify() pattern.
 */

class StartupRenderState {
  constructor() {
    this.subscribers = new Set();
    this.cityStatsContext = null;
    this.buildingCollectionOptions = null;
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
   * @param {'city-stats'|'building-collection'|'all'} channel
   */
  notify(channel = 'all') {
    for (const fn of this.subscribers) {
      try {
        fn(this, channel);
      } catch {}
    }
  }

  setCityStatsContext(context) {
    this.cityStatsContext = context || null;
    this.notify('city-stats');
  }

  setBuildingCollectionOptions(options) {
    this.buildingCollectionOptions = options || null;
    this.notify('building-collection');
  }

  getCityStatsContext() {
    return this.cityStatsContext;
  }

  getBuildingCollectionOptions() {
    return this.buildingCollectionOptions;
  }
}

const startupRenderState = new StartupRenderState();

module.exports = { StartupRenderState, startupRenderState };
module.exports.default = startupRenderState;
