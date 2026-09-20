/**
 * legacyBridge.js
 *
 * Bridge connecting legacy FoE-Info service handlers to MessageDispatcher.
 * Retained as a backward-compatible delegator; all route tables have been
 * decommissioned to dedicated domain services in src/js/msg/.
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

function registerLegacyBridge(dispatcher, _handlers = {}) {
  if (!dispatcher || typeof dispatcher.register !== 'function') return;

  logger.debug(
    'Legacy bridge invoked (all routes modernized to domain services)',
  );

  return dispatcher;
}

module.exports = {
  registerLegacyBridge,
};
module.exports.default = registerLegacyBridge;
