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
  deploySiegeArmy,
  getContinent,
  getProvinceDetailed,
  grantIndependence,
  gvgAges,
  gvgSummary,
} from './msg/ClanBattleService.js';
import {
  conversationService,
  getConversation,
} from './msg/ConversationService.js';
import {
  contributeForgePoints,
  getConstruction,
  getConstructionRanking,
  getContributions,
  setCurrentPercent,
} from './msg/GreatBuildingsService.js';
import {
  clearBattleground,
  getBattleground,
  getBuildings,
  getLeaderboard,
  getPlayerLeaderboard,
  getState,
  removeSignal,
  setSignal,
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
  startupService,
  updateIgnoreListUI,
} from './msg/StartupService.js';
import { registerLegacyBridge } from './protocol/legacyBridge.js';
import { messageDispatcher } from './protocol/MessageDispatcher.js';
import setOptions, { showOptions } from './vars/showOptions.js';
import '../css/main.scss';
import {
  AllyDefs,
  BuildingEntityLookup,
  clearRewardsState,
  GameOrigin,
  MilitaryDefs,
  playerNameCache,
  ResearchDefs,
  rewardsGE,
  rewardsOtherPlayer,
  setGameOrigin,
  setIgnoredPlayers,
  setMyGuildPosition,
  setPlayerName,
  setUrl,
} from './vars/state.js';

if (typeof window !== 'undefined') window.bootstrap = bootstrap;

export { rewardObserve, showReward, showRewards };

export * from './vars/state.js';

console.debug(toolOptions);

let contentTypes = {};
export var debugEnabled = false;
export var availablePacksFP = 0;
export var rpcLog = [];
if (typeof window !== 'undefined') {
  window.foeRpcLog = rpcLog;
}

registerAllServices(messageDispatcher);

registerLegacyBridge(messageDispatcher, {
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
  processMetadataEntry: metadataService.processMetadataEntry,
  processMetadataData: metadataService.processMetadataData,
  boostServiceAllBoosts,
  showOptions,
  GBselected,
  helper,
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
  } else {
    console.debug(`[FoE-RPC] ${tag} ${reqClass}.${reqMethod}`, msg);
  }
}

export var PlayerName = '';
export var PlayerID = 0;
export var worlds = [];

export var MyInfo = {
  name: '',
  era: '',
  id: 0,
  guild: '',
  guildID: 0,
  guildPosition: 0,
  createdAt: 0,
};

export var ignoredPlayers = {
  ignoredByPlayerIds: {},
  ignoredPlayerIds: {},
};

export var GBselected = {
  player: 0,
  player_name: '',
  id: 0,
  level: 0,
  name: '',
  era: '',
  connected: false,
  max_level: 0,
  current: 0,
  total: 0,
};
// var GBinfo = [];
// var GBrequest = [];
var GuildDonations = [];
var GuildTreasury = [];
// var GuildTreasuryAnalysis = [];
export var targetsTopic = 'targets';
export var targetText = '';
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
var saveCityEntityDefsTimer = null;
const fetchedMetadataUrls = new Set();
var startupRerunTimer = null;

function scheduleStartupRerun(msg) {
  if (!msg) return;
  if (startupRerunTimer) clearTimeout(startupRerunTimer);
  startupRerunTimer = setTimeout(() => {
    startupRerunTimer = null;
    startupService(msg);
  }, 1000);
}

export function flushCityEntityDefs() {
  if (saveCityEntityDefsTimer) {
    clearTimeout(saveCityEntityDefsTimer);
    saveCityEntityDefsTimer = null;
  }
  if (CityEntityDefs && Object.keys(CityEntityDefs).length > 0) {
    storage.set('CityEntityDefs', CityEntityDefs);
  }
  if (BuildingEntityLookup && Object.keys(BuildingEntityLookup).length > 0) {
    storage.set('BuildingEntityLookup', BuildingEntityLookup);
  }
  if (MetaIds && Object.keys(MetaIds).length > 0) {
    storage.set('MetaIds', MetaIds);
  }
  if (AllyDefs && Object.keys(AllyDefs).length > 0) {
    storage.set('AllyDefs', AllyDefs);
  }
  if (ResearchDefs && Object.keys(ResearchDefs).length > 0) {
    storage.set('ResearchDefs', ResearchDefs);
  }
  if (MilitaryDefs && Object.keys(MilitaryDefs).length > 0) {
    storage.set('MilitaryDefs', MilitaryDefs);
  }
}

