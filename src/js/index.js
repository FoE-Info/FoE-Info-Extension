/*
 * ________________________________________________________________
 * Copyright (C) 2022 FoE-Info - All Rights Reserved
 * this source-code uses a copy-left license
 *
 * you are welcome to contribute changes here:
 * https://github.com/FoE-Info/FoE-Info-Extension
 *
 * AGPL license info:
 * https://github.com/FoE-Info/FoE-Info-Extension/master/LICENSE.md
 * or else visit https://www.gnu.org/licenses/#AGPL
 * ________________________________________________________________
 */
import * as bootstrap from 'bootstrap';
import browser from 'webextension-polyfill';
import { toolOptions } from './fn/globals.js';
import * as helper from './fn/helper.js';
import { rewardObserve, showReward, showRewards } from './fn/RewardRenderer.js';
import * as storage from './fn/storage.js';
import { armyUnitManagementService } from './msg/ArmyUnitManagementService.js';
import { getBonuses, getLimitedBonuses } from './msg/BonusService.js';
import { pickupProduction } from './msg/CityProductionService.js';
import {
  conversationService,
  getConversation,
  getNewMessage,
} from './msg/ConversationService.js';
import {
  contributeForgePoints,
  getConstruction,
  getConstructionRanking,
  getContributions,
  handleNewReward,
  showGreatBuldingDonation,
} from './msg/GreatBuildingsService.js';
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
} from './msg/GuildBattlegroundService.js';
import { guildExpeditionService } from './msg/GuildExpeditionService.js';
import * as metadataService from './msg/MetadataService.js';
import {
  otherPlayerService,
  otherPlayerServiceUpdateActions,
} from './msg/OtherPlayerService.js';
import { registerAllServices } from './msg/registerServices.js';
import {
  getPlayerResources,
  getResourceDefinitions,
} from './msg/ResourceService.js';
import {
  boostService,
  boostServiceAllBoosts,
  emissaryService,
  renderLiveCityStats,
  lastStartupMsg as serviceLastStartupMsg,
  startupService,
  updateIgnoreListUI,
} from './msg/StartupService.js';
import { registerLegacyBridge } from './protocol/legacyBridge.js';
import { messageDispatcher } from './protocol/MessageDispatcher.js';
import {
  handleRawNetworkEntry,
  handleRequestFinished,
} from './protocol/networkListener.js';
import * as entityDefsCache from './state/entityDefsCache.js';
import {
  setupPanelContainers,
  setupPanelHeader,
} from './ui/containerBinding.js';
import { initIndexUiBindings } from './ui/indexUiBindings.js';
import {
  clearVisitPlayer as clearVisitPlayerHelper,
  renderTreasuryPanel,
} from './ui/panelDispatcher.js';
import { escapeHTML } from './utils/formatters.js';
import {
  createLogger,
  isDebugEnabled,
  toggleDebug as loggerToggleDebug,
  onDebugToggle,
} from './utils/logger.js';
import { showOptions } from './vars/showOptions.js';
import '../css/main.scss';
import {
  battlegroundDIV,
  cityrewards,
  donation2DIV,
  donationDIV,
  donationDIV2,
  gbgLeaderboardDIV,
  gbInfoDIV,
  GBselected,
  getPlayerName,
  greatbuilding,
  MyInfo,
  output,
  playerNameCache,
  setPlayerName,
  targets,
} from './vars/state.js';

const rpcLogger = createLogger('RPC');
const indexLogger = createLogger('Index');

indexLogger.info(
  `[TIMING:P1] index.js top-level execution | t = ${performance.now().toFixed(2)}ms`,
);
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      indexLogger.info(
        `[TIMING:P1] panel.html DOMContentLoaded fired | t = ${performance.now().toFixed(2)}ms`,
      );
    });
  } else {
    indexLogger.info(
      `[TIMING:P1] panel.html DOMContentLoaded already complete | t = ${performance.now().toFixed(2)}ms`,
    );
  }
}

if (typeof window !== 'undefined') window.bootstrap = bootstrap;

export { rewardObserve, showReward, showRewards };

export * from './vars/state.js';

console.debug(toolOptions);

let contentTypes = {};
export var debugEnabled = isDebugEnabled();
onDebugToggle((enabled) => {
  debugEnabled = enabled;
});
export var availablePacksFP = 0;
export var rpcLog = [];
if (typeof window !== 'undefined') {
  window.foeRpcLog = rpcLog;
}

registerAllServices(messageDispatcher);

