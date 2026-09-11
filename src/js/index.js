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
import BigNumber from 'bignumber.js';
import * as bootstrap from 'bootstrap';
import browser from 'webextension-polyfill';
import * as element from './fn/AddElement';
import collapseOptions, * as collapse from './fn/collapse.js';
import * as copy from './fn/copy.js';
import { setToolOptions, setTreasurySize, toolOptions } from './fn/globals.js';
import * as helper from './fn/helper.js';
import { t, translateContainer } from './fn/i18n.js';
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
  setCurrentPercent,
  showGreatBuldingDonation,
} from './msg/GreatBuildingsService.js';
import {
  clearBattleground,
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
  availableFP,
  getPlayerResources,
  getResourceDefinitions,
  ResourceDefs,
  Resources,
  setResourceDefs,
} from './msg/ResourceService.js';
import {
  boostService,
  boostServiceAllBoosts,
  City,
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
  initNetworkListeners,
} from './protocol/networkListener.js';
import { initWebRequestFilter } from './protocol/webRequestFilter.js';
import * as entityDefsCache from './state/entityDefsCache.js';
import {
  handleReceiveStorage,
  handleStorageChange,
  initStorageListeners,
} from './state/storageListener.js';
import { applyCardVisibility } from './ui/cardVisibility.js';
import {
  setupPanelContainers,
  setupPanelHeader,
} from './ui/containerBinding.js';
import {
  clearCultural as clearCulturalHelper,
  clearExpedition as clearExpeditionHelper,
  clearForBattleground as clearForBattlegroundHelper,
  clearForMainCity as clearForMainCityHelper,
  clearStartup as clearStartupHelper,
  clearVisitPlayer as clearVisitPlayerHelper,
  renderTreasuryPanel,
} from './ui/panelDispatcher.js';
import {
  createLogger,
  isDebugEnabled,
  toggleDebug as loggerToggleDebug,
  onDebugToggle,
} from './utils/logger.js';
import setOptions, { showOptions } from './vars/showOptions.js';
import '../css/main.scss';
import {
  AllyDefs,
  battlegroundDIV,
  BuildingEntityLookup,
  cityrewards,
  clearRewardsState,
  donation2DIV,
  donationDIV,
  donationDIV2,
  GameOrigin,
  gbgLeaderboardDIV,
  gbInfoDIV,
  GBselected,
  getPlayerName,
  greatbuilding,
  ignoredPlayers,
  MilitaryDefs,
  MyInfo,
  output,
  PlayerID,
  PlayerName,
  playerNameCache,
  ResearchDefs,
  rewardsGE,
  rewardsOtherPlayer,
  setGameOrigin,
  setIgnoredPlayers,
  setMyGuildPosition,
  setPlayerName,
  setTargetsTopic,
  setTargetText,
  setUrl,
  targets,
  targetsTopic,
  targetText,
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
// var GBinfo = [];
// var GBrequest = [];
var GuildDonations = [];
var GuildsGoods = [];
// var GBdefs = [];
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

console.debug('clipboard', clipboard.innerHTML);
if (showOptions.clipboard) {
  console.debug('clipboard', clipboard.innerHTML);
  // var clipboard = document.getElementById("clipboard");

  // if( clipboard == null){
  // 	// console.debug('2');
  // 	clipboard = document.createElement('div');
  // 	var content = document.getElementById("content");
  // 	content.appendChild(clipboard);
  //  }

  var clipboardHTML = `<div class="alert alert-success alert-dismissible show collapsed"><p id="clipboardTextLabel">
	${element.icon('clipboardicon', 'clipboardText', collapse.collapseClipboard)}
	<strong><span data-i18n="clipboard">Clipboard</span>:</strong></p>`;
  clipboardHTML += element.close();
  clipboardHTML += element.copy(
    'clipboardCopyID',
    'warning',
    'right',
    collapse.collapseClipboard,
  );
  clipboardHTML += `<div id="clipboardText" class="resize collapse ${collapse.collapseClipboard ? '' : 'show'}"><p>`;

  // clipboard.innerHTML = clipboardHTML +`</p></div></div>`;
  // document.getElementById("clipboardTextLabel").addEventListener("click", collapse.fCollapseClipboard);
  // document.getElementById("clipboardCopyID").addEventListener("click", copy.fClipboardCopy);
  // console.debug('clipboard',clipboard.innerHTML);
}

// other player city info
// cultural settlements
// incidents
// rewards
// gbg rewards
// gb donation
// gb info
// army info
// GvG panel
// GBG Targets
// GBG panel
// GE panel
// Treasury info

document.querySelector('#go-to-options').addEventListener('click', function () {
  if (browser.runtime && browser.runtime.openOptionsPage) {
    browser.runtime.openOptionsPage();
  } else {
    window.open(browser.runtime.getURL('options.html'));
  }
});

export var language =
  window.navigator.userLanguage || window.navigator.language;
console.debug(language);
if (process.env.NODE_ENV === 'development') {
  $.i18n.debug = true;
  // language =
  // console.debug(window);
}

window.addEventListener(
  'message',
  function (event) {
    console.debug('received response:  ', event.data);
  },
  false,
);

window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', ({ matches }) => {
    document.body.classList.toggle('bg-dark');
    document.body.classList.toggle('text-light');
    if (matches) {
      console.log('change to dark mode!');
      darkMode == 'dark';
    } else {
      console.log('change to light mode!');
    }
  });
