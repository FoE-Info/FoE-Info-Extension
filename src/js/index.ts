// @ts-nocheck
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
import '@wikimedia/jquery.i18n/libs/CLDRPluralRuleParser/src/CLDRPluralRuleParser.js';
import '@wikimedia/jquery.i18n/src/jquery.i18n';
import '@wikimedia/jquery.i18n/src/jquery.i18n.emitter.js';
import '@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks.js';
import '@wikimedia/jquery.i18n/src/jquery.i18n.language.js';
import '@wikimedia/jquery.i18n/src/jquery.i18n.messagestore.js';
import '@wikimedia/jquery.i18n/src/jquery.i18n.parser.js';
import 'bootstrap';
import collapseOptions, * as collapse from './fn/collapse';
import browser from 'webextension-polyfill';
import * as copy from './fn/copy';
import {
  setRewardSize,
  setToolOptions,
  setTreasurySize,
  toolOptions,
} from './fn/globals';
import * as helper from './fn/helper';
import * as storage from './fn/storage';
import * as element from './fn/AddElement';
import { armyUnitManagementService } from './msg/ArmyUnitManagementService';
import { getBonuses, getLimitedBonuses } from './msg/BonusService';
import { pickupProduction } from './msg/CityProductionService';
import {
  deploySiegeArmy,
  getContinent,
  getProvinceDetailed,
  gvgAges,
  gvgSummary,
  grantIndependence,
} from './msg/ClanBattleService';
import { handleClanBattleServiceRequest } from './msg/ClanBattleRequestHandler';
import {
  conversationService,
  getConversation,
} from './msg/ConversationService';
import {
  setCurrentPercent,
} from './msg/GreatBuildingsService.js';
import { handleGreatBuildingsServiceRequest } from './msg/GreatBuildingsRequestHandler';
import {
  clearBattleground,
  getBattleground,
  getBuildings,
  getLeaderboard,
  getPlayerLeaderboard,
  getState,
} from './msg/GuildBattlegroundService.js';
import { handleGuildBattlegroundSignalsRequest } from './msg/GuildBattlegroundSignalsRequestHandler.js';
import { handleGuildBattlegroundRequest } from './msg/GuildBattlegroundRequestHandler';
import { guildExpeditionService } from './msg/GuildExpeditionService.js';
import { handleGuildExpeditionServiceRequest } from './msg/GuildExpeditionRequestHandler';
import { handleClanServiceRequest } from './msg/ClanServiceRequestHandler';
import { handleCityMapServiceRequest } from './msg/CityMapRequestHandler';
import { handleInventoryServiceRequest } from './msg/InventoryRequestHandler';
import { handleMiscRequest } from './msg/MiscRequestHandler';
import { handleOtherPlayerServiceRequest } from './msg/OtherPlayerRequestHandler';
import {
  otherPlayerService,
  otherPlayerServiceUpdateActions,
} from './msg/OtherPlayerService.js';
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
} from './msg/StartupService.js';
import { handleStartupServiceRequest } from './msg/StartupRequestHandler';
import {
  handleBlueprintServiceRequest,
  handleRewardServiceRequest,
} from './msg/RewardAndBlueprintRequestHandler';
import setOptions, { showOptions } from './vars/showOptions.js';
import '../css/main.scss';
console.debug(toolOptions);

export var debugEnabled = false;
export var availablePacksFP = 0;
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
export var CityProtections = [];
export var MilitaryDefs = [];
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
export var Goods = {
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
export var GameOrigin = '';

export var donationPercent = 190;
export var donationSuffix = '';

export var Bonus = {
  aid: 0,
  spoils: 0,
  diplomatic: 0,
  strike: 0,
};

export var url = [];

var rewardsGE = [];
var rewardsGBG = [];
var rewardsGeneric = [];
export var rewardsArmy = [];
export var rewardsCity = [];
var rewardsOtherPlayer = [];

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
const panelParams = new URLSearchParams(window.location.search);
export var uiMode =
  panelParams.get('uiMode') === 'traditional' ? 'traditional' : 'classic';
document.body.setAttribute('data-ui-mode', uiMode);
document.body.classList.add(`ui-mode-${uiMode}`);
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
newelement = document.createElement('div');
newelement.innerHTML = `<span class="material-icons-outlined md-18 options-icon">settings</span>`;
newelement.classList.toggle('p-2');
// newelement.className = "p-2";
// child = document.createElement("img");
var svgNS = 'http://www.w3.org/2000/svg';
// child = document.createElementNS(svgNS,"svg");
// child = document.createElement("div");
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

const safeJsonParse = (text, context) => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn(`Failed to parse JSON (${context})`, error);
    return null;
  }
};

