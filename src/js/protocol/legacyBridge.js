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
const { registerSocialRoutes } = require('./routes/socialRoutes.js');
const { registerCombatRoutes } = require('./routes/combatRoutes.js');

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

  registerSocialRoutes(ctx);
  registerCombatRoutes(ctx);

  logger.debug('Legacy bridge routes registered');

  return dispatcher;
}

module.exports = {
  registerLegacyBridge,
};
module.exports.default = registerLegacyBridge;
