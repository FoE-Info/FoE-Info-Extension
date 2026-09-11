/**
 * legacyBridge.js
 *
 * Bridge connecting legacy FoE-Info service handlers to MessageDispatcher.
 */

function registerLegacyBridge(dispatcher, handlers = {}) {
  if (!dispatcher || typeof dispatcher.register !== 'function') return;

  const {
    startupService,
    emissaryService,
    getConstruction,
    contributeForgePoints,
    getConstructionRanking,
    getContributions,
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
    setSignal,
    removeSignal,
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

  // Startup & Player
  if (startupService) {
    dispatcher.register('StartupService', 'getData', startupService);
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
      getConstruction,
    );
  }
  if (contributeForgePoints) {
    dispatcher.register(
      'GreatBuildingsService',
      'contributeForgePoints',
      contributeForgePoints,
    );
  }
  if (getConstructionRanking) {
    dispatcher.register(
      'GreatBuildingsService',
      'getConstructionRanking',
      getConstructionRanking,
    );
  }
  if (getContributions) {
    dispatcher.register(
      'GreatBuildingsService',
      'getContributions',
      getContributions,
    );
  }

  // Other Players & Social
  if (otherPlayerService) {
    dispatcher.register(
      'OtherPlayerService',
      'getEventsList',
      otherPlayerService,
    );
    dispatcher.register('OtherPlayerService', 'visitPlayer', (msg) => {
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
    dispatcher.register('OtherPlayerService', 'getSocialList', (msg) => {
      otherPlayerServiceUpdateActions(msg.responseData);
    });
  }
  if (updateIgnoreListUI) {
    dispatcher.register(
      'IgnorePlayerService',
      'getIgnoreList',
      updateIgnoreListUI,
    );
  }
  if (handlers.GBselected) {
    dispatcher.register(
      'OtherPlayerService',
      'getOtherPlayerCityMapEntity',
      (msg) => {
        const selected = msg.responseData;
        if (selected) {
          handlers.GBselected.id = selected.id;
          if (typeof handlers.helper?.fGBname === 'function') {
            handlers.GBselected.name = handlers.helper.fGBname(
              selected.cityentity_id,
            );
          }
          handlers.GBselected.level = selected.level;
          handlers.GBselected.max_level = selected.max_level;
          handlers.GBselected.connected = selected.connected;
          handlers.GBselected.total = selected.state?.forge_points_for_level_up;
          handlers.GBselected.current =
            selected.state?.invested_forge_points || 0;
        }
      },
    );
  }

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

  // Guild Treasury
  const treasuryBagHandler = getTreasuryBag || treasuryService?.getTreasuryBag;
  if (treasuryBagHandler) {
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
  if (setSignal) {
    dispatcher.register('GuildBattlegroundService', 'setSignal', setSignal);
    dispatcher.register(
      'GuildBattlegroundSignalsService',
      'setSignal',
      setSignal,
    );
  }
  if (removeSignal) {
    dispatcher.register(
      'GuildBattlegroundService',
      'removeSignal',
      removeSignal,
    );
    dispatcher.register(
      'GuildBattlegroundSignalsService',
      'removeSignal',
      removeSignal,
    );
  }

  // Guild Expedition
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