function onEvent(message, params) {
  console.debug(message, params);
}

// browser.storage.local.clear();
Promise.resolve(true).then((result) => {
  // if(checkBeta())
  console.debug(result);
  if (result) {
    // The extension has the permissions.
    // browser.storage.local.get(null, function(items) {
    // 	console.debug(items);
    // });
    // browser.storage.local.clear();

    try {
      if (
        browser &&
        browser.storage &&
        browser.storage.local &&
        typeof browser.storage.local.getBytesInUse === 'function'
      ) {
        browser.storage.local
          .getBytesInUse(null)
          .then((size) => {
            console.debug('getBytesInUse', size);
          })
          .catch((err) => console.warn('getBytesInUse error:', err));
      }
    } catch (e) {
      console.warn('getBytesInUse exception:', e);
    }

    // browser.storage.local.get(['showOptions','collapseOptions','CityEntityDefs','tool','targets','toolOptions','donationPercent','url'],
    browser.storage.local.get(null).then((result) => {
      // console.debug('result', result);
      receiveStorage(result);
      if (language != 'auto') {
        $.i18n({
          locale: language,
        });
      }
      console.debug(language, $.i18n().locale, $.i18n.debug);
      $.i18n()
        .load({
          //     'fr' : {
          //         'load' : 'Chargez le jeu pour voir les statistiques de votre ville'
          // },
          de: {
            load: 'Laden Sie das Spiel, um Ihre Stadtstatistiken anzuzeigen',
          },
          sv: {
            load: 'Ladda spelet för att se din stadsstatistik',
          },
          fi: {
            load: 'Lataa peli nähdäksesi kaupunkitilastot',
          },
          pt: {
            load: 'Carregue o jogo para ver as estatísticas da sua cidade',
          },
          nl: {
            load: 'Laad het spel om je stadsstatistieken te zien',
          },
          sr: {
            load: 'Учитајте игру да бисте видели статистику града',
          },
          ru: {
            load: 'Слава Украине!',
          },
          ua: {
            load: 'Слава Україні!',
          },
          en: 'i18n/en.json',
          es: 'i18n/es.json',
          fr: 'i18n/fr.json',
          el: 'i18n/el.json',
          gr: 'i18n/gr.json',
          it: 'i18n/it.json',
        })
        .done(function () {
          // load lang strings on page already loaded
          translateContainer(document.body);
          console.debug('i18n.load OK');
        });
    });
  } else {
    // The extension doesn't have the permissions.
    citystats.innerHTML = `<div class="alert alert-danger"><p><strong>Please Enable FoE-Info</strong></p>
							  <button type="button" class="btn btn-danger" id="enableFoE">Enable</button></div>`;
    citystats.className = 'alert alert-danger';
    document.getElementById('enableFoE').addEventListener('click', function () {
      // console.debug('options');

      browser.permissions
        .request({
          permissions: ['storage', 'clipboardWrite'],
        })
        .then((granted) => {
          // The callback argument will be true if the user granted the permissions.
          if (granted) {
            //   doSomething();
            citystats.innerHTML = `<div class="alert alert-danger"><p><strong>Now Load The Game !</strong></div>`;
          } else {
            //   doSomethingElse();
          }
        });
    });
    return;
  }
});

