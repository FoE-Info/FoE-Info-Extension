/**
 * indexBridgeSetup.js
 *
 * Configures MessageDispatcher with all RPC services and legacy bridge handlers.
 * Decoupled from monolithic src/js/index.js.
 */

import * as helper from '../fn/helper.js';
import { armyUnitManagementService } from '../msg/ArmyUnitManagementService.js';
import { getLimitedBonuses } from '../msg/BonusService.js';
import { pickupProduction } from '../msg/CityProductionService.js';
import {
  conversationService,
  getConversation,
  getNewMessage,
} from '../msg/ConversationService.js';
import {
  contributeForgePoints,
  getConstruction,
  getConstructionRanking,
  getContributions,
  handleNewReward,
  showGreatBuldingDonation,
} from '../msg/GreatBuildingsService.js';
import {
  getBattleground,
  getBuildings,
  getLeaderboard,
  getPlayerLeaderboard,
  getState,
  getUpdatedProvinces,
  removeSignal,
  setSignal,
  updateSignal,
} from '../msg/GuildBattlegroundService.js';
import { guildExpeditionService } from '../msg/GuildExpeditionService.js';
import * as metadataService from '../msg/MetadataService.js';
import {
  otherPlayerService,
  otherPlayerServiceUpdateActions,
} from '../msg/OtherPlayerService.js';
import { registerAllServices } from '../msg/registerServices.js';
import {
  getPlayerResources,
  getResourceDefinitions,
} from '../msg/ResourceService.js';
import {
  boostService,
  boostServiceAllBoosts,
  emissaryService,
  startupService,
} from '../msg/StartupService.js';
import { clearVisitPlayer } from '../ui/panelDispatcher.js';
import { updateIgnoreListUI } from '../ui/playerTooltip.js';
import { renderGuildPanel } from '../ui/renderGuildPanel.js';
import { createLogger } from '../utils/logger.js';
import { showOptions } from '../vars/showOptions.js';
import {
  GBselected,
  getPlayerName,
  MyInfo,
  playerNameCache,
  setPlayerName,
} from '../vars/state.js';
import { registerLegacyBridge } from './legacyBridge.js';

const dispatcherLogger = createLogger('DispatcherErrors');

export function setupIndexBridge(dispatcher, options = {}) {
  if (!dispatcher || typeof dispatcher.register !== 'function') return;

  registerAllServices(dispatcher);

  dispatcher.onError((error, msg, context) => {
    dispatcherLogger.debug(
      `[DispatcherErrors] RPC handler exception: ${String(error?.message || error)}`,
      {
        requestClass: msg?.requestClass,
        requestMethod: msg?.requestMethod,
        isDirectMetadata: msg?.isDirectMetadata === true,
        reqUrl: context?.reqUrl,
      },
    );
  });

  const onStartupMsg = options.onStartupMsg || (() => {});

  registerLegacyBridge(dispatcher, {
    startupService: (msg, reqData, context) => {
      onStartupMsg(msg);
      return startupService(msg, reqData, context);
    },
    emissaryService,
    getConstruction,
    contributeForgePoints,
    getConstructionRanking,
    getContributions,
    handleNewReward,
    showGreatBuldingDonation,
    otherPlayerService,
    otherPlayerServiceUpdateActions,
    clearVisitPlayer,
    renderGuildPanel,
    getResourceDefinitions,
    getPlayerResources,
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
    getNewMessage,
    getLimitedBonuses,
    updateIgnoreListUI,
    boostService,
    boostServiceAllBoosts,
    processMetadataEntry: metadataService.processMetadataEntry,
    processMetadataData: metadataService.processMetadataData,
    showOptions,
    GBselected,
    helper,
    setPlayerName,
    getPlayerName,
    playerNameCache,
    MyInfo,
  });
}
