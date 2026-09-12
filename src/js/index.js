/** Extension entry point wiring the DevTools network bridge and startup UI. */
import * as bootstrap from 'bootstrap';
import browser from 'webextension-polyfill';
import '../css/main.scss';
import { rewardObserve, showReward } from './fn/RewardRenderer.js';
import { installPanelBridge } from './protocol/devtoolsBridge.js';
import { setupIndexBridge } from './protocol/indexBridgeSetup.js';
import { messageDispatcher } from './protocol/MessageDispatcher.js';
import {
  handleRawNetworkEntry,
  handleRequestFinished,
} from './protocol/networkListener.js';
import { logRpcMessage, rpcLog } from './protocol/rpcLogger.js';
import {
  initEntityDefsLifecycle,
  resolveMissingCityEntitiesFromMap,
  setLastStartupMsg,
} from './state/indexEntityDefs.js';
import {
  setupPanelContainers,
  setupPanelHeader,
} from './ui/containerBinding.js';
import './ui/bonusRenderBinding.js';
import './ui/quantumRenderBinding.js';
import './ui/startupRenderBinding.js';
import './ui/treasuryRenderBinding.js';
import { initIndexUiBindings } from './ui/indexUiBindings.js';
import { escapeHTML } from './utils/formatters.js';
import { isDebugEnabled, onDebugToggle, toggleDebug } from './utils/logger.js';
import {
  battlegroundDIV,
  cityrewards,
  donation2DIV,
  donationDIV,
  donationDIV2,
  gbgLeaderboardDIV,
  gbInfoDIV,
  greatbuilding,
  output,
  targets,
} from './vars/state.js';

if (typeof window !== 'undefined') {
  window.bootstrap = bootstrap;
  installPanelBridge(window, {
    handleRawNetworkEntry,
    handleRequestFinished,
  });
  initEntityDefsLifecycle(window);
}

export var debugEnabled = isDebugEnabled();
onDebugToggle((enabled) => {
  debugEnabled = enabled;
});
export var darkMode = browser?.devtools?.panels?.themeName;
export var title = setupPanelHeader({ darkMode, onToggleDebug: toggleDebug });
export var content = document.createElement('div');
document.body.appendChild(content);
content.id = 'content';
if (darkMode === 'dark') content.className = 'text-light bg-dark';

const containers = setupPanelContainers(content, {
  targets,
  cityrewards,
  output,
  gbgLeaderboardDIV,
  donationDIV,
  battlegroundDIV,
  donation2DIV,
  donationDIV2,
  gbInfoDIV,
  greatbuilding,
});

export const {
  citystats,
  alerts,
  bonusDIV,
  incidents,
  cityinvested,
  galaxyDIV,
  visitstats,
  overview,
  cultural,
  info,
  armyDIV,
  goodsDIV,
  guild,
  friendsDiv,
  treasury,
  treasuryLog,
  clipboard,
  alerts_bottom,
  debug,
  modal,
} = containers;

export {
  battlegroundDIV,
  donationDIV,
  gbgLeaderboardDIV,
  gbInfoDIV,
  greatbuilding,
  output,
  targets,
  donation2DIV,
  donationDIV2,
  cityrewards,
  rewardObserve,
  showReward,
  logRpcMessage,
  rpcLog,
};
export * from './vars/state.js';
export * from './state/indexEntityDefs.js';
export {
  processMetadataEntry,
  processMetadataData,
} from './msg/MetadataService.js';
export { renderTreasuryPanel as processTreasuryData } from './ui/panelDispatcher.js';

let lastStartupMsg = null;
let pendingStartupMsg = null;
let inspectedWorldId = null;
let gameVersion = 0;
export var language =
  (typeof window !== 'undefined' &&
    (window.navigator?.userLanguage || window.navigator?.language)) ||
  'en';

setupIndexBridge(messageDispatcher, {
  onStartupMsg: (msg) => {
    lastStartupMsg = msg;
    setLastStartupMsg(msg);
  },
});

initIndexUiBindings({
  browser,
  citystats,
  tool: browser?.runtime?.getManifest?.() || {},
  getLanguage: () => language,
  setLanguage: (v) => {
    language = v;
  },
  getLastStartupMsg: () => lastStartupMsg,
  setLastStartupMsg: (m) => {
    lastStartupMsg = m;
    setLastStartupMsg(m);
  },
  getPendingStartupMsg: () => pendingStartupMsg,
  setPendingStartupMsg: (m) => {
    pendingStartupMsg = m;
  },
  resolveMissingCityEntitiesFromMap,
  logRpcMessage,
  getInspectedWorldId: () => inspectedWorldId,
  setInspectedWorldId: (w) => {
    inspectedWorldId = w;
  },
  getGameVersion: () => gameVersion,
  setGameVersion: (v) => {
    gameVersion = v;
  },
  onGameVersionChange: (newVersion) => {
    if (citystats) {
      const tool = browser?.runtime?.getManifest?.() || {};
      const html = `<div><span data-i18n="gameversion">Game Version</span>: ${escapeHTML(newVersion)}<br>${escapeHTML(tool.name || '')}: ${escapeHTML(tool.version || '')}</div>`;
      if (typeof citystats.insertAdjacentHTML === 'function') {
        citystats.insertAdjacentHTML('beforeend', html);
      } else {
        citystats.innerHTML = `${citystats.innerHTML}${html}`;
      }
    }
  },
});