const addAvailablePacksFP = (amount) => {
  availablePacksFP += amount;
};

const setAvailablePacksFP = (amount) => {
  availablePacksFP = amount;
};

const getAvailablePacksFP = () => {
  return availablePacksFP;
};

const setAvailableFPText = () => {
  if (document.getElementById('availableFPID'))
    document.getElementById('availableFPID').textContent =
      availablePacksFP + availableFP;
};

const getPlayerID = () => {
  return PlayerID;
};

const setPlayerState = (name, id) => {
  PlayerName = name;
  PlayerID = id;
};

const getPlayerName = () => {
  return PlayerName;
};

const setCityProtections = (protections) => {
  CityProtections = protections;
};

const setGameOrigin = (origin) => {
  GameOrigin = origin;
};

const getGameOrigin = () => {
  return GameOrigin;
};

const isMetadataLoaded = () => {
  return metadataLoaded;
};

const setPendingStartupMessage = (msg) => {
  pendingStartupMsg = msg;
};

const setEpocTime = (time) => {
  EpocTime = time;
};

const setHiddenRewards = (rewards) => {
  hiddenRewards = rewards;
};

const getCulturalDiv = () => {
  return cultural;
};

const setCulturalDiv = (newCultural) => {
  cultural = newCultural;
};

const getTotalAvailableFP = () => {
  return availablePacksFP + availableFP;
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
      darkMode = 'dark';
    } else {
      console.log('change to light mode!');
      darkMode = 'light';
    }
  });
function onEvent(message, params) {
  console.debug(message, params);
}

