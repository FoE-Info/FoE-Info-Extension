/**
 * ResourceState.js
 *
 * Reactive state store for the ResourceService goods inventory and resource
 * panel. The service resolves the goods render payload, FP balance, globals,
 * and clear/dismiss signals; the UI binding executes them.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('ResourceState');
} catch {}

class ResourceState {
  constructor({ logger: log = logger } = {}) {
    this.goodsRender = null;
    this.availablePacksFP = null;
    this.globals = null;
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
   * @param {'goods'|'fp'|'globals'|'clear'|'all'} channel
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

  renderGoods(payload) {
    this.goodsRender = payload || null;
    this.notify('goods');
  }

  getGoodsRender() {
    return this.goodsRender;
  }

  setAvailableForgePoints(value) {
    this.availablePacksFP = value;
    this.notify('fp');
  }

  getAvailableForgePoints() {
    return this.availablePacksFP;
  }

  setGlobals(globals) {
    this.globals = globals || null;
    this.notify('globals');
  }

  getGlobals() {
    return this.globals;
  }

  requestClearGoods() {
    this.notify('clear');
  }
}

const resourceState = new ResourceState();

module.exports = { ResourceState, resourceState };
module.exports.default = resourceState;
