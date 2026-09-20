/**
 * indexBridgeSetup.js
 *
 * Configures MessageDispatcher with all RPC services and legacy bridge handlers.
 * Decoupled from monolithic src/js/index.js.
 */

import { registerAllServices } from '../msg/registerServices.js';
import { setCurrentView } from '../ui/cardVisibility.js';
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

  registerAllServices(dispatcher, {
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