// browser.storage.local.clear();
browser.permissions
  .contains({
    permissions: ['storage'],
  })
  .then((result) => {
    // if(checkBeta())
    console.debug(result);
    if (result) {
      // The extension has the permissions.
      // browser.storage.local.get(null, function(items) {
      // 	console.debug(items);
      // });
      // browser.storage.local.clear();

      browser.storage.local.getBytesInUse(null).then((size) => {
        console.debug('getBytesInUse', size);
      });

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
            it: {
              load: 'Carica il gioco per vedere le statistiche della tua città',
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
            $('body').i18n();
            console.debug(
              'jQuery ' + (jQuery ? $().jquery : 'NOT') + ' loaded',
            );
            console.debug('i18n.load OK');
          });
      });
    } else {
      // The extension doesn't have the permissions.
      citystats.innerHTML = `<div class="alert alert-danger"><p><strong>Please Enable FoE-Info</strong></p>
							  <button type="button" class="btn btn-danger" id="enableFoE">Enable</button></div>`;
      citystats.className = 'alert alert-danger';
      document
        .getElementById('enableFoE')
        .addEventListener('click', function () {
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

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    return {
      requestHeaders: details.requestHeaders.filter((x) => !originWithId(x)),
    };
  },
  { urls: ['https://*.innogamescdn.com/*'] },
  ['requestHeaders'],
);

browser.devtools.network.onRequestFinished.addListener(handleRequestFinished);

// When a network request has finished this function will be called.
// browser.devtools.network.onRequestFinished.addListener().then(request => {
function handleRequestFinished(request) {
  // console.log("Server IP: ", request.serverIPAddress);

  const response = request.response;
  if (request._resourceType == 'websocket') {
    console.debug('request', request._resourceType, request, response);
  }
  // console.debug('request',request);
  // console.debug('response',response);
  var contentType = '';
  var contentHeader = '';

  if (response.httpVersion == 'http/2.0')
    contentHeader = response.headers.find(
      (header) => header.name === 'content-type',
    );
  else
    contentHeader = response.headers.find(
      (header) => header.name === 'Content-Type',
    );

  if (contentHeader) {
    contentType = getType(contentHeader.value);
  }

  // if (contentType == "json") {
  if (
    request.request.url.match(
      /https:\/\/.*\.forgeofempires\.com\/game\/json\?h=/g,
    ) ||
    request.request.url.match(
      /https:\/\/foe.*\.innogamescdn\.com\/start\/metadata\?id=(.*)/g,
    )
  ) {
    // console.debug(request.request.headers);
    contentType = request.request.headers.find(
      (header) => header.name === 'client-identification',
    );
    // if(contentType) console.debug('client-identification:', contentType.value.substr(8,5));
    // else{
    // 	contentType = request.request.headers.find(header => header.name === 'Client-Identification')
    // 	// if(contentType) console.debug('Client-Identification:', contentType.value.substr(8,5));

    // }

    if (
      contentType &&
      contentType.value &&
      GameVersion != contentType.value.substr(8, 5)
    ) {
      GameVersion = contentType.value.substr(8, 5);
      citystats.innerHTML += `<div><span data-i18n="gameversion">Game Version</span>: ${GameVersion}<br>${EXT_NAME}: ${tool.version}</div>`;
      // console.debug('version:', GameVersion);
    }

    request.getContent().then(async ([body, mimeType]) => {
      // console.log("Content: ", body);
      // console.log("MIME type: ", mimeType);
      const parsed = safeJsonParse(body, 'network response body');
      if (!parsed) {
        return;
      }
      // console.debug('parsed:', parsed);
      if (parsed && parsed.length) {
        for (var i = 0; i < parsed.length; i++) {
          const msg = parsed[i];

          console.debug('msg', msg);

          // check if this is static data service info that holds all URLs to all metadata files
          if (
            msg.requestClass === 'StaticDataService' &&
            msg.requestMethod == 'getMetadata'
          ) {
            try {
              const requests = msg.responseData.map((item) =>
                fetch(item.url)
                  .then((r) => r.json())
                  .catch((err) => {
                    console.error('Failed loading metadata', item.url, err);
                    return null;
                  }),
              );
              const results = await Promise.all(requests);

              results.forEach((data, idx) => {
                if (!data) return;
                const identifier = msg.responseData[idx].identifier;
                if (identifier === 'city_entities') {
                  data.forEach(function (msg) {
                    if (
                      msg.__class__ &&
                      msg.__class__.substring(0, 10) == 'CityEntity'
                    ) {
                      if (!CityEntityDefs[msg.id]) {
                        CityEntityDefs[msg.id] = {
                          name: msg.name,
                          abilities: [],
                          entity_levels: [],
                          available_products: [],
                        };
                      }
                      CityEntityDefs[msg.id] = msg;
                    } else if (
                      msg.__class__ &&
                      msg.__class__ == 'GenericCityEntity'
                    ) {
                      if (!CityEntityDefs[msg.id]) {
                        CityEntityDefs[msg.id] = {
                          name: msg.name,
                          abilities: [],
                          entity_levels: [],
                          available_products: [],
                        };
                      }
                      CityEntityDefs[msg.id] = msg;
                    }
                  });
                }
              });
              metadataLoaded = true;
            } catch (err) {
              console.error('Metadata fetch failed', err);
              for (const item of msg.responseData) {
                try {
                  const resp = await fetch(item.url);
                  const data = await resp.json();
                  data.forEach(processMetadataEntry);
                } catch (e) {
                  console.error('metadata fetch failed', item, e);
                }
              }
              storage.set('CityEntityDefs', CityEntityDefs);
              metadataLoaded = true;
              if (pendingStartupMsg) {
                startupService(pendingStartupMsg);
                pendingStartupMsg = null;
              }
            }
          } else if (
            msg.requestClass == 'CampaignService' &&
            msg.requestMethod == 'getDeposits'
          ) {
            /*CampaignService*/
          } else if (
            handleOtherPlayerServiceRequest(msg, {
              helper,
              GBselected,
              getPlayerID,
              clearVisitPlayer,
              otherPlayerService,
              otherPlayerServiceUpdateActions,
              showOptions,
              rewardsOtherPlayer,
              showReward,
              setPlayerState,
              setCityProtections,
            })
          ) {
            // handled in module
          } else if (
            handleInventoryServiceRequest(msg, {
              CityEntityDefs,
              availableFP,
              setAvailablePacksFP,
            })
          ) {
            // handled in module
          } else if (
            handleMiscRequest(msg, {
              conversationService,
              getConversation,
              armyUnitManagementService,
              clearStartup,
              clearBattleground,
              ignoredPlayers,
              setEpocTime,
              clearForMainCity,
              helper,
              getResourceDefinitions,
              getPlayerResources,
              MyInfo,
              showOptions,
              citystats,
              setHiddenRewards,
              emissaryService,
              getCultural: getCulturalDiv,
              setCultural: setCulturalDiv,
              Resources,
              collapse,
              element,
              showCultural: { clearCultural },
              getBonuses,
              getLimitedBonuses,
              boostService,
              boostServiceAllBoosts,
            })
          ) {
            // handled in module
          } else if (
            handleCityMapServiceRequest(msg, {
              MyInfo,
              GBselected,
              helper,
              setPlayerName,
              element,
              collapse,
              PlayerName: getPlayerName,
              info,
              showOptions,
            })
          ) {
            // handled in module
          } else if (
            handleStartupServiceRequest(msg, request, {
              setGameOrigin,
              getGameOrigin,
              MyInfo,
              receiveStorage,
              output,
              overview,
              cityinvested,
              cityrewards,
              incidents,
              donationDIV,
              greatbuilding,
              gvg,
              guild,
              citystats,
              visitstats,
              cultural,
              metadataLoaded: isMetadataLoaded,
              startupService,
              setPendingStartupMsg: setPendingStartupMessage,
            })
          ) {
            // handled in module
          } else if (msg.requestClass == 'RewardService') {
            handleRewardServiceRequest(msg, showOptions, showReward);
          } else if (
            msg.requestClass == 'CityProductionService' &&
            msg.requestMethod == 'pickupProduction'
          ) {
            /*pickupProduction */
            //console.debug('cityentity_id:', msg.responseData.cityentity_id);
            pickupProduction(msg);
          } else if (
            msg.requestClass == 'BlueprintService' &&
            msg.requestMethod == 'newReward'
          ) {
            handleBlueprintServiceRequest(msg, {
              helper,
              showOptions,
              collapse,
              element,
              cityrewards,
              rewardObserve,
              addAvailablePacksFP,
              getTotalAvailableFP,
            });
          } else if (msg.requestClass == 'GreatBuildingsService') {
            if (
              handleGreatBuildingsServiceRequest(
                msg,
                request,
                safeJsonParse,
                {
                  showOptions,
                  cityinvested,
                  City,
                  availablePacksFP: getAvailablePacksFP,
                  availableFP,
                  element,
                  collapse,
                  copy,
                  setPlayerName,
                  setAvailablePacksFP,
                  setAvailableFPText,
                },
              )
            ) {
              // handled in module
            }
          } else if (msg.requestClass == 'ClanBattleService') {
            if (
              !handleClanBattleServiceRequest(msg, {
                clearForGVG: fCleardForGVG,
                getContinent,
                getProvinceDetailed,
                deploySiegeArmy,
                grantIndependence,
              })
            ) {
              console.debug('ClanBattleService', msg);
            }
          } else if (msg.requestClass == 'GuildExpeditionService') {
            if (
              !handleGuildExpeditionServiceRequest(msg, {
                clearExpedition,
                showOptions,
                guildExpeditionService,
                helper,
                rewardsGE,
                showReward,
              })
            ) {
              console.debug('GuildExpeditionService', msg);
            }
          } else if (
            handleGuildBattlegroundRequest(msg, {
              showOptions,
              clearForBattleground,
              getLeaderboard,
              getPlayerLeaderboard,
              getBattleground,
              getState,
              getBuildings,
            })
          ) {
            // handled in module
          } else if (msg.requestClass == 'GuildBattlegroundSignalsService') {
            // GuildBattleground
            if (!handleGuildBattlegroundSignalsRequest(msg, request, safeJsonParse)) {
              console.debug('GuildBattlegroundSignalsService', msg);
            }
            // console.debug("GuildBattlegroundSignalsService", msg,JSON.parse(request.request.postData.text));
          } else if (
            msg.__class__ &&
            msg.__class__.substring(0, 17) == 'GuildBattleground'
          ) {
            if (
              msg.__class__ &&
              msg.__class__ == 'GuildBattlegroundMapMetadata'
            ) {
              if (msg.id == 'volcano_archipelago') {
                VolcanoProvinceDefs = msg.provinces;
                VolcanoProvinceDefs[0].id = 0;
              } else if (msg.id == 'waterfall_archipelago') {
                WaterfallProvinceDefs = msg.provinces;
                WaterfallProvinceDefs[0].id = 0;
              } else console.debug(msg);
            } else if (
              msg.__class__ &&
              msg.__class__ == 'GuildBattlegroundLeagueMetadata'
            ) {
              // console.debug('GuildBattlegroundLeagueMetadata',msg);
            } else if (
              msg.__class__ &&
              msg.__class__ == 'GuildBattlegroundBuildingMetadata'
            ) {
              // console.debug('GuildBattlegroundLeagueMetadata',msg);
              if (!BuildingDefs[msg.id]) {
                // CityEntityDefs[msg.id] = [];
                // Object.defineProperty(CityEntityDefs, msg.id, {
                // 	'name' : msg.name,
                // 	'abilities' : {},
                // 	'entity_levels' : {},
                // 	'available_products' : {},
                // });
                BuildingDefs[msg.id] = {
                  name: msg.name,
                  buildingTime: msg.buildingTime,
                  description: msg.description,
                };
              }
            } else console.debug('GuildBattleground', msg);
          } else if (
            handleClanServiceRequest(msg, {
              showOptions,
              element,
              collapse,
              helper,
              copy,
              friendsDiv,
              MyInfo,
              setMyGuildPosition,
              GuildDonations,
              GuildTreasury,
              ResourceDefs,
              treasuryLog,
              treasury,
              cityinvested,
              output,
              overview,
              alerts,
              donationDIV,
              incidents,
              donation2DIV,
              donationDIV2,
              greatbuilding,
              guild,
              debug,
              info,
              visitstats,
              cultural,
              gvg,
              gvgSummary,
              gvgAges,
              toolOptions,
              initTreasury,
              setTreasurySize,
            })
          ) {
            // handled in module
          } else {
            // output.innerHTML += `<div>*** ${msg.requestClass}</div>`;
            if (msg.requestClass == null) {
              processMetadataEntry(msg);
            }
          }
        }
        // console.debug(parsed);
        if (debugEnabled == true) {
          // output.innerHTML += `<div></div>`;
          // output.innerHTML += `<div>${body}</div>`;
          // output.innerHTML += `<div></div>`;
        }
      } else {
        // console.debug('parsed:', parsed);
        if (parsed && parsed.player_name && parsed.worlds) {
          worlds = parsed.worlds;
          console.debug('worlds', worlds);
        }
      }
    });
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
      url = storageChange.newValue;
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

export function setMyGuild(name) {
  MyInfo.guild = name;
}

export function setMyGuildID(id) {
  MyInfo.guildID = id;
}

export function setMyGuildPermissions(permissions) {
  MyGuildPermissions = permissions;
}

export function setMyGuildPosition(id) {
  MyInfo.guildPosition = id;
  storage.set(GameOrigin + 'MyInfo', MyInfo);
}

export function setPlayerName(name, id) {
  PlayerName = name;
  PlayerID = id;
  GBselected.player_name = name;
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
  rewardsGE = [];
  rewardsGBG = [];
  rewardsGeneric = [];
  rewardsArmy = [];
  rewardsCity = [];
  rewardsOtherPlayer = [];
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

  // // console.debug('showIncidents', showIncidents);
  // else
  // 	storage.set('showOptions',showOptions);
  // if(result.collapseOptions){
  // 	// console.debug('result', result,collapseOptions);
  // 	// collapseOptions = result.collapseOptions;
  // 	collapseOptions('collapseOptions',result.collapseOptions);
  // }
  // console.debug('result', result);
  Object.entries(result).forEach((element) => {
    // if(element.toString)
    // console.debug(element);
    const [key, value] = element;
    // console.debug(key,value,key.substring(0,8));
    if (key.substring(0, 8) == 'collapse') {
      // console.debug(key,value);
      collapseOptions(key, value);
    } else if (key == 'showOptions') setOptions('showOptions', value);
    else if (key == ResourceDefs) {
      // if(key == ResourceDefs)
      setResourceDefs(value);
    } else if (key == 'CityEntityDefs') {
      // if(key == CityEntityDefs)
      CityEntityDefs = value;
      console.debug(key, value);
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
      url = value;
      // console.debug(value);
    } else console.debug(key, value);
  });
}

export function initTreasury(resources) {
  for (var i = 0; i < helper.numAges; i++) {
    ResourceDefs.forEach((rssDef) => {
      if (
        rssDef.era == helper.fAgefromLevel(helper.numAges - i) &&
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
          0,
        ]);
        // ID, era name, rss name, treasury qty, donation, GE spend, GVG spend, GBG spend, net change
      }
    });
  }
  console.debug(GuildTreasury);
}

export function showReward(reward) {
  var rewardId = 'collectRewardText';
  var rewardTitle = '';
  // var rewards = [];
  var name = helper.fRewardShortName(reward.name);
  var qty = reward.amount;
  // if((reward.type = 'good' && !reward.subType == 'rogue') || reward.id.includes('goods#each#CurrentEra'))
  if (reward.totalAmount) qty = reward.totalAmount;
  if (reward.source == 'guildExpedition') {
    rewardTitle = 'GE ';
    rewardId = 'collectGERewardText';
    if (!rewardsGE[name]) rewardsGE[name] = 0;
    rewardsGE[name] += qty;
    console.debug('rewardsGE:', rewardsGE, reward);
    // rewards = rewardsGE;
  } else if (reward.source == 'battlegrounds_conquest') {
    rewardTitle = 'GBG ';
    rewardId = 'collectGBGRewardText';
    if (!rewardsGBG[name]) rewardsGBG[name] = 0;
    rewardsGBG[name] += qty;
    console.debug('rewardsGBG:', rewardsGBG, reward);
    // rewards = rewardsGBG;
  } else if (
    reward.source == 'otherPlayer' ||
    reward.source == 'pickupProduction'
  ) {
    // reward already stored. so just show it
  } else {
    rewardTitle = 'Other ';
    rewardId = 'collectRewardText';
    if (reward.type == 'resource')
      name = helper.fResourceShortName(reward.subType);
    if (!rewardsGeneric[name]) rewardsGeneric[name] = 0;
    rewardsGeneric[name] += qty;
    console.debug('rewardsGeneric:', rewardsGeneric, reward);
    // rewards = rewardsGeneric;
  }
  var text = '';
  if (Object.keys(rewardsGE).length) {
    text += '<p><em>GE</em><br>';
    Object.keys(rewardsGE).forEach((item) => {
      // console.debug(item);
      text += `${rewardsGE[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsGBG).length) {
    text += '<p><em>GBG</em><br>';
    Object.keys(rewardsGBG).forEach((item) => {
      // console.debug(item);
      text += `${rewardsGBG[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsGeneric).length) {
    text += '<p><em>Event/City</em><br>';
    Object.keys(rewardsGeneric).forEach((item) => {
      // console.debug(item);
      text += `${rewardsGeneric[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsOtherPlayer).length) {
    text += '<p><em>Aid/Plunder</em><br>';
    Object.keys(rewardsOtherPlayer).forEach((item) => {
      // console.debug(item);
      text += `${rewardsOtherPlayer[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsCity).length) {
    text += '<p><em>City</em><br>';
    Object.keys(rewardsCity).forEach((item) => {
      // console.debug(item);
      text += `${rewardsCity[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsArmy).length) {
    text += '<p><em>Army</em><br>';
    Object.keys(rewardsArmy).forEach((item) => {
      // console.debug(item);
      text += `${rewardsArmy[item]} ${item}<br>`;
    });
    text += '</p>';
  }

  cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel" href="#rewardsText" data-bs-toggle="collapse">
  ${element.icon('rewardsicon', 'rewardsText', collapse.collapseRewards)}
	<strong><span data-i18n="reward">REWARDS:</span></strong></p>
	${element.close()}
	<div id="rewardsText" stype="height: 400px" class="overflow resize collapse ${
    collapse.collapseRewards ? '' : 'show'
  }">${text}</div></div>`;
  rewardObserve();
  document
    .getElementById('rewardsTextLabel')
    .addEventListener('click', collapse.fCollapseRewards);
}

export function showRewards(rewards) {
  var rewardTitle = '';
  var text = '';
  // var rewards = [];

  rewards.forEach((reward) => {
    var name = helper.fRewardShortName(reward.name);
    var qty = reward.amount;
    if (reward.source == 'autoAid') {
      rewardTitle = 'City ';
      if (reward.type == 'resource') {
        console.debug('autoAid:resource', reward.subType, qty, reward);
        if (rewardsCity[reward.subType]) rewardsCity[reward.subType] += qty;
        else rewardsCity[reward.subType] = qty;
      } else if (reward.type == 'blueprint') {
        console.debug(
          'autoAid:resource',
          helper.fGBsname(reward.subType) + ' ' + name,
          qty,
          reward,
        );
        if (rewardsCity[helper.fGBsname(reward.subType) + ' ' + name])
          rewardsCity[helper.fGBsname(reward.subType) + ' ' + name] += qty;
        else rewardsCity[helper.fGBsname(reward.subType) + ' ' + name] = qty;
      } else {
        if (rewardsCity[reward.subType]) rewardsCity[reward.subType] += qty;
        else rewardsCity[reward.subType] = qty;
      }

      console.debug('autoAid:', rewardsCity, reward);
      // rewards = rewardsGE;
    } else {
      rewardTitle = 'Other ';
      if (reward.type == 'resource')
        name = helper.fResourceShortName(reward.subType);
      if (!rewardsGeneric[name]) rewardsGeneric[name] = 0;
      rewardsGeneric[name] += qty;
      console.debug('rewardsGeneric:', rewardsGeneric, reward);
      // rewards = rewardsGeneric;
    }
    if (Object.keys(rewardsGE).length) {
      text += '<p><em>GE</em><br>';
      Object.keys(rewardsGE).forEach((item) => {
        console.debug(item);
        text += `${rewardsGE[item]} ${item}<br>`;
      });
      text += '</p>';
    }
    if (Object.keys(rewardsGBG).length) {
      text += '<p><em>GBG</em><br>';
      Object.keys(rewardsGBG).forEach((item) => {
        console.debug(item);
        text += `${rewardsGBG[item]} ${item}<br>`;
      });
      text += '</p>';
    }
    if (Object.keys(rewardsGeneric).length) {
      text += '<p><em>Event/City</em><br>';
      Object.keys(rewardsGeneric).forEach((item) => {
        console.debug(item);
        text += `${rewardsGeneric[item]} ${item}<br>`;
      });
      text += '</p>';
    }
    if (Object.keys(rewardsOtherPlayer).length) {
      text += '<p><em>Aid/Plunder</em><br>';
      Object.keys(rewardsOtherPlayer).forEach((item) => {
        console.debug(item);
        text += `${rewardsOtherPlayer[item]} ${item}<br>`;
      });
      text += '</p>';
    }
    if (Object.keys(rewardsCity).length) {
      text += '<p><em>City</em><br>';
      Object.keys(rewardsCity).forEach((item) => {
        console.debug(item);
        text += `${rewardsCity[item]} ${item}<br>`;
      });
      text += '</p>';
    }
    if (Object.keys(rewardsArmy).length) {
      text += '<p><em>Army</em><br>';
      Object.keys(rewardsArmy).forEach((item) => {
        console.debug(item);
        text += `${rewardsArmy[item]} ${item}<br>`;
      });
      text += '</p>';
    }
  });

  cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel" href="#rewardsText" data-toggle="collapse">
  ${element.icon('rewardsicon', 'rewardsText', collapse.collapseRewards)}
	<span data-i18n="reward"><strong>REWARDS:</strong></span></p>
	${element.close()}
	<div id="rewardsText" class="overflow resize collapse ${collapse.collapseRewards ? '' : 'show'}">${text}</div></div>`;
  rewardObserve();
  document
    .getElementById('rewardsTextLabel')
    .addEventListener('click', collapse.fCollapseRewards);
}

function rewardObserve() {
  $('#rewards').i18n();
  const rewardDiv = document.getElementById('rewardsText');
  rewardDiv.addEventListener('mouseup', setHeight);
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.contentRect && entry.contentRect.height)
        heightRewards = entry.contentRect.height;
    }
  });
  resizeObserver.observe(rewardDiv);
  if ($('#rewardsText').height() > toolOptions.rewardSize) {
    $('#rewardsText').height(toolOptions.rewardSize);
  }
}

function processMetadataEntry(msg) {
  if (
    msg.__class__ &&
    (msg.__class__ == 'CityEntityCulturalGoodsBuilding' ||
      msg.__class__ == 'CityEntityImpediment' ||
      msg.__class__ == 'CityEntityDiplomacy' ||
      msg.__class__ == 'CityEntityStaticProvider' ||
      msg.__class__ == 'CityEntityStreet' ||
      msg.__class__ == 'CityEntityHub' ||
      msg.__class__ == 'CityEntityOutpostShip' ||
      msg.__class__ == 'QuestTabMetadata' ||
      msg.__class__ == 'ChainMetadata' ||
      msg.__class__ == 'BuildingSetMetadata' ||
      msg.__class__ == 'InfoScreen' ||
      msg.type == 'off_grid')
  ) {
    return;
  } else if (msg.__class__ && msg.__class__.substring(0, 10) == 'CityEntity') {
    if (!CityEntityDefs[msg.id]) {
      CityEntityDefs[msg.id] = {
        name: msg.name,
        abilities: [],
        entity_levels: [],
        available_products: [],
      };
    }
    CityEntityDefs[msg.id] = msg;
  } else if (msg.__class__ && msg.__class__ == 'GenericCityEntity') {
    if (!CityEntityDefs[msg.id]) {
      CityEntityDefs[msg.id] = {
        name: msg.name,
        abilities: [],
        entity_levels: [],
        available_products: [],
      };
    }
    CityEntityDefs[msg.id] = msg;
  } else if (msg.__class__ && msg.__class__ == 'UnitType') {
    MilitaryDefs[msg.unitTypeId] = {
      name: msg.name,
      era: msg.minEra,
    };
  } else if (msg.__class__ && msg.__class__ == 'CastleSystemLevelMetadata') {
    CastleDefs.push(msg);
  } else if (msg.__class__ && msg.__class__ == 'SelectionKitMetadata') {
    SelectionKitDefs.push(msg);
  } else if (msg.__class__ && msg.__class__ == 'BoostMetadata') {
    BoostMetadataDefs.push(msg);
  } else if (
    msg.__class__ &&
    msg.__class__.substring(0, 18) == 'CityEntityCultural'
  ) {
    // ignore
  } else if (msg.__class__ && msg.__class__ == 'BuildingUpgrade') {
    // ignore
  } else if (msg.__class__ && msg.__class__ == 'CityMapEntity') {
    if (msg.id == 'W_MultiAge_WIN22A11b') {
      console.info(msg.name, msg);
    }
  } else if (!msg.__class__) {
    return;
  } else {
    console.debug(msg.name, msg);
  }
}

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

export function removeDebug() {
  document.getElementById('logo').removeEventListener('click', toggleDebug);
}

export function checkDebug() {
  return debugEnabled;
}

var heightRewards = toolOptions.rewardSize;
function setHeight() {
  console.debug('mouseup', heightRewards);
  setRewardSize(heightRewards);
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