export async function resolveMissingCityEntities(ids) {
  return metadataService.resolveMissingCityEntities(ids, () => {
    saveCityEntityDefsDebounced();
    if (lastStartupMsg) {
      scheduleStartupRerun(lastStartupMsg);
    }
  });
}

export function resolveMissingCityEntitiesFromMap(mapEntities) {
  if (!mapEntities || !Array.isArray(mapEntities)) return;
  const missing = mapEntities
    .map((e) => e && e.cityentity_id)
    .filter((cid) => cid && !helper.getCityEntityDef(cid));
  if (missing.length > 0) {
    resolveMissingCityEntities(missing);
  }
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('beforeunload', () => {
    flushCityEntityDefs();
  });
}

function saveCityEntityDefsDebounced() {
  if (saveCityEntityDefsTimer) clearTimeout(saveCityEntityDefsTimer);
  saveCityEntityDefsTimer = setTimeout(() => {
    flushCityEntityDefs();
  }, 5000);
}

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
var title = document.createElement('div');
document.body.appendChild(title);
title.id = 'title';
title.className = 'd-flex flex-row justify-content-between';

// TODO fix dark theme
if (darkMode == 'dark') {
  title.className =
    'd-flex flex-row justify-content-between text-light bg-dark';
  // --color-background = 'bg-dark';
}

// <div class="p-2"><img src="${./src/icons/Icon24.png}" /></div>
{
  /* <svg id="go-to-options" viewBox="0 0 16 16" width="16px" height="16px"><use xlink:href="${bootstrap-icons/icons/tools.svg#tools}"/></svg> */
}
// title.innerHTML =  `<div class="d-flex flex-row justify-content-between">
// <div class="p-2"><img src="${./src/icons/Icon24.png}" /></div>
// <div class="p-8">
// 	<h6>EXT_NAME-dev</h6>
// </div>
// <div class="p-2">
// </div>
// </div>`;

var newelement = document.body;
// TODO fix dark theme
if (darkMode == 'dark') {
  // 	newelement.classList.toggle("nord-styles");
  // 	newelement.classList.toggle("dark-mode");
  newelement.classList.toggle('bg-dark');
}
// else
newelement.classList.toggle('bootstrap-styles');
newelement = document.createElement('div');
newelement.className = 'p-2';
title.appendChild(newelement);
var child = document.createElement('img');
child.src = '/icons/Icon48.png';
child.width = '24';
child.height = '24';
child.id = 'logo';
// if (DEV)
child.addEventListener('click', toggleDebug);
newelement.appendChild(child);
newelement = document.createElement('div');
newelement.className = 'p-8 title';
title.appendChild(newelement);
child = document.createElement('h6');
// TODO fix dark theme
if (darkMode == 'dark') child.className = 'title text-light bg-dark';
else child.className = 'title';
// child.innerHTML = pkg.name;
child.textContent = EXT_NAME;
newelement.appendChild(child);
newelement = document.createElement('button');
newelement.type = 'button';
newelement.setAttribute('aria-label', 'Open Settings');
newelement.className = 'btn btn-link p-2 text-decoration-none border-0';
newelement.innerHTML = `<span class="material-icons-outlined md-18 options-icon">settings</span>`;
newelement.id = 'go-to-options';

title.appendChild(newelement);

// city info
export var content = document.createElement('div');
document.body.appendChild(content);
content.id = 'content';
if (darkMode == 'dark') content.className = 'text-light bg-dark';
export var citystats = document.createElement('div');
content.appendChild(citystats);
citystats.className = 'alert alert-warning';
citystats.id = 'citystats';
citystats.innerHTML = `<p><strong><span data-i18n="load">Load the game ...</span></strong></p>`;

export var alerts = document.createElement('div');
alerts.id = 'alerts';
content.appendChild(alerts);

export var targets = document.createElement('div');
targets.id = 'targets';
content.appendChild(targets);

export var bonusDIV = document.createElement('div');
bonusDIV.id = 'bonus';
content.appendChild(bonusDIV);

export var incidents = document.createElement('div');
incidents.className = 'incidents';
incidents.id = 'incidents';
content.appendChild(incidents);
export var cityinvested = document.createElement('div');
content.appendChild(cityinvested);
cityinvested.id = 'invested';

export var galaxyDIV = document.createElement('div');
galaxyDIV.id = 'galaxy';
// galaxyDIV.className="hidden";
galaxyDIV.style.display = 'none';
content.appendChild(galaxyDIV);

