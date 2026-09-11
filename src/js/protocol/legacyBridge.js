/**
 * legacyBridge.js
 *
 * Bridge connecting legacy FoE-Info service handlers to MessageDispatcher.
 */

const defaultGbRegistry = require('../state/GreatBuildingRegistry.js');
const GbDonationService = require('../msg/GbDonationService.js');

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

  const {
    startupService,
    emissaryService,
    getConstruction,
    contributeForgePoints,
    getConstructionRanking,
    getContributions,
    handleNewReward,
    otherPlayerService,
    otherPlayerServiceUpdateActions,
    clearVisitPlayer,
    getResourceDefinitions,
    getPlayerResources,
    getPlayerResourceBag,
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
    pickupProduction,
    conversationService,
    getConversation,
    getBonuses,
    getLimitedBonuses,
    updateIgnoreListUI,
    processMetadataEntry,
    processMetadataData,
    getTreasury,
    getTreasuryBag,
    getTreasuryLogs,
    treasuryService,
    getOutposts,
    getAdvancements,
    outpostService,
    boostServiceAllBoosts,
    showOptions = {},
  } = handlers;

  // Metadata
  if (processMetadataEntry) {
    dispatcher.register(
      'StaticDataService',
      'getMetadata',
      processMetadataEntry,
    );
  }
  if (processMetadataData) {
    if (typeof dispatcher.registerDirectMetadata === 'function') {
      dispatcher.registerDirectMetadata(processMetadataData);
    } else if (typeof dispatcher.setDirectMetadataHandler === 'function') {
      dispatcher.setDirectMetadataHandler(processMetadataData);
    }
  }

  const registerCityEntities = (entities, myId, myName) => {
    if (!Array.isArray(entities)) return;
    for (const entity of entities) {
      if (
        entity &&
        (entity.type === 'greatbuilding' ||
          entity.cityentity_id?.includes('Landmark'))
      ) {
        if (myName && !entity.player_name) {
          entity.player_name = myName;
        }
        if (myId && !entity.player_id && !entity.player) {
          entity.player_id = myId;
          entity.player = myId;
        }
        gbRegistry.registerGreatBuilding(entity, 0);
        if (myId) {
          gbRegistry.registerGreatBuilding(entity, myId);
        }
      }
    }
  };

  // Startup & Player
  dispatcher.register('StartupService', 'getData', (msg, reqData, context) => {
    if (Array.isArray(msg?.responseData?.city_map?.entities)) {
      const myId =
        msg?.responseData?.user_data?.player_id || handlers?.MyInfo?.id || 0;
      const myName =
        msg?.responseData?.user_data?.user_name || handlers?.MyInfo?.name || '';
      registerCityEntities(msg.responseData.city_map.entities, myId, myName);
    }
    if (startupService) {
      return startupService(msg, reqData, context);
    }
  });
  if (startupService) {
    dispatcher.register('StartupService', 'getOverview', startupService);
  }
  if (emissaryService) {
    dispatcher.register('EmissaryService', 'getOverview', emissaryService);
    dispatcher.register('EmissaryService', 'getAssigned', emissaryService);
  }
  if (boostServiceAllBoosts) {
    dispatcher.register('BoostService', 'getAllBoosts', boostServiceAllBoosts);
  }

  // Great Buildings
  if (getConstruction) {
    dispatcher.register(
      'GreatBuildingsService',
      'getConstruction',
      (msg, context) => {
        const reqData = extractRankingData(msg, context);
        return getConstruction(msg, reqData, context);
      },
    );
  }
  if (contributeForgePoints) {
    dispatcher.register(
      'GreatBuildingsService',
      'contributeForgePoints',
      (msg, context) => {
        const reqData = extractRankingData(msg, context);
        return contributeForgePoints(msg, reqData, context);
      },
    );
  }
  const extractRankingData = (msg, context) => {
    if (Array.isArray(msg?.requestData)) return msg.requestData;
    if (Array.isArray(context)) return context;
    if (Array.isArray(context?.requestData)) return context.requestData;
    if (Array.isArray(context?.request?.requestData)) {
      return context.request.requestData;
    }
    if (context?.request?.postData) {
      let post = context.request.postData;
      if (typeof post === 'string') {
        try {
          post = JSON.parse(post);
        } catch {}
      }
      if (Array.isArray(post)) return post;
      if (Array.isArray(post?.requestData)) return post.requestData;
    }
    return [];
  };

  dispatcher.register(
    'GreatBuildingsService',
    'getConstructionRanking',
    (msg, context) => {
      const reqData = extractRankingData(msg, context);
      if (getConstructionRanking) {
        return getConstructionRanking(msg, reqData, context);
      }
      const rankingParams = GbDonationService.extractRankingParams(
        msg,
        reqData,
        context,
      );
      const target = handlers.GBselected || gbSelected;
      if (target) {
        const myId = handlers.MyInfo?.id || 0;
        const myName = handlers.MyInfo?.name || '';
        const isForeign =
          rankingParams?.playerId !== undefined &&
          rankingParams.playerId !== null &&
          rankingParams.playerId !== 0 &&
          rankingParams.playerId !== myId;
        const pId = isForeign ? rankingParams.playerId : 0;
        const eId = rankingParams?.entityId || target.id || target.entity_id;
        let cached = gbRegistry.getGreatBuilding(pId, eId);
        if (!cached && pId === 0 && myId) {
          cached = gbRegistry.getGreatBuilding(myId, eId);
        }
        if (!cached && eId) {
          cached = gbRegistry.getGreatBuilding(null, eId);
        }
        if (cached) {
          GbDonationService.syncGbSelected(target, cached);
          if (rankingParams?.level !== undefined) {
            target.level = rankingParams.level;
          }
          const pName = cached.player_name || (pId === 0 ? myName : '') || '';
          const finalPid = cached.player || (pId === 0 ? myId : pId) || 0;
          if (finalPid) target.player = finalPid;
          if (pName) target.player_name = pName;
          if (handlers.setPlayerName && (pName || finalPid)) {
            handlers.setPlayerName(pName, finalPid);
          }
        } else if (eId && eId !== target.id) {
          target.id = eId;
          target.entity_id = eId;
          if (rankingParams?.level !== undefined) {
            target.level = rankingParams.level;
          }
          if (pId === 0) {
            target.player = myId;
            target.player_name = myName;
            if (handlers.setPlayerName) handlers.setPlayerName(myName, myId);
          }
        }
      }
    },
  );
  if (getContributions) {
    dispatcher.register('GreatBuildingsService', 'getContributions', (msg) =>
      getContributions(msg),
    );
  }
  const rewardHandler = handleNewReward || GbDonationService.handleNewReward;
  if (rewardHandler) {
    dispatcher.register('BlueprintService', 'newReward', (msg) => {
      const targetContainer =
        handlers.cityrewards ||
        (typeof document !== 'undefined' ?
          document.getElementById('cityrewards') ||
          document.getElementById('rewards')
        : null);
      return rewardHandler(msg, showOptions, targetContainer);
    });
  }

  // Other Players & Social
  if (otherPlayerService) {
    dispatcher.register(
      'OtherPlayerService',
      'getEventsList',
      otherPlayerService,
    );
    dispatcher.register('OtherPlayerService', 'visitPlayer', (msg, context) => {
      const gbs = msg?.responseData?.city_map?.entities || [];
      const pid =
        msg?.responseData?.other_player?.player_id ||
        (Array.isArray(context?.requestData) ? context.requestData[0] : null);
      gbRegistry.registerGreatBuildings(gbs, pid);
      if (showOptions.showVisit) {
        if (typeof clearVisitPlayer === 'function') clearVisitPlayer();
        otherPlayerService(msg);
      }
    });
  }
  if (otherPlayerServiceUpdateActions) {
    dispatcher.register(
      'OtherPlayerService',
      'updatePlayerActions',
      otherPlayerServiceUpdateActions,
    );
    for (const method of [
      'getSocialList',
      'getFriendsList',
      'getClanMemberList',
      'getNeighbourList',
    ]) {
      dispatcher.register('OtherPlayerService', method, (msg) => {
        otherPlayerServiceUpdateActions(msg.responseData);
      });
    }
    dispatcher.register(
      'OtherPlayerService',
      'getOtherPlayerOverview',
      (msg) => {
        otherPlayerServiceUpdateActions(msg.responseData);
      },
    );
    const renderGuildHandler =
      handlers.renderGuildPanel ||
      (() => {
        try {
          return require('../ui/renderGuildPanel.js').renderGuildPanel;
        } catch {
          return null;
        }
      })();

    const guildHandler = (msg) => {
      const data = msg?.responseData || msg;
      if (typeof renderGuildHandler === 'function') {
        renderGuildHandler(data);
      }
      if (typeof otherPlayerServiceUpdateActions === 'function') {
        otherPlayerServiceUpdateActions(data, { autoExpandGuild: true });
      }
    };

    dispatcher.register('ClanMemberService', 'getMemberList', guildHandler);
    dispatcher.register('ClanService', 'getMembers', guildHandler);
    dispatcher.register('ClanService', 'getOverview', guildHandler);
    dispatcher.register('ClanService', 'getOwnClanData', guildHandler);
    dispatcher.register('ClanService', 'getClanData', guildHandler);
    dispatcher.register(
      'GreatBuildingsService',
      'getOtherPlayerOverview',
      (msg) => {
        if (Array.isArray(msg?.responseData)) {
          for (const item of msg.responseData) {
            const pId = item.player?.player_id || item.player_id;
            gbRegistry.registerGreatBuilding(item, pId);
          }
        }
        otherPlayerServiceUpdateActions(msg.responseData);
      },
    );
  }
  if (updateIgnoreListUI) {
    dispatcher.register('IgnorePlayerService', 'getIgnoreList', (msg) => {
      updateIgnoreListUI(msg);
    });
  }
  dispatcher.register(
    'OtherPlayerService',
    'getOtherPlayerCityMapEntity',
    (msg) => {
      const selected = msg?.responseData;
      if (selected) {
        const pId = selected.player_id || selected.player?.player_id || 0;
        const pName =
          (handlers.playerNameCache && handlers.playerNameCache[pId]) ||
          (handlers.getPlayerName ? handlers.getPlayerName(pId) : '') ||
          selected.player_name ||
          selected.player?.name ||
          '';
        if (pId && handlers.setPlayerName) {
          handlers.setPlayerName(pName, pId);
        }

        const gb = gbRegistry.registerGreatBuilding(selected, pId);
        const target = handlers.GBselected || gbSelected;
        if (target) {
          GbDonationService.syncGbSelected(target, gb || selected);
          if (pId) target.player = pId;
          if (pName) target.player_name = pName;
        }
      }
    },
  );

  // City Map Service (Own City GBs)
  dispatcher.register('CityMapService', 'getEntities', (msg) => {
    if (Array.isArray(msg?.responseData)) {
      const myId = handlers?.MyInfo?.id || 0;
      const myName = handlers?.MyInfo?.name || '';
      registerCityEntities(msg.responseData, myId, myName);
    }
  });
  dispatcher.register('CityMapService', 'updateEntity', (msg) => {
    const list =
      Array.isArray(msg?.responseData) ? msg.responseData
      : msg?.responseData ? [msg.responseData]
      : [];
    const myId = handlers?.MyInfo?.id || 0;
    const myName = handlers?.MyInfo?.name || '';
    registerCityEntities(list, myId, myName);
    const target = handlers.GBselected || gbSelected;
    for (const item of list) {
      if (
        item &&
        item.type === 'greatbuilding' &&
        target &&
        (item.id === target.id || item.cityentity_id === target.cityentity_id)
      ) {
        GbDonationService.syncGbSelected(target, item);
        if (handlers.MyInfo?.id && item.player_id === handlers.MyInfo.id) {
          if (handlers.setPlayerName) {
            handlers.setPlayerName(handlers.MyInfo.name, handlers.MyInfo.id);
          }
        }
        if (typeof handlers.showGreatBuldingDonation === 'function') {
          handlers.showGreatBuldingDonation();
        }
      }
    }
  });
  dispatcher.register('CityMapService', 'reset', (msg) => {
    const list =
      Array.isArray(msg?.responseData) ? msg.responseData
      : msg?.responseData ? [msg.responseData]
      : [];
    const myId = handlers?.MyInfo?.id || 0;
    const myName = handlers?.MyInfo?.name || '';
    registerCityEntities(list, myId, myName);
    const target = handlers.GBselected || gbSelected;
    for (const item of list) {
      if (
        item &&
        item.type === 'greatbuilding' &&
        target &&
        (item.id === target.id || item.cityentity_id === target.cityentity_id)
      ) {
        GbDonationService.syncGbSelected(target, item);
      }
    }
  });

  // Resources
  if (getResourceDefinitions) {
    dispatcher.register(
      'ResourceService',
      'getResourceDefinitions',
      getResourceDefinitions,
    );
  }
  if (getPlayerResources) {
    dispatcher.register(
      'ResourceService',
      'getPlayerResources',
      getPlayerResources,
    );
  } else if (getPlayerResourceBag) {
    dispatcher.register(
      'ResourceService',
      'getPlayerResources',
      getPlayerResourceBag,
    );
  }
  const resourceBagHandler = getPlayerResourceBag || getPlayerResources;
  if (resourceBagHandler) {
    dispatcher.register(
      'ResourceService',
      'getPlayerResourceBag',
      resourceBagHandler,
    );
  }

  // Trade Service / Market Triggers for Goods Inventory
  const renderGoodsHandler =
    handlers.renderGoodsPanel ||
    (handlers.getPlayerResources ? () => handlers.getPlayerResources() : null);

  if (renderGoodsHandler) {
    for (const method of [
      'getTradeList',
      'getOpenOffers',
      'getTradeOffers',
      'getYourOffers',
    ]) {
      dispatcher.register('TradeService', method, (msg) =>
        renderGoodsHandler(msg),
      );
    }
  }

  // Guild Treasury
  const treasuryBagHandler = getTreasuryBag || treasuryService?.getTreasuryBag;
  if (treasuryBagHandler) {
    dispatcher.register('ClanService', 'getTreasuryBag', treasuryBagHandler);
    dispatcher.register(
      'ResourceService',
      'getTreasuryBag',
      treasuryBagHandler,
    );
  }
  const treasuryLogsHandler =
    getTreasuryLogs || treasuryService?.getTreasuryLogs;
  if (treasuryLogsHandler) {
    dispatcher.register('ClanService', 'getTreasuryLogs', treasuryLogsHandler);
  }
  const treasuryHandler = getTreasury || treasuryService?.getTreasury;
  if (treasuryHandler) {
    dispatcher.register('ClanService', 'getTreasury', treasuryHandler);
  }

  // Cultural Settlements & Outposts
  const outpostHandler = getOutposts || outpostService?.getAll;
  if (outpostHandler) {
    dispatcher.register('OutpostService', 'getAll', outpostHandler);
  }
  const advancementHandler =
    getAdvancements || outpostService?.handleAdvancements;
  if (advancementHandler) {
    dispatcher.register('AdvancementService', 'getAll', advancementHandler);
  }
  if (outpostService?.handleUnlockAdvancement) {
    dispatcher.register(
      'AdvancementService',
      'unlock',
      outpostService.handleUnlockAdvancement,
    );
  }

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
    dispatcher.register('GuildBattlegroundService', 'getState', getState);
    dispatcher.register('GuildBattlegroundStateService', 'getState', getState);
  }
  if (getBattleground) {
    dispatcher.register(
      'GuildBattlegroundService',
      'getBattleground',
      getBattleground,
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
  const extractSignalData = (msg, context) => {
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
      } catch (e) {}
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
  };

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
    dispatcher.register('ChampionshipService', 'getOverview', geHandler);
  }
  if (guildExpeditionService) {
    dispatcher.register(
      'GuildExpeditionService',
      'getOverview',
      guildExpeditionService,
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

  // City Production
  if (pickupProduction) {
    dispatcher.register(
      'CityProductionService',
      'pickupProduction',
      pickupProduction,
    );
  }

  // Conversations
  if (conversationService) {
    dispatcher.register(
      'ConversationService',
      'getTeasers',
      conversationService,
    );
    dispatcher.register(
      'ConversationService',
      'getCategory',
      conversationService,
    );
    dispatcher.register(
      'ConversationService',
      'getOverviewForCategory',
      conversationService,
    );
    dispatcher.register(
      'ConversationService',
      'getOverview',
      conversationService,
    );
    dispatcher.register(
      'ConversationService',
      'getNewMessage',
      handlers.getNewMessage || conversationService,
    );
  }
  if (getConversation) {
    dispatcher.register(
      'ConversationService',
      'getConversation',
      getConversation,
    );
  }

  // Bonuses
  if (getBonuses) {
    dispatcher.register('BonusService', 'getBonuses', getBonuses);
  }
  if (getLimitedBonuses) {
    dispatcher.register('BonusService', 'getLimitedBonuses', getLimitedBonuses);
  }

  return dispatcher;
}

module.exports = {
  registerLegacyBridge,
};
module.exports.default = registerLegacyBridge;
