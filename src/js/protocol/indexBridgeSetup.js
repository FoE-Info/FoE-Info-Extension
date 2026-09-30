/**
 * indexBridgeSetup.js
 *
 * Configures MessageDispatcher with all RPC services and legacy bridge handlers.
 * Decoupled from monolithic src/js/index.js.
 */

import cityPresentation from '../msg/CityMapService.js';
import conversationPresentation from '../msg/ConversationService.js';
import donationPresentation from '../msg/GbDonationService.js';
import gbPresentation from '../msg/GreatBuildingsService.js';
import gbgPresentation from '../msg/GuildBattlegroundService.js';
import expeditionPresentation from '../msg/GuildExpeditionService.js';
import raidsPresentation from '../msg/GuildRaidsService.js';
import inventoryPresentation from '../msg/InventoryService.js';
import { registerAllServices } from '../msg/registerServices.js';
import startupPresentation from '../msg/StartupService.js';
import element from '../ui/AddElement.js';
import { setCurrentView } from '../ui/cardVisibility.js';
import { clearVisitPlayer } from '../ui/panelDispatcher.js';
import { updateIgnoreListUI } from '../ui/playerTooltip.js';
import { renderTargetMessage } from '../ui/renderGbgTargets.js';
import { renderGuildPanel } from '../ui/renderGuildPanel.js';
import serviceDom, {
  clearVisitDisplay,
  showGuildOverview,
} from '../ui/serviceDomBridge.js';
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

const configuredDispatchers = new WeakSet();

const dispatcherLogger = createLogger('DispatcherErrors');

export function setupIndexBridge(dispatcher, options = {}) {
  if (
    !dispatcher ||
    typeof dispatcher.register !== 'function' ||
    configuredDispatchers.has(dispatcher)
  )
    return;
  configuredDispatchers.add(dispatcher);

  const presentation = {
    ...serviceDom,
    element,
    setCurrentView,
    renderTargetMessage,
    ...options.presentation,
  };
  for (const service of [
    startupPresentation,
    donationPresentation,
    inventoryPresentation,
    gbPresentation,
    gbgPresentation,
    cityPresentation,
    expeditionPresentation,
    raidsPresentation,
    conversationPresentation,
  ]) {
    service.configurePresentation(presentation);
  }

  registerAllServices(dispatcher, {
    clearVisitDisplay,
    showGuildOverview,
    clearVisitPlayer,
    renderGuildPanel,
    updateIgnoreListUI,
    setCurrentView,
    GBselected,
    playerNameCache,
    getPlayerName,
    setPlayerName,
    showOptions,
    MyInfo,
    ...options,
  });

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

  registerLegacyBridge(dispatcher);
}
