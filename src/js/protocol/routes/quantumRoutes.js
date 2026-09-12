/**
 * quantumRoutes.js
 *
 * Route table for Quantum Incursions (QI) RPC handlers.
 * Registers GuildRaidsService and QI Ranking handlers onto MessageDispatcher.
 */

let logger = null;
try {
  const { createLogger } = require('../../utils/logger.js');
  logger = createLogger('QuantumRoutes');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

const { guildRaidsService } = require('../../msg/GuildRaidsService.js');

function registerQuantumRoutes(ctx) {
  const { dispatcher } = ctx;
  if (!dispatcher || typeof dispatcher.register !== 'function') return;

  dispatcher.register('GuildRaidsService', 'getMemberActivityOverview', (msg) =>
    guildRaidsService.handleMemberActivityOverview(msg),
  );

  dispatcher.register('RankingService', 'searchRanking', (msg) =>
    guildRaidsService.handleSearchRanking(msg),
  );

  logger.debug('Quantum Incursions route table registered');
}

module.exports = {
  registerQuantumRoutes,
};
module.exports.default = registerQuantumRoutes;