const dispatcherLogger = createLogger('DispatcherErrors');
messageDispatcher.onError((error, msg, context) => {
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

registerLegacyBridge(messageDispatcher, {
  startupService: (msg, reqData, context) => {
    lastStartupMsg = msg;
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
  getBonuses,
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

export function logRpcMessage(msg, isHandled) {
  if (!msg || typeof msg !== 'object') return;
  const reqClass = msg.requestClass || msg.__class__ || 'Metadata/Unknown';
  const reqMethod = msg.requestMethod || 'N/A';

  const entry = {
    timestamp: new Date().toISOString(),
    requestClass: reqClass,
    requestMethod: reqMethod,
    requestId: msg.requestId ?? null,
    handled: !!isHandled,
    responseData:
      debugEnabled ?
        msg.responseData !== undefined ?
          msg.responseData
        : msg
      : `${reqClass}.${reqMethod}`,
  };

  rpcLog.push(entry);
  if (rpcLog.length > 500) {
    rpcLog.shift();
  }

  const tag = isHandled ? '[HANDLED]' : '[UNHANDLED]';
  const style =
    isHandled ?
      'color: #2e7d32; font-weight: bold;'
    : 'color: #d32f2f; font-weight: bold;';

  if (debugEnabled) {
    console.groupCollapsed(
      `%c[FoE-RPC] ${tag} ${reqClass}.${reqMethod}`,
      style,
    );
    console.debug('Full Message:', msg);
    console.debug('Response Data:', entry.responseData);
    console.groupEnd();
    rpcLogger.debug(`${tag} ${reqClass}.${reqMethod}`, {
      requestClass: reqClass,
      requestMethod: reqMethod,
      requestId: entry.requestId,
      responseData: entry.responseData,
    });
  } else {
    console.debug(`[FoE-RPC] ${tag} ${reqClass}.${reqMethod}`, msg);
  }
}

export var worlds = [];
export var CityEntityDefs = {};
export var MetaIds = {};
export var CityProtections = [];
export var CastleDefs = [];
export var SelectionKitDefs = [];
export var BoostMetadataDefs = [];
export var VolcanoProvinceDefs = [];

export var WaterfallProvinceDefs = [];
export var BuildingDefs = [];
// flag to indicate that all metadata files have been processed
export var metadataLoaded = false;
export var hiddenRewards = [];
// store StartupService message until metadata is ready
var pendingStartupMsg = null;
var lastStartupMsg = null;
const fetchedMetadataUrls = new Set();

export const markCityEntityDefsDirty = entityDefsCache.markCityEntityDefsDirty;
export const isCityEntityDefsDirty = entityDefsCache.isCityEntityDefsDirty;

export function flushCityEntityDefs() {
  return entityDefsCache.flushCityEntityDefs({
    storage,
    CityEntityDefs,
  });
}

export function resolveMissingCityEntities(ids) {
  return entityDefsCache.resolveMissingCityEntities(ids, {
    metadataService,
    storage,
    CityEntityDefs,
    lastStartupMsg: lastStartupMsg || serviceLastStartupMsg,
    startupService,
    renderLiveCityStats,
  });
}

export function resolveMissingCityEntitiesFromMap(mapEntities) {
  return entityDefsCache.resolveMissingCityEntitiesFromMap(mapEntities, {
    helper,
    metadataService,
    storage,
    CityEntityDefs,
    lastStartupMsg: lastStartupMsg || serviceLastStartupMsg,
    startupService,
    renderLiveCityStats,
  });
}

entityDefsCache.initEntityDefsUnloadHandler(
  typeof window !== 'undefined' ? window : null,
  {
    storage,
    CityEntityDefs,
  },
);

export const processMetadataData = metadataService.processMetadataData;
export var Goods = {
  sad: 0,
  sash: 0,
  sat: 0,
  sajm: 0,
  sav: 0,
  saab: 0,
  sam: 0,
  vf: 0,
  of: 0,
  af: 0,
  fe: 0,
  te: 0,
  ce: 0,
  pme: 0,
  me: 0,
  pe: 0,
  ina: 0,
  cma: 0,
  lma: 0,
  hma: 0,
  ema: 0,
  ia: 0,
  ba: 0,
  noage: 0,
};
export var EpocTime = 0;
var GameVersion = 0;

export var donationPercent = 190;
export var donationSuffix = '';

export var Bonus = {
  aid: 0,
  spoils: 0,
  diplomatic: 0,
  strike: 0,
};

var tool = browser.runtime.getManifest();
console.debug(tool.name);
console.debug(tool.version);

// console.debug(typeof $);

// browser.windows.getAll({ populate: true }).then((windows) => {
// 		for (var i = 0; i < windows.length; ++i) {
// 			var w = windows[i];
// 			for (var j = 0; j < w.tabs.length; ++j) {
// 				var t = w.tabs[j];
// 				console.debug(w, t);
// 			}

// 		}
// 	});

// $.i18n().load( {
// 	en: 'i18n/en.json',
// 	// el: "i18n/el.json"
// 		} ).done( function() { console.debug('i18n.load OK') } );
export var darkMode = browser.devtools.panels.themeName;
// if (window.matchMedia &&
//     window.matchMedia('(prefers-color-scheme: dark)').matches) {
// //   img.style.filter="invert(100%)";
// 		console.debug('dark mode',window.matchMedia('(prefers-color-scheme: dark)').matches);
// 		// darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
// }
console.info('themeName', browser.devtools.panels.themeName);
export var title = setupPanelHeader({
  darkMode,
  extName: EXT_NAME,
  onToggleDebug: toggleDebug,
});

// city info
export var content = document.createElement('div');
document.body.appendChild(content);
content.id = 'content';
if (darkMode == 'dark') content.className = 'text-light bg-dark';

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

export var citystats = containers.citystats;
export var alerts = containers.alerts;
export var bonusDIV = containers.bonusDIV;
export var incidents = containers.incidents;
export var cityinvested = containers.cityinvested;
export var galaxyDIV = containers.galaxyDIV;
export var visitstats = containers.visitstats;
export var overview = containers.overview;
export var cultural = containers.cultural;
export var info = containers.info;
export var armyDIV = containers.armyDIV;
export var goodsDIV = containers.goodsDIV;
var buildingsDIV = containers.buildingsDIV;
export var guild = containers.guild;
export var friendsDiv = containers.friendsDiv;
export var treasury = containers.treasury;
export var treasuryLog = containers.treasuryLog;
export var clipboard = containers.clipboard;
export var alerts_bottom = containers.alerts_bottom;
export var debug = containers.debug;
export var modal = containers.modal;

export {
  battlegroundDIV,
  donationDIV,
  gbgLeaderboardDIV,
  gbInfoDIV,
  greatbuilding,
  output,
};

export var language =
  window.navigator.userLanguage || window.navigator.language;
indexLogger.debug(language);

window.handleRequestFinished = handleRequestFinished;
window.handleRawNetworkEntry = handleRawNetworkEntry;

let inspectedWorldId = null;

initIndexUiBindings({
  browser,
  window: typeof window !== 'undefined' ? window : undefined,
  document: typeof document !== 'undefined' ? document : undefined,
  citystats,
  tool,
  alertFn: typeof alert === 'function' ? alert : undefined,
  getLanguage: () => language,
  setLanguage: (val) => {
    language = val;
  },
  setDonationPercent: (val) => {
    donationPercent = val;
  },
  setDonationSuffix: (val) => {
    donationSuffix = val;
  },
  setMetadataLoaded: (val) => {
    metadataLoaded = val;
  },
  getLastStartupMsg: () => lastStartupMsg,
  setLastStartupMsg: (msg) => {
    lastStartupMsg = msg;
  },
  getPendingStartupMsg: () => pendingStartupMsg,
  setPendingStartupMsg: (msg) => {
    pendingStartupMsg = msg;
  },
  resolveMissingCityEntitiesFromMap,
  logRpcMessage,
  getInspectedWorldId: () => inspectedWorldId,
  setInspectedWorldId: (w) => {
    inspectedWorldId = w;
  },
  getGameVersion: () => GameVersion,
  setGameVersion: (v) => {
    GameVersion = v;
  },
  onGameVersionChange: (newVersion) => {
    if (citystats) {
      const safeVersion = escapeHTML(newVersion);
      const safeExtName = escapeHTML(EXT_NAME);
      const safeToolVersion = escapeHTML(tool.version);
      citystats.innerHTML += `<div><span data-i18n="gameversion">Game Version</span>: ${safeVersion}<br>${safeExtName}: ${safeToolVersion}</div>`;
    }
  },
});

export function setMyInfo(name, id, clan, clan_id, createdAt, era, score = 0) {
  MyInfo.name = name;
  MyInfo.id = id;
  MyInfo.guild = clan;
  MyInfo.guildID = clan_id;
  MyInfo.createdAt = createdAt;
  MyInfo.era = era;
  if (score !== undefined && score !== null) {
    const num = Number(score);
    MyInfo.score = Number.isFinite(num) ? num : 0;
  }
}

export function setMyName(name) {
  MyInfo.name = name;
}

export function setMyID(id) {
  MyInfo.id = id;
}

function getPanelContainers() {
  return {
    cityinvested,
    output,
    overview,
    alerts,
    cityrewards,
    donationDIV,
    incidents,
    donation2DIV,
    donationDIV2,
    greatbuilding,
    gbInfoDIV,
    targets,
    guild,
    debug,
    info,
    citystats,
    visitstats,
    cultural,
    friendsDiv,
    armyDIV,
    treasury,
    treasuryLog,
  };
}

function clearVisitPlayer() {
  clearVisitPlayerHelper(getPanelContainers());
}

export function processTreasuryData(resources) {
  renderTreasuryPanel(resources);
}

export const processMetadataEntry = metadataService.processMetadataEntry;

function toggleDebug() {
  const next = loggerToggleDebug();
  debugEnabled = next;
  console.debug('toggleDebug', debugEnabled);
  return next;
}
