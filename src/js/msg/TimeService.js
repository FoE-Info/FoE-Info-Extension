/**
 * TimeService.js
 *
 * Decoupled domain service for Forge of Empires server clock synchronization.
 * Handles TimeService.updateTime and TimeService.getTime RPC payloads, calculating
 * client-server clock drift and providing accurate synchronized timestamps.
 */

const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

let defaultState = null;
let defaultHelper = null;
if (typeof __webpack_require__ !== 'undefined') {
  try {
    defaultState = require('../vars/state.js');
  } catch {}
  try {
    defaultHelper = require('../fn/helper.js');
  } catch {}
}

class TimeService {
  constructor(options = {}) {
    this.serverTime = 0;
    this.serverTimeDelta = 0;
    this.lastSync = null;
    this.onUpdateTimeCallbacks = [];
    this.state = options.state || null;
    this.helper = options.helper || null;

    this.updateTime = this.updateTime.bind(this);
    this.getTime = this.getTime.bind(this);
    this.onUpdateTime = this.onUpdateTime.bind(this);
    this.setState = this.setState.bind(this);
    this.setHelper = this.setHelper.bind(this);
  }

  onUpdateTime(callback) {
    if (typeof callback === 'function') {
      this.onUpdateTimeCallbacks.push(callback);
    }
    return this;
  }

  setState(state) {
    this.state = state;
    return this;
  }

  setHelper(helper) {
    this.helper = helper;
    return this;
  }

  register(dispatcher = messageDispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register('TimeService', 'updateTime', this.updateTime);
      dispatcher.register('TimeService', 'getTime', this.getTime);
    }
    return this;
  }

  updateTime(msg) {
    const rawTime =
      typeof msg?.responseData === 'number' ?
        msg.responseData
      : msg?.responseData?.time || 0;

    const nowSeconds = Math.floor(Date.now() / 1000);
    this.serverTime = rawTime;
    this.serverTimeDelta = rawTime - nowSeconds;
    this.lastSync = Date.now();

    const targetState = this.state || defaultState;
    if (targetState && typeof targetState.setEpocTime === 'function') {
      targetState.setEpocTime(rawTime);
    }

    const targetHelper = this.helper || defaultHelper;
    if (targetHelper && typeof targetHelper.fShowIncidents === 'function') {
      targetHelper.fShowIncidents();
    }

    for (const cb of this.onUpdateTimeCallbacks) {
      try {
        cb(rawTime);
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('[TimeService] onUpdateTime callback error:', err);
        }
      }
    }

    return {
      success: true,
      serverTime: this.serverTime,
      deltaSeconds: this.serverTimeDelta,
      syncedNow: this.getSyncedServerTime(),
    };
  }

  getTime(msg) {
    return this.updateTime(msg);
  }

  getServerTime() {
    return this.serverTime;
  }

  getTimeDelta() {
    return this.serverTimeDelta;
  }

  getSyncedServerTime(clientNowMs = Date.now()) {
    const clientSeconds = Math.floor(clientNowMs / 1000);
    return clientSeconds + this.serverTimeDelta;
  }

  getSyncedServerDate(clientNowMs = Date.now()) {
    return new Date(this.getSyncedServerTime(clientNowMs) * 1000);
  }

  formatServerTime(clientNowMs = Date.now()) {
    return this.getSyncedServerDate(clientNowMs).toISOString();
  }
}

const timeService = new TimeService();
if (messageDispatcher && typeof messageDispatcher.register === 'function') {
  timeService.register(messageDispatcher);
}

module.exports = {
  TimeService,
  timeService,
  updateTime: timeService.updateTime,
  getTime: timeService.getTime,
};
module.exports.default = timeService;
