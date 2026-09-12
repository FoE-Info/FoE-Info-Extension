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

let setCurrentView = () => {};
try {
  ({ setCurrentView } = require('../../ui/cardVisibility.js'));
} catch {}

function withQiContext(handler) {
  return (msg, ...rest) => {
    setCurrentView('QI');
    if (typeof handler === 'function') return handler(msg, ...rest);
  };
}

function registerQuantumRoutes(ctx) {
  const { dispatcher } = ctx;
  if (!dispatcher || typeof dispatcher.register !== 'function') return;

  dispatcher.register(
    'GuildRaidsService',
    'getMemberActivityOverview',
    withQiContext((msg) => guildRaidsService.handleMemberActivityOverview(msg)),
  );

  dispatcher.register(
    'RankingService',
    'searchRanking',
    withQiContext((msg) => guildRaidsService.handleSearchRanking(msg)),
  );

  // QI map & raid state are ground-truth signals that the player is on the QI map.
  dispatcher.register(
    'GuildRaidsMapService',
    'getOverview',
    withQiContext((msg) =>
      typeof guildRaidsService.handleOverview === 'function' ?
        guildRaidsService.handleOverview(msg)
      : undefined,
    ),
  );
  dispatcher.register(
    'GuildRaidsService',
    'getState',
    withQiContext((msg) =>
      typeof guildRaidsService.handleState === 'function' ?
        guildRaidsService.handleState(msg)
      : undefined,
    ),
  );

  logger.debug('Quantum Incursions route table registered');
}

module.exports = {
  registerQuantumRoutes,
};
module.exports.default = registerQuantumRoutes;
