/** Extension entry point wiring the DevTools network bridge and startup UI. */
import * as bootstrap from 'bootstrap';
import browser from 'webextension-polyfill';
import '../css/main.scss';
import { rewardObserve, showReward } from './fn/RewardRenderer.mjs';
import { setCurrentPercent } from './msg/GreatBuildingsService.js';
import {
  processMetadataData,
  processMetadataEntry,
} from './msg/MetadataService.js';
import { setResourceDefs } from './msg/ResourceService.js';
import {
  renderLiveCityStats,
  lastStartupMsg as serviceLastStartupMsg,
  startupService,
} from './msg/StartupService.js';
import { installPanelBridge } from './protocol/devtoolsBridge.js';
import { setupIndexBridge } from './protocol/indexBridgeSetup.mjs';
import { messageDispatcher } from './protocol/MessageDispatcher.js';
import {
  handleRawNetworkEntry,
  handleRequestFinished,
} from './protocol/networkListener.js';
import { logRpcMessage, rpcLog } from './protocol/rpcRouter.js';
import {
  initEntityDefsLifecycle,
  resolveMissingCityEntitiesFromMap,
  setLastStartupMsg,
} from './state/indexEntityDefs.mjs';
import {
  setupPanelContainers,
  setupPanelHeader,
} from './ui/containerBinding.js';
import { initIndexUiBindings } from './ui/indexUiBindings.js';
import { installPanelResizeHandles } from './ui/panelResizeRegistry.js';
import { initializeUIBindings } from './ui/renderBindings.js';
import { initTheme } from './ui/themeManager.js';
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
} from './vars/state.mjs';

initializeUIBindings();

if (typeof window !== 'undefined') {
  window.bootstrap = bootstrap;
  const cleanupPanelBridge = installPanelBridge(window, {
    handleRawNetworkEntry,
    handleRequestFinished,
  });
  window.addEventListener(
    'unload',
    () => {
      cleanupPanelBridge();
    },
    { once: true },
  );
  initEntityDefsLifecycle(window);
}

export let debugEnabled = isDebugEnabled();
onDebugToggle((enabled) => {
  debugEnabled = enabled;
});
export let darkMode = browser?.devtools?.panels?.themeName;
export let title = setupPanelHeader({ darkMode, onToggleDebug: toggleDebug });
export let content = document.createElement('main');
document.body.appendChild(content);
content.id = 'content';
const cleanupPanelResizeHandles = installPanelResizeHandles(content);
window.addEventListener('unload', cleanupPanelResizeHandles, { once: true });
if (darkMode === 'dark') content.className = 'text-light bg-dark';

if (typeof document !== 'undefined') {
  initTheme({
    targetWindow: typeof window !== 'undefined' ? window : null,
    targetDocument: document,
    devtoolsTheme: darkMode,
    initialPreference: 'auto',
  });
}

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
export * from './vars/state.mjs';
export * from './state/indexEntityDefs.mjs';
export { processMetadataEntry, processMetadataData };
export { renderTreasuryPanel as processTreasuryData } from './ui/panelDispatcher.js';

let lastStartupMsg = null;
let pendingStartupMsg = null;
let inspectedWorldId = null;
let gameVersion = 0;
export let language =
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
  renderLiveCityStats,
  startupService,
  setCurrentPercent,
  setResourceDefs,
  processMetadataData,
  tool: browser?.runtime?.getManifest?.() || {},
  getLanguage: () => language,
  setLanguage: (v) => {
    language = v;
  },
  getLastStartupMsg: () => lastStartupMsg,
  getServiceLastStartupMsg: () => serviceLastStartupMsg,
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
    if (citystats && typeof document !== 'undefined') {
      const tool = browser?.runtime?.getManifest?.() || {};
      const versionContainer = document.createElement('div');

      const versionLabel = document.createElement('span');
      versionLabel.setAttribute('data-i18n', 'gameversion');
      versionLabel.textContent = 'Game Version';

      versionContainer.appendChild(versionLabel);
      versionContainer.appendChild(
        document.createTextNode(`: ${newVersion || ''}`),
      );
      versionContainer.appendChild(document.createElement('br'));
      versionContainer.appendChild(
        document.createTextNode(`${tool.name || ''}: ${tool.version || ''}`),
      );

      citystats.appendChild(versionContainer);
    }
  },
});