// console.debug(showOptions);

initWebRequestFilter();

window.handleRequestFinished = handleRequestFinished;
window.handleRawNetworkEntry = handleRawNetworkEntry;

let inspectedWorldId = null;
try {
  if (
    browser.devtools &&
    browser.devtools.inspectedWindow &&
    browser.devtools.inspectedWindow.eval
  ) {
    browser.devtools.inspectedWindow.eval(
      'window.location.hostname',
      (hostname) => {
        if (hostname && typeof hostname === 'string') {
          const match = hostname.match(/([a-z0-9]+)\.forgeofempires\.com/i);
          if (match && match[1]) {
            inspectedWorldId = match[1].toLowerCase();
            storage.setWorld(inspectedWorldId);
            setGameOrigin(`https://${hostname}`);
            storage.registerKnownWorld(inspectedWorldId);
            storage.getWorldSettings(inspectedWorldId).then((worldSettings) => {
              if (worldSettings && worldSettings.showOptions) {
                setOptions('showOptions', worldSettings.showOptions);
                applyCardVisibility();
              }
            });
          }
        }
      },
    );
  }
} catch (e) {}

try {
  if (browser?.devtools?.network?.onNavigated) {
    browser.devtools.network.onNavigated.addListener((url) => {
      if (url && typeof url === 'string') {
        const match = url.match(
          /https?:\/\/([a-z]+[1-9][0-9]*)\.forgeofempires\.com/i,
        );
        if (
          match &&
          match[1] &&
          typeof storage.isPlayableWorld === 'function' &&
          storage.isPlayableWorld(match[1])
        ) {
          const world = match[1].toLowerCase();
          inspectedWorldId = world;
          storage.setWorld(world);
          setGameOrigin(`https://${match[1]}.forgeofempires.com`);
          storage.registerKnownWorld(world);
        }
      }
    });
  }
} catch (e) {}

initNetworkListeners({
  storage,
  setGameOrigin,
  setOptions,
  applyCardVisibility,
  messageDispatcher,
  logRpcMessage,
  browser,
  getInspectedWorldId: () => inspectedWorldId,
  setInspectedWorldId: (w) => {
    inspectedWorldId = w;
  },
  onGameVersionChange: (newVersion) => {
    GameVersion = newVersion;
    if (citystats) {
      citystats.innerHTML += `<div><span data-i18n="gameversion">Game Version</span>: ${GameVersion}<br>${EXT_NAME}: ${tool.version}</div>`;
    }
  },
  getGameVersion: () => GameVersion,
  setGameVersion: (v) => {
    GameVersion = v;
  },
});

const storageDeps = {
  storage,
  setOptions,
  applyCardVisibility,
  setTargetsTopic: (val) => setTargetsTopic(val),
  setTargetText: (val) => setTargetText(val),
  setCurrentPercent,
  setUrl,
  setToolOptions,
  setResourceDefs,
  collapseOptions,
  processMetadataData,
  resolveMissingCityEntitiesFromMap,
  renderLiveCityStats,
  startupService,
  setDonationPercent: (val) => {
    donationPercent = val;
  },
  setDonationSuffix: (val) => {
    donationSuffix = val;
  },
  setLanguage: (val) => {
    language = val;
  },
  setMetadataLoaded: (val) => {
    metadataLoaded = val;
  },
  getLastStartupMsg: () => lastStartupMsg,
  setLastStartupMsg: (msg) => {
    lastStartupMsg = msg;
  },
  getServiceLastStartupMsg: () => serviceLastStartupMsg,
  getPendingStartupMsg: () => pendingStartupMsg,
  setPendingStartupMsg: (msg) => {
    pendingStartupMsg = msg;
  },
  BuildingEntityLookup,
  AllyDefs,
  ResearchDefs,
  MilitaryDefs,
  MetaIds,
  playerNameCache,
  browser,
};