export var visitstats = document.createElement('div');
content.appendChild(visitstats);
visitstats.id = 'visit';
export var cityrewards = document.createElement('div');
content.appendChild(cityrewards);
cityrewards.id = 'rewards';

export var output = document.createElement('div');
content.appendChild(output);
output.id = 'output';
export var donationDIV = document.createElement('div');
content.appendChild(donationDIV);
donationDIV.id = 'donation';
export var donation2DIV = document.createElement('div');
content.appendChild(donation2DIV);
donation2DIV.id = 'donation2';
export var donationDIV2 = document.createElement('div');
content.appendChild(donationDIV2);
donationDIV2.id = 'donationDIV2';
export var greatbuilding = document.createElement('div');
content.appendChild(greatbuilding);
greatbuilding.id = 'greatbuilding';

export var overview = document.createElement('div');
content.appendChild(overview);
overview.id = 'overview';
export var cultural = document.createElement('div');
content.appendChild(cultural);
cultural.id = 'cultural';
export var info = document.createElement('div');
content.appendChild(info);
info.id = 'info';

export var armyDIV = document.createElement('div');
content.appendChild(armyDIV);
armyDIV.id = 'army';

export var goodsDIV = document.createElement('div');
content.appendChild(goodsDIV);
goodsDIV.id = 'goods';

export var gvg = document.createElement('div');
content.appendChild(gvg);
gvg.id = 'gvg';
gvg.style.display = 'none';

var buildingsDIV = document.createElement('div');
buildingsDIV.id = 'buildings';
content.appendChild(buildingsDIV);

export var guild = document.createElement('div');
content.appendChild(guild);
guild.id = 'guild';
export var friendsDiv = document.createElement('div');
content.appendChild(friendsDiv);
friendsDiv.id = 'friends';
export var treasury = document.createElement('div');
content.appendChild(treasury);
treasury.id = 'treasury';
export var treasuryLog = document.createElement('div');
content.appendChild(treasuryLog);
treasuryLog.id = 'treasuryLog';
export var clipboard = document.createElement('div');
content.appendChild(clipboard);
clipboard.id = 'clipboard';
clipboard.style.display = 'none';
export var alerts_bottom = document.createElement('div');
alerts_bottom.id = 'alerts_bottom';
content.appendChild(alerts_bottom);
export var debug = document.createElement('div');
content.appendChild(debug);
debug.id = 'debug';
export var modal = document.createElement('div');
content.appendChild(modal);
modal.id = 'modal';

