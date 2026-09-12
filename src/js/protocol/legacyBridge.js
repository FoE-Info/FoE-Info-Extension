/**
 * legacyBridge.js
 *
 * Bridge connecting legacy FoE-Info service handlers to MessageDispatcher.
 * Delegates handler registration to the protocol/routes/* route tables.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('LegacyBridge');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

const defaultGbRegistry = require('../state/GreatBuildingRegistry.js');
const { registerCityRoutes } = require('./routes/cityRoutes.js');
const { registerBuildingRoutes } = require('./routes/buildingRoutes.js');
const { registerSocialRoutes } = require('./routes/socialRoutes.js');
const { registerCombatRoutes } = require('./routes/combatRoutes.js');
const { registerQuantumRoutes } = require('./routes/quantumRoutes.js');

function registerLegacyBridge(dispatcher, handlers = {}) {
  if (!dispatcher || typeof dispatcher.register !== 'function') return;

  const gbRegistry = handlers.GreatBuildingRegistry || defaultGbRegistry;
  let gbSelected = handlers.GBselected;
  if (!gbSelected) {
    try {
      const statePkg = require('../state/state.js');
      gbSelected = statePkg.GBselected;
    } catch {}
  }

  const ctx = {
    dispatcher,
    handlers,
    gbRegistry,
    gbSelected,
    showOptions: handlers.showOptions || {},
  };

  registerCityRoutes(ctx);
  registerBuildingRoutes(ctx);
  registerSocialRoutes(ctx);
  registerCombatRoutes(ctx);
  registerQuantumRoutes(ctx);

  logger.debug('Legacy bridge routes registered');

  return dispatcher;
}

module.exports = {
  registerLegacyBridge,
};
module.exports.default = registerLegacyBridge;