initStorageListeners(storageDeps);

function storageChange(changes, namespace) {
  handleStorageChange(changes, namespace, storageDeps);
}

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

function clearExpedition() {
  clearExpeditionHelper(getPanelContainers());
}

function clearForBattleground() {
  clearForBattlegroundHelper(getPanelContainers());
}

function clearForMainCity() {
  clearForMainCityHelper(getPanelContainers());
}

function clearStartup() {
  clearStartupHelper(getPanelContainers(), {
    reset: () => {
      GuildDonations = [];
      GuildsGoods = [];
      Bonus = {
        aid: 0,
        spoils: 0,
        diplomatic: 0,
        strike: 0,
      };
      clearRewardsState();
    },
  });
}

function clearCultural() {
  clearCulturalHelper(getPanelContainers());
}

function receiveStorage(result) {
  handleReceiveStorage(result, storageDeps);
}

export function processTreasuryData(resources) {
  renderTreasuryPanel(resources);
}

export const processMetadataEntry = metadataService.processMetadataEntry;

// The onClicked callback function.
function onClickHandler(info, tab) {
  console.debug('onClickHandler: ' + JSON.stringify(info));

  if (info.menuItemId == 'radio1' || info.menuItemId == 'radio2') {
    console.debug(
      'radio item ' +
        info.menuItemId +
        ' was clicked (previous checked state was ' +
        info.wasChecked +
        ')',
    );
  } else if (info.menuItemId == 'checkbox1' || info.menuItemId == 'checkbox2') {
    console.debug(JSON.stringify(info));
    console.debug(
      'checkbox item ' +
        info.menuItemId +
        ' was clicked, state is now: ' +
        info.checked +
        ' (previous state was ' +
        info.wasChecked +
        ')',
    );
  } else {
    console.debug('item ' + info.menuItemId + ' was clicked');
    console.debug('info: ' + JSON.stringify(info));
    console.debug('tab: ' + JSON.stringify(tab));
  }
}

browser.runtime.onInstalled.addListener(handleInstalled);
// Check whether new version is installed
function handleInstalled(details) {
  if (details.reason == 'install') {
    console.debug(tool.name + ' installed!');
  } else if (details.reason == 'update') {
    console.debug(
      tool.name +
        ' updated from ' +
        details.previousVersion +
        ' to ' +
        tool.version +
        '!',
    );
    alert(
      tool.name +
        ' updated from ' +
        details.previousVersion +
        ' to ' +
        tool.version +
        '!',
    );
    // console.debug(oReq.responseText);
  }
}

function toggleDebug() {
  const next = loggerToggleDebug();
  debugEnabled = next;
  console.debug('toggleDebug', debugEnabled);
  return next;
}

browser.runtime.onUpdateAvailable.addListener(handleUpdateAvailable);
function handleUpdateAvailable(details) {
  console.debug('updating to version ' + details.version);
  alert('updating to version ' + details.version);
  browser.runtime.reload();
}

let requestingCheck = browser.runtime.requestUpdateCheck();
requestingCheck.then(onRequested, onError);

function onRequested(status, details) {
  if (status == 'update_available') {
    console.debug('update pending...');
    console.log(details.version);
  } else if (status == 'no_update') {
    console.debug('no update found');
  } else if (status == 'throttled') {
    console.debug("Oops, I'm asking too frequently - I need to back off.");
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}