var newelement = document.createElement('div');
newelement.className = 'modal-dialog modal-sm';
newelement.id = 'testModal';
// newelement.innerHTML = '<div class="modal-dialog modal-sm">...</div>';
modal.appendChild(newelement);

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

  var clipboardHTML = `<div class="alert alert-success alert-dismissible show collapsed"><p id="clipboardTextLabel" href="#buildingsText" data-bs-toggle="collapse">
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

// var newDiv = document.createElement("div");
// cityincidents.innerHTML = "This is a new div.";
// content.appendChild(newDiv);

const getType = (type) => {
  return type.replace(/.*(javascript|image|html|font|json|css|text).*/g, '$1');
};

const formatBytes = (size) => {
  return `${parseInt(size / 1000)} KB`;
};

document.querySelector('#go-to-options').addEventListener('click', function () {
  // console.debug('options');

  browser.permissions
    .request({
      permissions: ['storage'],
    })
    .then((granted) => {
      // The callback argument will be true if the user granted the permissions.
      if (granted) {
        //   doSomething();
        if (browser.runtime.openOptionsPage) {
          browser.runtime.openOptionsPage();
        } else {
          window.open(browser.runtime.getURL('options.html'));
        }
      } else {
        //   doSomethingElse();
      }
    });
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

/* don't send the origin, so that they don't see the request coming from Chrome extension */
function originWithId(header) {
  return (
    header.name.toLowerCase() === 'origin' &&
    (header.value.indexOf('moz-extension://') === 0 ||
      header.value.indexOf('chrome-extension://') === 0)
  );
}

if (
  typeof chrome !== 'undefined' &&
  chrome.webRequest &&
  chrome.webRequest.onBeforeSendHeaders
) {
  try {
    chrome.webRequest.onBeforeSendHeaders.addListener(
      (details) => {
        return {
          requestHeaders: details.requestHeaders.filter(
            (x) => !originWithId(x),
          ),
        };
      },
      { urls: ['https://*.innogamescdn.com/*'] },
      ['requestHeaders'],
    );
  } catch (e) {}
}

window.handleRequestFinished = handleRequestFinished;

window.handleRawNetworkEntry = handleRawNetworkEntry;

try {
  browser.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'FOE_INFO_NET_DATA' && msg.url && msg.body) {
      handleRawNetworkEntry(msg.url, [], msg.body, '');
    }
  });
} catch (e) {}

function handleRawNetworkEntry(reqUrl, headers, body, encoding) {
  if (!reqUrl) return;
  if (
    reqUrl.includes('/game/json') ||
    reqUrl.includes('metadata?id=') ||
    reqUrl.includes('/metadata') ||
    reqUrl.includes('/start/metadata')
  ) {
    const contentTypeHeader = (headers || []).find(
      (h) => h && h.name && h.name.toLowerCase() === 'client-identification',
    );
    if (
      contentTypeHeader &&
      contentTypeHeader.value &&
      GameVersion != contentTypeHeader.value.substr(8, 5)
    ) {
      GameVersion = contentTypeHeader.value.substr(8, 5);
      citystats.innerHTML += `<div><span data-i18n="gameversion">Game Version</span>: ${GameVersion}<br>${EXT_NAME}: ${tool.version}</div>`;
    }
    processContentDirect(reqUrl, body, encoding || '', headers || []);
  }
}

// When a network request has finished this function will be called.
// browser.devtools.network.onRequestFinished.addListener().then(request => {
function handleRequestFinished(request) {
  if (!request) return;
  const response = request.response || {};
  const responseHeaders = response.headers || [];
  const requestHeaders = (request.request && request.request.headers) || [];

  var contentType = '';
  var contentHeader = responseHeaders.find(
    (header) =>
      header && header.name && header.name.toLowerCase() === 'content-type',
  );

  if (contentHeader) {
    contentType = getType(contentHeader.value);
  }

  const reqUrl =
    request.request && request.request.url ? request.request.url : '';
  if (
    reqUrl.includes('/game/json') ||
    reqUrl.includes('metadata?id=') ||
    reqUrl.includes('/metadata') ||
    reqUrl.includes('/start/metadata')
  ) {
    const clientIdentHeader = requestHeaders.find(
      (header) =>
        header &&
        header.name &&
        header.name.toLowerCase() === 'client-identification',
    );

    if (
      clientIdentHeader &&
      clientIdentHeader.value &&
      GameVersion != clientIdentHeader.value.substr(8, 5)
    ) {
      GameVersion = clientIdentHeader.value.substr(8, 5);
    }

    const processContent = (body, encoding) =>
      processContentDirect(
        reqUrl,
        body,
        encoding,
        request.request ? request.request.headers : [],
        request,
      );
    safeProcessContent(request, processContent);
  }
}

const processedPayloadCache = new Map();

function isDuplicatePayload(reqUrl, textBody) {
  if (!reqUrl || !textBody) return false;
  const sample = typeof textBody === 'string' ? textBody.slice(0, 100) : '';
  const len = typeof textBody === 'string' ? textBody.length : 0;
  const key = `${reqUrl}:${len}:${sample}`;
  const now = Date.now();
  if (processedPayloadCache.has(key)) {
    const lastTime = processedPayloadCache.get(key);
    if (now - lastTime < 3000) {
      return true;
    }
  }
  processedPayloadCache.set(key, now);
  if (processedPayloadCache.size > 300) {
    const firstKey = processedPayloadCache.keys().next().value;
    processedPayloadCache.delete(firstKey);
  }
  return false;
}

async function processContentDirect(
  reqUrl,
  body,
  encoding,
  headers = [],
  request = null,
) {
  if (!body) return;
  try {
    const res = await messageDispatcher.dispatchRaw(
      reqUrl,
      body,
      encoding,
      headers,
      request,
    );
    if (res && res.batchResult && Array.isArray(res.batchResult.results)) {
      for (const item of res.batchResult.results) {
        logRpcMessage(item.message, !item.result?.unhandled && item.success);
      }
    }
  } catch (err) {
    console.error('Error in processContentDirect dispatch:', err);
  }
}

function safeProcessContent(request, processContent) {
  try {
    let called = false;
    const safeProcess = (content, encoding) => {
      if (called) return;
      if (!content) {
        setTimeout(() => {
          if (called) return;
          try {
            let p;
            try {
              p = request.getContent();
            } catch (e) {
              request.getContent((retryContent, retryEncoding) => {
                if (retryContent) {
                  called = true;
                  processContent(retryContent, retryEncoding);
                }
              });
              return;
            }
            if (p && typeof p.then === 'function') {
              p.then((res) => {
                const [retryContent, retryEncoding] =
                  Array.isArray(res) ? res : [res, ''];
                if (retryContent) {
                  called = true;
                  processContent(retryContent, retryEncoding);
                }
              }).catch(() => {});
            }
          } catch (e) {}
        }, 150);
        return;
      }
      called = true;
      processContent(content, encoding);
    };

    let res;
    try {
      res = request.getContent();
    } catch (err) {
      res = request.getContent((content, encoding) => {
        safeProcess(content, encoding);
      });
    }

    if (res && typeof res.then === 'function') {
      res
        .then((args) => {
          if (Array.isArray(args)) safeProcess(args[0], args[1]);
          else safeProcess(args, '');
        })
        .catch((err) => console.error('getContent promise error', err));
    }
  } catch (e) {
    console.error('Error in safeProcessContent', e);
  }
}

browser.storage.onChanged.addListener(storageChange);

function storageChange(changes, namespace) {
  for (var key in changes) {
    var storageChange = changes[key];
    //   console.debug('Storage key "%s" in namespace "%s" changed. ' +
    // 			  'Old value was "%s", new value is "%s".',
    // 			  key,
    // 			  namespace,
    // 			  storageChange.oldValue,
    // 			  storageChange.newValue);
    if (key == 'showOptions') setOptions('showOptions', storageChange.newValue);
    // showOptions = storageChange.newValue;
    // console.debug(changes);
    else if (key == 'tool') {
      language = storageChange.newValue.language;
      console.debug(language);
    } else if (key == 'targets') {
      // console.debug(storageChange.newValue,targetsTopic);
      targetsTopic = storageChange.newValue;
    } else if (key == 'targetText') {
      // console.debug(storageChange.newValue,targetText);
      targetText = storageChange.newValue;
    } else if (key == 'toolOptions') {
      setToolOptions(storageChange.newValue);
      // console.debug(toolOptions);
    } else if (key == 'donationPercent') {
      donationPercent = storageChange.newValue;
      setCurrentPercent(storageChange.newValue);
      // console.debug(storageChange.newValue);
    } else if (key == 'donationSuffix') {
      donationSuffix = storageChange.newValue;
      // console.debug(storageChange.newValue);
    } else if (key == 'url') {
      setUrl(storageChange.newValue);
      // console.debug(url);
    }
  }
  // console.debug('onChanged',changes);
  // console.debug('showOptions',showOptions);
}

export function setMyInfo(name, id, clan, clan_id, createdAt, era) {
  MyInfo.name = name;
  MyInfo.id = id;
  MyInfo.guild = clan;
  MyInfo.guildID = clan_id;
  MyInfo.createdAt = createdAt;
  MyInfo.era = era;
}

export function setMyName(name) {
  MyInfo.name = name;
}

export function setMyID(id) {
  MyInfo.id = id;
}

function fCleardForGVG() {
  cityinvested.innerHTML = ``;
  output.innerHTML = ``;
  overview.innerHTML = ``;
  alerts.innerHTML = ``;
  // cityrewards.innerHTML = ``;
  donationDIV.innerHTML = ``;
  incidents.innerHTML = ``;
  donation2DIV.innerHTML = ``;
  donationDIV2.innerHTML = ``;
  greatbuilding.innerHTML = ``;
  guild.innerHTML = ``;
  debug.innerHTML = ``;
  info.innerHTML = ``;
  donationDIV.innerHTML = ``;
  visitstats.innerHTML = ``;
  visitstats.className = '';
  cultural.innerHTML = ``;
  cultural.className = '';
  friendsDiv.innerHTML = '';
  treasury.innerHTML = '';
  treasuryLog.innerHTML = '';
}

function clearVisitPlayer() {
  cityinvested.innerHTML = ``;
  output.innerHTML = ``;
  overview.innerHTML = ``;
  // cityrewards.innerHTML = ``;
  donationDIV.innerHTML = ``;
  donation2DIV.innerHTML = ``;
  donationDIV2.innerHTML = ``;
  greatbuilding.innerHTML = ``;
  guild.innerHTML = ``;
  debug.innerHTML = ``;
  info.innerHTML = ``;
  donationDIV.innerHTML = ``;
  cultural.innerHTML = ``;
  cultural.className = '';
  friendsDiv.innerHTML = '';
  treasury.innerHTML = '';
  treasuryLog.innerHTML = '';
}

function clearExpedition() {
  cityinvested.innerHTML = ``;
  // output.innerHTML = ``;
  overview.innerHTML = ``;
  alerts.innerHTML = ``;
  // cityrewards.innerHTML = ``;
  donationDIV.innerHTML = ``;
  incidents.innerHTML = ``;
  donation2DIV.innerHTML = ``;
  donationDIV2.innerHTML = ``;
  greatbuilding.innerHTML = ``;
  guild.innerHTML = ``;
  debug.innerHTML = ``;
  info.innerHTML = ``;
  donationDIV.innerHTML = ``;
  visitstats.innerHTML = ``;
  visitstats.className = '';
  cultural.innerHTML = ``;
  cultural.className = '';
  friendsDiv.innerHTML = '';
  gvg.innerHTML = ``;
  gvg.className = '';
  // armyDIV.innerHTML = ``;
  treasury.innerHTML = '';
  treasuryLog.innerHTML = '';
  if (gvgSummary) gvgSummary.innerHTML = '';
  if (gvgAges) gvgAges.innerHTML = '';
}

function clearForBattleground() {
  cityinvested.innerHTML = ``;
  // output.innerHTML = ``;
  overview.innerHTML = ``;
  alerts.innerHTML = ``;
  // cityrewards.innerHTML = ``;
  donationDIV.innerHTML = ``;
  incidents.innerHTML = ``;
  donation2DIV.innerHTML = ``;
  donationDIV2.innerHTML = ``;
  greatbuilding.innerHTML = ``;
  guild.innerHTML = ``;
  debug.innerHTML = ``;
  info.innerHTML = ``;
  donationDIV.innerHTML = ``;
  visitstats.innerHTML = ``;
  visitstats.className = '';
  cultural.innerHTML = ``;
  cultural.className = '';
  friendsDiv.innerHTML = '';
  gvg.innerHTML = ``;
  gvg.className = '';
  // armyDIV.innerHTML = ``;
  treasury.innerHTML = '';
  treasuryLog.innerHTML = '';
  if (gvgSummary) gvgSummary.innerHTML = '';
  if (gvgAges) gvgAges.innerHTML = '';
}

function clearForMainCity() {
  // output.innerHTML = ``;
  // cityrewards.innerHTML = ``;
  incidents.innerHTML = ``;
  donation2DIV.innerHTML = ``;
  donationDIV2.innerHTML = ``;
  greatbuilding.innerHTML = ``;
  targets.innerHTML = ``;
  guild.innerHTML = ``;
  debug.innerHTML = ``;
  info.innerHTML = ``;
  donationDIV.innerHTML = ``;
  visitstats.innerHTML = ``;
  visitstats.className = '';
  cultural.innerHTML = ``;
  cultural.className = '';
  gvg.innerHTML = ``;
  gvg.className = '';
  // armyDIV.innerHTML = ``;
  treasury.innerHTML = '';
  treasuryLog.innerHTML = '';
  if (gvgSummary) gvgSummary.innerHTML = '';
  if (gvgAges) gvgAges.innerHTML = '';
}

function clearStartup() {
  cityinvested.innerHTML = ``;
  output.innerHTML = ``;
  overview.innerHTML = ``;
  alerts.innerHTML = ``;
  cityrewards.innerHTML = ``;
  donationDIV.innerHTML = ``;
  incidents.innerHTML = ``;
  donation2DIV.innerHTML = ``;
  donationDIV2.innerHTML = ``;
  greatbuilding.innerHTML = ``;
  guild.innerHTML = ``;
  debug.innerHTML = ``;
  info.innerHTML = ``;
  citystats.innerHTML = ``;
  donationDIV.innerHTML = ``;
  visitstats.innerHTML = ``;
  visitstats.className = '';
  cultural.innerHTML = ``;
  cultural.className = '';
  friendsDiv.innerHTML = '';
  gvg.innerHTML = ``;
  gvg.className = '';
  armyDIV.innerHTML = ``;
  treasury.innerHTML = '';
  treasuryLog.innerHTML = '';
  if (gvgSummary) gvgSummary.innerHTML = '';
  if (gvgAges) gvgAges.innerHTML = '';
  GuildDonations = [];
  GuildTreasury = [];
  //  ResourceDefs = [];
  //  PowerSoH = [];
  // PowerHoF = [];
  GuildsGoods = [];
  Bonus = {
    aid: 0,
    spoils: 0,
    diplomatic: 0,
    strike: 0,
  };
  clearRewardsState();
}

function clearCultural() {
  cityinvested.innerHTML = ``;
  // output.innerHTML = ``;
  overview.innerHTML = ``;
  // cityrewards.innerHTML = ``;
  donationDIV.innerHTML = ``;
  incidents.innerHTML = ``;
  donation2DIV.innerHTML = ``;
  donationDIV2.innerHTML = ``;
  greatbuilding.innerHTML = ``;
  guild.innerHTML = ``;
  debug.innerHTML = ``;
  info.innerHTML = ``;
  donationDIV.innerHTML = ``;
  visitstats.innerHTML = ``;
  visitstats.className = '';
  friendsDiv.innerHTML = '';
  gvg.innerHTML = ``;
  gvg.className = '';
  armyDIV.innerHTML = ``;
  treasury.innerHTML = '';
  treasuryLog.innerHTML = '';
  if (gvgSummary) gvgSummary.innerHTML = '';
  if (gvgAges) gvgAges.innerHTML = '';
}

function receiveStorage(result) {
  console.debug('result', result);
  storage.updateCache(result);

  Object.entries(result).forEach((element) => {
    const [key, value] = element;
    if (key.substring(0, 8) == 'collapse') {
      collapseOptions(key, value);
    } else if (key == 'showOptions') setOptions('showOptions', value);
    else if (key == 'ResourceDefs') {
      setResourceDefs(value);
    } else if (key == 'CityEntityDefs') {
      if (value && typeof value === 'object') {
        processMetadataData(value);
      }
      metadataLoaded = true;
      console.debug('CityEntityDefs loaded from storage:', key, value);
      if (lastStartupMsg?.responseData?.city_map?.entities) {
        resolveMissingCityEntitiesFromMap(
          lastStartupMsg.responseData.city_map.entities,
        );
      }
      if (pendingStartupMsg) {
        startupService(pendingStartupMsg);
        pendingStartupMsg = null;
      }
    } else if (key == 'BuildingEntityLookup') {
      if (value) Object.assign(BuildingEntityLookup, value);
      console.debug(
        'BuildingEntityLookup loaded from storage:',
        Object.keys(BuildingEntityLookup).length,
      );
      if (lastStartupMsg?.responseData?.city_map?.entities) {
        resolveMissingCityEntitiesFromMap(
          lastStartupMsg.responseData.city_map.entities,
        );
      }
    } else if (key == 'AllyDefs') {
      if (value && typeof value === 'object') Object.assign(AllyDefs, value);
    } else if (key == 'ResearchDefs') {
      if (value && typeof value === 'object')
        Object.assign(ResearchDefs, value);
    } else if (key == 'MilitaryDefs') {
      if (value && typeof value === 'object')
        Object.assign(MilitaryDefs, value);
    } else if (key == 'MetaIds') {
      if (value && typeof value === 'object') Object.assign(MetaIds, value);
    } else if (key == 'tool') {
      if (value.language != 'auto') {
        language = value.language;
        console.debug(language);
      }
    } else if (key == 'targets') {
      targetsTopic = value;
      // console.debug(targetsTopic);
    } else if (key == 'targetText') {
      targetText = value;
      // console.debug(targetText);
    } else if (key == 'toolOptions') {
      setToolOptions(value);
      // console.debug(toolOptions);
    } else if (key == 'donationPercent') {
      donationPercent = value;
      setCurrentPercent(value);
      // console.debug(value);
    } else if (key == 'donationSuffix') {
      donationSuffix = value;
      // console.debug(value);
    } else if (key == 'url') {
      setUrl(value);
      // console.debug(value);
    } else if (key == 'playerNameCache') {
      if (value) Object.assign(playerNameCache, value);
    } else console.debug(key, value);
  });
}

export function processTreasuryData(resources) {
  if (!resources) return;
  cityinvested.innerHTML = ``;
  output.innerHTML = ``;
  overview.innerHTML = ``;
  alerts.innerHTML = ``;
  donationDIV.innerHTML = ``;
  incidents.innerHTML = ``;
  donation2DIV.innerHTML = ``;
  donationDIV2.innerHTML = ``;
  greatbuilding.innerHTML = ``;
  guild.innerHTML = ``;
  debug.innerHTML = ``;
  info.innerHTML = ``;
  visitstats.innerHTML = ``;
  visitstats.className = '';
  cultural.innerHTML = ``;
  cultural.className = '';
  friendsDiv.innerHTML = '';
  gvg.innerHTML = ``;
  gvg.className = '';
  if (gvgSummary) gvgSummary.innerHTML = '';
  if (gvgAges) gvgAges.innerHTML = '';

  if (showOptions.showTreasury) {
    var treasuryHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
	${element.close()}<p id="treasuryTextLabel" href="#treasuryText" data-bs-toggle="collapse">`;
    treasuryHTML += element.icon(
      'treasuryicon',
      'treasuryText',
      collapse.collapseTreasury,
    );
    treasuryHTML += `<strong>Guild Treasury:</strong></p>`;
    treasuryHTML += element.copy(
      'treasuryCopyID',
      'success',
      'right',
      collapse.collapseTreasury,
    );
    treasuryHTML += `<div id="treasuryText" style="height: ${
      toolOptions.treasurySize
    }px" class="overflow-y resize collapse ${
      collapse.collapseTreasury ? '' : 'show'
    }"><table id="treasurytable" class="goods-table w-100"><thead><tr><th class="text-start">Resource</th><th class="text-end">Amount</th></tr></thead><tbody>`;

    initTreasury(resources);

    for (var i = 0; i < helper.numAges; i++) {
      var eraTreasuryText = '';
      var currentEraName = '';
      ResourceDefs.forEach((rssDef) => {
        if (
          helper.fLevelfromAge(rssDef.era) == helper.numAges - i &&
          resources[rssDef.id] !== undefined &&
          resources[rssDef.id] > 0
        ) {
          currentEraName = helper.fGVGagesname(rssDef.era);
          eraTreasuryText += `<tr><td class="text-start ps-3">${
            rssDef.name
          }</td><td class="text-end">${resources[
            rssDef.id
          ].toLocaleString()}</td></tr>`;
        }
      });
      if (eraTreasuryText) {
        treasuryHTML += `<tr><td colspan="2" class="goods-era-header">${currentEraName}</td></tr>${eraTreasuryText}`;
      }
    }
    if (resources['medals'] !== undefined && resources['medals'] > 0) {
      treasuryHTML += `<tr><td class="text-start">Medals</td><td class="text-end">${resources[
        'medals'
      ].toLocaleString()}</td></tr>`;
    }

    treasury.innerHTML = treasuryHTML + `</tbody></table></div>`;
    document
      .getElementById('treasuryCopyID')
      .addEventListener('click', copy.TreasuryCopy);
    console.debug('GuildTreasury', GuildTreasury);
    document
      .getElementById('treasuryTextLabel')
      .addEventListener('click', collapse.fCollapseTreasury);
    const treasuryDiv = document.getElementById('treasuryText');
    if (treasuryDiv) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.height)
            setTreasurySize(entry.contentRect.height);
        }
      });
      resizeObserver.observe(treasuryDiv);
    }
    translateContainer(document.body);
  }
}

export function initTreasury(resources) {
  GuildTreasury = [];
  for (var i = 0; i < helper.numAges; i++) {
    ResourceDefs.forEach((rssDef) => {
      if (
        helper.fLevelfromAge(rssDef.era) == helper.numAges - i &&
        resources[rssDef.id]
      ) {
        GuildTreasury.push([
          rssDef.id,
          helper.fGVGagesname(rssDef.era),
          rssDef.name,
          resources[rssDef.id],
          0,
          0,
          0,
          0,
        ]);
        // ID, era name, rss name, treasury qty, donation, GE spend, GBG spend, net change
      }
    });
  }
  console.debug(GuildTreasury);
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
  debugEnabled = !debugEnabled;
  var logo = document.getElementById('logo');
  if (debugEnabled == true) {
    // logo.src = bug;
    logo.outerHTML = `<span class="material-icons-outlined" id="logo">bug_report</span>`;
  } else {
    logo.outerHTML = `<img src="/icons/Icon48.png" width="24" height="24" id="logo">`;
    // logo.src = "/icons/Icon48.png";
  }
  document.getElementById('logo').addEventListener('click', toggleDebug);
  console.debug('toggleDebug', debugEnabled);
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
