/**
 * EmissaryService.js
 *
 * Decoupled domain service for Forge of Empires Cultural Settlement Emissaries.
 * Handles EmissaryService.getOverview and EmissaryService.getAssigned RPC payloads,
 * tracking emissary bonuses (Strategy Points, Military Units) and updating City stats.
 */

const { City } = require('../state/CityState.js');
const { createLogger } = require('../utils/logger.js');

const logger = createLogger('EmissaryService');

class EmissaryService {
  constructor() {
    this.emissaries = [];
    this.emissaryFp = 0;
    this.emissaryUnits = 0;

    this.handleEmissaries = this.handleEmissaries.bind(this);
  }

  register(dispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register(
        'EmissaryService',
        'getOverview',
        this.handleEmissaries,
      );
      dispatcher.register(
        'EmissaryService',
        'getAssigned',
        this.handleEmissaries,
      );
    }
    return this;
  }

  handleEmissaries(msg) {
    logger.debug('handleEmissaries payload received', msg);

    const list = Array.isArray(msg?.responseData) ? msg.responseData : [];
    this.emissaries = list;

    let fp = 0;
    let units = 0;

    for (let j = 0; j < list.length; j++) {
      const b = list[j]?.bonus;
      if (!b) continue;
      if (b.subType === 'strategy_points') {
        fp += b.amount || 0;
      } else if (b.type === 'unit') {
        units += b.amount || 0;
      }
    }

    this.emissaryFp = fp;
    this.emissaryUnits = units;

    City.emissaryFp = fp;
    City.emissaryUnits = units;
    City.TrazUnits = (City.baseUnits || 0) + (City.emissaryUnits || 0);

    try {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const liveStatsModule = require('../ui/renderLiveCityStats.js');
        if (typeof liveStatsModule?.renderLiveCityStats === 'function') {
          liveStatsModule.renderLiveCityStats();
        }
      }
    } catch {
      // Non-browser or mock testing environment
    }

    return {
      emissaryFp: fp,
      emissaryUnits: units,
      totalUnits: City.TrazUnits,
    };
  }
}

const emissaryServiceInstance = new EmissaryService();

function emissaryService(msg) {
  return emissaryServiceInstance.handleEmissaries(msg);
}

module.exports = {
  EmissaryService,
  emissaryServiceInstance,
  emissaryService,
};
module.exports.default = emissaryServiceInstance;
