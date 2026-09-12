/**
 * combatRoutes.js
 *
 * Legacy bridge route table for Guild Battlegrounds, province signals, Guild
 * Expedition, and army unit management.
 */

let logger = null;
try {
  const { createLogger } = require('../../utils/logger.js');
  logger = createLogger('CombatRoutes');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

let setCurrentView = () => {};
try {
  ({ setCurrentView } = require('../../ui/cardVisibility.js'));
} catch {}

/**
 * Wrap an RPC handler so the panel enters the given context before it runs.
 * @param {string} view One of GAME_CONTEXTS.
 * @param {Function} handler Original handler.
 */
function withContext(view, handler) {
  return (msg, ...rest) => {
    setCurrentView(view);
    return handler(msg, ...rest);
  };
}

function extractSignalData(msg, context) {
  if (Array.isArray(msg) && msg.length > 0) return msg;
  if (Array.isArray(msg?.requestData) && msg.requestData.length > 0) {
    return msg.requestData;
  }
  if (Array.isArray(context?.requestData) && context.requestData.length > 0) {
    return context.requestData;
  }
  if (
    Array.isArray(context?.request?.requestData) &&
    context.request.requestData.length > 0
  ) {
    return context.request.requestData;
  }

  const reqPayloadItems =
    Array.isArray(context?.requestPayload) ? context.requestPayload
    : context?.requestPayload && typeof context.requestPayload === 'object' ?
      [context.requestPayload]
    : [];
  if (reqPayloadItems.length > 0) {
    const match =
      (msg?.requestId !== undefined ?
        reqPayloadItems.find((r) => r && r.requestId === msg.requestId)
      : null) ||
      reqPayloadItems.find(
        (r) =>
          r &&
          (r.requestMethod === 'setSignal' ||
            r.requestMethod === 'removeSignal' ||
            r.requestClass?.includes('GuildBattleground')),
      ) ||
      reqPayloadItems[0];
    if (Array.isArray(match?.requestData) && match.requestData.length > 0) {
      return match.requestData;
    }
  }

  const postText =
    context?.request?.request?.postData?.text ||
    context?.request?.postData?.text ||
    context?.postData?.text ||
    (typeof context?.postData === 'string' ? context.postData : null) ||
    (typeof context?.request?.postData === 'string' ? context.request.postData
    : typeof context?.request?.request?.postData === 'string' ?
      context.request.request.postData
    : null);
  if (postText) {
    try {
      const parsed =
        typeof postText === 'string' ? JSON.parse(postText) : postText;
      const reqItems = Array.isArray(parsed) ? parsed : [parsed];
      const match =
        (msg?.requestId !== undefined ?
          reqItems.find((r) => r && r.requestId === msg.requestId)
        : null) ||
        reqItems.find(
          (r) =>
            r &&
            (r.requestMethod === 'setSignal' ||
              r.requestMethod === 'removeSignal' ||
              r.requestClass?.includes('GuildBattleground')),
        ) ||
        reqItems[0];
      if (Array.isArray(match?.requestData) && match.requestData.length > 0) {
        return match.requestData;
      }
    } catch {}
  }

  if (Array.isArray(msg?.responseData) && msg.responseData.length > 0) {
    return msg.responseData;
  }
  if (Array.isArray(context) && context.length > 0) return context;
  if (Array.isArray(msg?.requestData) && msg.requestData.length > 0) {
    return msg.requestData;
  }
  if (Array.isArray(context?.requestData) && context.requestData.length > 0) {
    return context.requestData;
  }

  const candidateObj =
    ((
      msg &&
      typeof msg === 'object' &&
      !Array.isArray(msg) &&
      (msg.provinceId !== undefined || msg.id !== undefined)
    ) ?
      msg
    : null) ||
    ((
      msg?.responseData &&
      typeof msg.responseData === 'object' &&
      !Array.isArray(msg.responseData) &&
      (msg.responseData.provinceId !== undefined ||
        msg.responseData.id !== undefined)
    ) ?
      msg.responseData
    : null);
  if (candidateObj) {
    const pid = candidateObj.provinceId ?? candidateObj.id;
    const stype = candidateObj.type ?? candidateObj.signal;
    return [pid, stype];
  }

  return [];
}

function registerCombatRoutes(ctx) {
  const { dispatcher, handlers } = ctx;
  const {
    getPlayerLeaderboard,
    getLeaderboard,
    getState,
    getBattleground,
    getBuildings,
    getUpdatedProvinces,
    setSignal,
    removeSignal,
    updateSignal,
    guildExpeditionService,
    armyUnitManagementService,
  } = handlers;

  // Guild Battlegrounds
  if (getPlayerLeaderboard) {
    dispatcher.register(
      'GuildBattlegroundService',
      'getPlayerLeaderboard',
      getPlayerLeaderboard,
    );
  }
  if (getLeaderboard) {
    dispatcher.register(
      'GuildBattlegroundService',
      'getLeaderboard',
      getLeaderboard,
    );
  }
  if (getState) {
    const gbgGetState = withContext('GBG', getState);
    dispatcher.register('GuildBattlegroundService', 'getState', gbgGetState);
    dispatcher.register(
      'GuildBattlegroundStateService',
      'getState',
      gbgGetState,
    );
  }
  if (getBattleground) {
    dispatcher.register(
      'GuildBattlegroundService',
      'getBattleground',
      withContext('GBG', getBattleground),
    );
  }
  if (getBuildings) {
    dispatcher.register(
      'GuildBattlegroundService',
      'getBuildings',
      getBuildings,
    );
    dispatcher.register(
      'GuildBattlegroundBuildingService',
      'getBuildings',
      getBuildings,
    );
  }
  if (getUpdatedProvinces) {
    dispatcher.register(
      'GuildBattlegroundService',
      'getUpdatedProvinces',
      getUpdatedProvinces,
    );
    dispatcher.register(
      'GuildBattlegroundService',
      'getProvinces',
      getUpdatedProvinces,
    );
  }

  const handleSetSignal = (msg, context) => {
    const payload = extractSignalData(msg, context);
    return setSignal(msg, payload, context);
  };

  const handleRemoveSignal = (msg, context) => {
    const payload = extractSignalData(msg, context);
    return removeSignal(msg, payload, context);
  };

  if (setSignal) {
    dispatcher.register(
      'GuildBattlegroundService',
      'setSignal',
      handleSetSignal,
    );
    dispatcher.register(
      'GuildBattlegroundSignalsService',
      'setSignal',
      handleSetSignal,
    );
  }
  if (removeSignal) {
    dispatcher.register(
      'GuildBattlegroundService',
      'removeSignal',
      handleRemoveSignal,
    );
    dispatcher.register(
      'GuildBattlegroundSignalsService',
      'removeSignal',
      handleRemoveSignal,
    );
    dispatcher.register(
      'GuildBattlegroundService',
      'getAction',
      (msg, context) => {
        if (msg?.responseData?.action === 'province_conquered') {
          return handleRemoveSignal(msg, context);
        }
      },
    );
  }

  const handleUpdateSignal = (msg, context) => {
    const payload = extractSignalData(msg, context);
    if (typeof updateSignal === 'function') {
      return updateSignal(msg, payload, context);
    }
    const signalType =
      payload?.[1] ?? msg?.responseData?.type ?? msg?.responseData?.signal;
    if (signalType && signalType !== 'none' && signalType !== 'clear') {
      return handleSetSignal(msg, context);
    } else {
      return handleRemoveSignal(msg, context);
    }
  };

  dispatcher.register(
    'GuildBattlegroundSignalsService',
    'updateSignal',
    handleUpdateSignal,
  );
  dispatcher.register(
    'GuildBattlegroundService',
    'updateSignal',
    handleUpdateSignal,
  );

  // Guild Expedition & International Guild Expedition
  const geHandler = handlers.championshipService || guildExpeditionService;
  if (geHandler) {
    dispatcher.register(
      'ChampionshipService',
      'getOverview',
      withContext('GE', geHandler),
    );
  }
  if (guildExpeditionService) {
    dispatcher.register(
      'GuildExpeditionService',
      'getOverview',
      withContext('GE', guildExpeditionService),
    );
    dispatcher.register(
      'GuildExpeditionService',
      'getChestOverview',
      guildExpeditionService,
    );
    dispatcher.register(
      'GuildExpeditionService',
      'getContributionList',
      guildExpeditionService,
    );
  }

  // Army
  if (armyUnitManagementService) {
    dispatcher.register(
      'ArmyUnitManagementService',
      'getArmyInfo',
      armyUnitManagementService,
    );
    dispatcher.register(
      'ArmyUnitManagementService',
      'getArmyOverview',
      armyUnitManagementService,
    );
    dispatcher.register(
      'ArmyUnitManagementService',
      'getArmyArtillery',
      armyUnitManagementService,
    );
  }

  logger.debug('Combat routes registered', {
    battlegrounds: !!getBattleground,
    expedition: !!guildExpeditionService,
    army: !!armyUnitManagementService,
  });
}

module.exports = {
  registerCombatRoutes,
};
module.exports.default = registerCombatRoutes;
