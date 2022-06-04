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
import "@wikimedia/jquery.i18n/libs/CLDRPluralRuleParser/src/CLDRPluralRuleParser.js";
import "@wikimedia/jquery.i18n/src/jquery.i18n";
import "@wikimedia/jquery.i18n/src/jquery.i18n.emitter.js";
import "@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks.js";
import "@wikimedia/jquery.i18n/src/jquery.i18n.language.js";
import "@wikimedia/jquery.i18n/src/jquery.i18n.messagestore.js";
import "@wikimedia/jquery.i18n/src/jquery.i18n.parser.js";
import BigNumber from "bignumber.js";
import 'bootstrap';
import icons from 'bootstrap-icons/bootstrap-icons.svg';
// import "bootstrap-icons/font/bootstrap-icons.css";
import tools from 'bootstrap-icons/icons/tools.svg';
// import 'bootstrap/dist/css/bootstrap.min.css';
import collapseOptions, * as collapse from './fn/collapse.js';
import browser from 'webextension-polyfill';
import * as copy from './fn/copy.js';
// import '../css/nordstrap.css';
// @import "nordbootstrap.css";
// import "nord";
// @import "node_modules/nord/src/nord.css";
import { setRewardSize, setToolOptions, setTreasurySize, toolOptions } from './fn/globals.js';
import * as helper from './fn/helper.js';
import * as storage from './fn/storage.js';
import { armyUnitManagementService } from './msg/ArmyUnitManagementService.js';
import { getBonuses, getLimitedBonuses } from './msg/BonusService.js';
import { pickupProduction } from './msg/CityProductionService.js';
import { deploySiegeArmy, getContinent, getProvinceDetailed, gvgAges, gvgSummary } from './msg/ClanBattleService.js';
import { conversationService, getConversation } from './msg/ConversationService.js';
import { contributeForgePoints, getConstruction, getConstructionRanking, setCurrentPercent } from './msg/GreatBuildingsService.js';
import { clearBattleground, getBattleground, getBuildings, getLeaderboard, getPlayerLeaderboard, getState, removeSignal, setSignal } from './msg/GuildBattlegroundService.js';
import { guildExpeditionService } from './msg/GuildExpeditionService.js';
import { otherPlayerService, otherPlayerServiceUpdateActions } from './msg/OtherPlayerService.js';
import { availableFP, getPlayerResources, getResourceDefinitions, ResourceDefs, Resources, setResourceDefs } from './msg/ResourceService.js';
import { boostService, boostServiceAllBoosts, City, emissaryService, startupService } from './msg/StartupService.js';
import setOptions, { showOptions } from './vars/showOptions.js';
import '../css/main.scss';
console.debug(toolOptions);

let contentTypes = {};
var debugEnabled = false;
export var availablePacksFP = 0;
export var PlayerName = "";
export var PlayerID = 0;
export var worlds = [];

export var MyInfo = {
	name: "",
	era: "",
	id: 0,
	guild: "",
	guildID: 0,
	guildPosition: 0,
	createdAt: 0
};

export var ignoredPlayers = {
	ignoredByPlayerIds: {},
	ignoredPlayerIds: {}
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
	total: 0
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
export var hiddenRewards = [];
export var Goods = {
sajm:0,
sav:0,
saab:0,
sam:0,
vf:0,
of:0,
af:0,
tf:0,
te:0,
ce:0,
pme:0,
me:0,
pe:0,
ina:0,
cma:0,
lma:0,
hma:0,
ema:0,
ia:0,
ba:0,
noage:0
};
export var EpocTime = 0;
var GameVersion = 0;
export var GameOrigin = "";



export var donationPercent = 190;
export var donationSuffix = '';

export var Bonus = {
    aid : 0,
    spoils : 0,
    diplomatic : 0,
    strike : 0
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
// if (window.matchMedia && 
//     window.matchMedia('(prefers-color-scheme: dark)').matches) {
// //   img.style.filter="invert(100%)";
// 		console.debug('dark mode',window.matchMedia('(prefers-color-scheme: dark)').matches);
// 		// darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
// }
console.info('themeName',browser.devtools.panels.themeName);
var title = document.createElement("div");
document.body.appendChild(title);
title.id="title";
title.className = "d-flex flex-row justify-content-between";

// TODO fix dark theme
if(darkMode == 'dark'){
	title.className = 'd-flex flex-row justify-content-between text-light bg-dark';
    // --color-background = 'bg-dark';

}

	// <div class="p-2"><img src="${./src/icons/Icon24.png}" /></div>
{/* <svg id="go-to-options" viewBox="0 0 16 16" width="16px" height="16px"><use xlink:href="${bootstrap-icons/icons/tools.svg#tools}"/></svg> */}
// title.innerHTML =  `<div class="d-flex flex-row justify-content-between">
	// <div class="p-2"><img src="${./src/icons/Icon24.png}" /></div>
	// <div class="p-8">
	// 	<h6>EXT_NAME-dev</h6>
	// </div>
	// <div class="p-2">
	// </div>
	// </div>`;

	var element = document.body;
// TODO fix dark theme
	if(darkMode == 'dark'){
	// 	element.classList.toggle("nord-styles");
	// 	element.classList.toggle("dark-mode");
		element.classList.toggle("bg-dark");
	}
	// else
		element.classList.toggle("bootstrap-styles");
	element = document.createElement("div");
	element.className = "p-2";
	title.appendChild(element);
	var child = document.createElement("img");
	child.src = "/icons/Icon48.png";
	child.width = '24';
	child.height = '24';
	child.id = "logo";
	if(DEV)	child.addEventListener("click", toggleDebug);
	element.appendChild(child);
	element = document.createElement("div");
	element.className = "p-8 title";
	title.appendChild(element);
	child = document.createElement("h6");
// TODO fix dark theme
	if(darkMode == 'dark')
		child.className = 'title text-light bg-dark';
	else
		child.className = 'title';
	// child.innerHTML = pkg.name;
	child.textContent = EXT_NAME;
	element.appendChild(child);
	element = document.createElement("div");
	element.innerHTML = `<svg class="bi text-light" width="24" height="24" fill="currentColor"><use xlink:href="${icons}#tools"/></svg>`;
	element.classList.toggle("p-2");
	// element.className = "p-2";
	// child = document.createElement("img");
	var svgNS = "http://www.w3.org/2000/svg";  
	// child = document.createElementNS(svgNS,"svg");
	// child = document.createElement("div");
	element.id="go-to-options";
	// child.className = 'text-light';
	// child.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi ${darkMode == 'dark' ? 'text-light bg-dark' : ''}" viewBox="0 0 16 16">
	// <path d="M1 0L0 1l2.2 3.081a1 1 0 0 0 .815.419h.07a1 1 0 0 1 .708.293l2.675 2.675-2.617 2.654A3.003 3.003 0 0 0 0 13a3 3 0 1 0 5.878-.851l2.654-2.617.968.968-.305.914a1 1 0 0 0 .242 1.023l3.356 3.356a1 1 0 0 0 1.414 0l1.586-1.586a1 1 0 0 0 0-1.414l-3.356-3.356a1 1 0 0 0-1.023-.242L10.5 9.5l-.96-.96 2.68-2.643A3.005 3.005 0 0 0 16 3c0-.269-.035-.53-.102-.777l-2.14 2.141L12 4l-.364-1.757L13.777.102a3 3 0 0 0-3.675 3.68L7.462 6.46 4.793 3.793a1 1 0 0 1-.293-.707v-.071a1 1 0 0 0-.419-.814L1 0zm9.646 10.646a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708zM3 11l.471.242.529.026.287.445.445.287.026.529L5 13l-.242.471-.026.529-.445.287-.287.445-.529.026L3 15l-.471-.242L2 14.732l-.287-.445L1.268 14l-.026-.529L1 13l.242-.471.026-.529.445-.287.287-.445.529-.026L3 11z"/>
//   </svg>`;



//   child.width = '24';
//   child.height = '24';
//   child.id = "tools";
//   if(DEV)	child.addEventListener("click", toggleDebug);
//   element.appendChild(child);
	

	// element.width = '20';
	// element.height = '20';
	// child.setAttribute("color", "red");
	// child.setAttribute("fill", "blue");
	// child.setAttribute('src',tools );
	// child.setAttribute('data',`M1 0L0 1l2.2 3.081a1 1 0 0 0 .815.419h.07a1 1 0 0 1 .708.293l2.675 2.675-2.617 2.654A3.003 3.003 0 0 0 0 13a3 3 0 1 0 5.878-.851l2.654-2.617.968.968-.305.914a1 1 0 0 0 .242 1.023l3.356 3.356a1 1 0 0 0 1.414 0l1.586-1.586a1 1 0 0 0 0-1.414l-3.356-3.356a1 1 0 0 0-1.023-.242L10.5 9.5l-.96-.96 2.68-2.643A3.005 3.005 0 0 0 16 3c0-.269-.035-.53-.102-.777l-2.14 2.141L12 4l-.364-1.757L13.777.102a3 3 0 0 0-3.675 3.68L7.462 6.46 4.793 3.793a1 1 0 0 1-.293-.707v-.071a1 1 0 0 0-.419-.814L1 0zm9.646 10.646a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708zM3 11l.471.242.529.026.287.445.445.287.026.529L5 13l-.242.471-.026.529-.445.287-.287.445-.529.026L3 15l-.471-.242L2 14.732l-.287-.445L1.268 14l-.026-.529L1 13l.242-.471.026-.529.445-.287.287-.445.529-.026L3 11z` );

  

	title.appendChild(element);
	console.debug(element,child,tools);


// city info
export var content = document.createElement("div");
document.body.appendChild(content);
content.id="content";
if(darkMode == 'dark')
	content.className = 'text-light bg-dark';
export var citystats = document.createElement('div');
content.appendChild(citystats);
citystats.className="alert alert-warning";
citystats.id="citystats";
citystats.innerHTML = `<p><strong><span data-i18n="load">Load the game ...</span></strong></p>`;

export var alerts = document.createElement('div');
alerts.id="alerts";
content.appendChild(alerts);

export var targets = document.createElement('div');
targets.id="targets";
content.appendChild(targets);

export var bonusDIV = document.createElement('div');
bonusDIV.id="bonus";
content.appendChild(bonusDIV);

export var incidents = document.createElement('div');
incidents.className="incidents";
incidents.id="incidents";
content.appendChild(incidents);
export var cityinvested = document.createElement('div');
content.appendChild(cityinvested);
cityinvested.id="invested";

export var galaxyDIV = document.createElement('div');
galaxyDIV.id="galaxy";
// galaxyDIV.className="hidden";
galaxyDIV.style.display = "none";
content.appendChild(galaxyDIV);

export var visitstats = document.createElement('div');
content.appendChild(visitstats);
visitstats.id="visit";
export var cityrewards = document.createElement('div');
content.appendChild(cityrewards);
cityrewards.id="rewards";

export var output = document.createElement('div');
content.appendChild(output);
output.id="output";
export var donationDIV = document.createElement('div');
content.appendChild(donationDIV);
donationDIV.id="donation";
export var donation2DIV = document.createElement('div');
content.appendChild(donation2DIV);
donation2DIV.id="donation2";
export var donationDIV2 = document.createElement('div');
content.appendChild(donationDIV2);
donationDIV2.id="donationDIV2";
export var greatbuilding = document.createElement('div');
content.appendChild(greatbuilding);
greatbuilding.id="greatbuilding";

export var overview = document.createElement('div');
content.appendChild(overview);
overview.id="overview";
export var cultural = document.createElement('div');
content.appendChild(cultural);
cultural.id="cultural";
export var info = document.createElement('div');
content.appendChild(info);
info.id="info";

export var armyDIV = document.createElement('div');
content.appendChild(armyDIV);
armyDIV.id="army";

export var goodsDIV = document.createElement('div');
content.appendChild(goodsDIV);
goodsDIV.id="goods";

export var gvg = document.createElement('div');
content.appendChild(gvg);
gvg.id="gvg";

var buildingsDIV = document.createElement('div');
buildingsDIV.id="buildings";
content.appendChild(buildingsDIV);

export var guild = document.createElement('div');
content.appendChild(guild);
guild.id="guild";
export var friendsDiv = document.createElement('div');
content.appendChild(friendsDiv);
friendsDiv.id="friends";
export var treasury  = document.createElement('div');
content.appendChild(treasury);
treasury.id="treasury";
export var treasuryLog  = document.createElement('div');
content.appendChild(treasuryLog);
treasury.id="treasuryLog";
export var clipboard = document.createElement('div');
content.appendChild(clipboard);
clipboard.id="clipboard";
clipboard.style.display = "none";
export var alerts_bottom = document.createElement('div');
alerts_bottom.id="alerts_bottom";
content.appendChild(alerts_bottom);
export var debug = document.createElement('div');
content.appendChild(debug);
debug.id="debug";
export var modal = document.createElement('div');
content.appendChild(modal);
modal.id="modal";

var element = document.createElement("div");
element.className = "modal-dialog modal-sm";
element.id = 'testModal';
// element.innerHTML = '<div class="modal-dialog modal-sm">...</div>';
modal.appendChild(element);


console.debug('clipboard',clipboard.innerHTML);
if(showOptions.clipboard){
	console.debug('clipboard',clipboard.innerHTML);
	// var clipboard = document.getElementById("clipboard");

	// if( clipboard == null){
	// 	// console.debug('2');
	// 	clipboard = document.createElement('div');
	// 	var content = document.getElementById("content");    
	// 	content.appendChild(clipboard);
	//  }
		
	var clipboardHTML = `<div class="alert alert-success alert-dismissible show collapsed"><p id="clipboardTextLabel" href="#buildingsText" data-toggle="collapse">
	<svg class="bi header-icon" id="clipboardicon" href="#clipboardText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseClipboard ? 'plus' : 'dash'}-circle"/></svg>
	<strong><span data-i18n="clipboard">Clipboard</span>:</strong></p>
	<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>`;
	clipboardHTML += `<button type="button" class="badge badge-pill badge-warning float-right right-button" id="clipboardCopyID" style="display: ${collapse.collapseClipboard ? 'none' : 'block'}"><span data-i18n="copy">Copy</span></button>`
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


const getType = (type) => { return type.replace(/.*(javascript|image|html|font|json|css|text).*/g, '$1'); };

const formatBytes = (size) => { return `${parseInt(size / 1000)} KB` };


document.querySelector('#go-to-options').addEventListener("click", function() {
	// console.debug('options');


	browser.permissions.request({
		permissions: ['storage']
	  }).then((granted) => {
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

	
export var language = window.navigator.userLanguage || window.navigator.language;
console.debug(language);
if (process.env.NODE_ENV === 'development') 
{
	$.i18n.debug = true;
	// language = 
	// console.debug(window);
}

	

window.addEventListener('message',function(event) {

    console.debug('received response:  ',event.data);
},false);

  function onEvent(message, params) {
	console.debug(message,params);
  }  


// browser.storage.local.clear();
browser.permissions.contains({
	permissions: ['storage']
}).then( (result) => {
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
				if(language != "auto"){
					$.i18n({
						locale: language
					});
				}
				console.debug(language, $.i18n().locale, $.i18n.debug);
				$.i18n().load({
					//     'fr' : {
					//         'load' : 'Chargez le jeu pour voir les statistiques de votre ville'
					// },
					'de': {
						'load': 'Laden Sie das Spiel, um Ihre Stadtstatistiken anzuzeigen'
					},
					'sv': {
						'load': 'Ladda spelet för att se din stadsstatistik'
					},
					'fi': {
						'load': 'Lataa peli nähdäksesi kaupunkitilastot'
					},
					'it': {
						'load': 'Carica il gioco per vedere le statistiche della tua città'
					},
					'pt': {
						'load': 'Carregue o jogo para ver as estatísticas da sua cidade'
					},
					'nl': {
						'load': 'Laad het spel om je stadsstatistieken te zien'
					},
					'sr': {
						'load': 'Учитајте игру да бисте видели статистику града'
					},
					'ru': {
						'load': 'Слава Украине!'
					},
					'ua': {
						'load': 'Слава Україні!'
					},
					'en': 'i18n/en.json',
					'es': 'i18n/es.json',
					'fr': "i18n/fr.json",
					'el': 'i18n/el.json',
					'gr': "i18n/gr.json"
				}).done(function () {
					// load lang strings on page already loaded
					$('body').i18n();
					console.debug("jQuery " + (jQuery ? $().jquery : "NOT") + " loaded");
					console.debug('i18n.load OK');
				});
			}
		);
	} else {
		// The extension doesn't have the permissions.
		citystats.innerHTML = `<div class="alert alert-danger"><p><strong>Please Enable FoE-Info</strong></p>
							  <button type="button" class="btn btn-danger" id="enableFoE">Enable</button></div>`;
		citystats.className = "alert alert-danger";
		document.getElementById("enableFoE").addEventListener("click", function () {
			// console.debug('options');

			browser.permissions.request({
				permissions: ['storage', 'clipboardWrite']
			}).then((granted) => {
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

	browser.devtools.network.onRequestFinished.addListener(handleRequestFinished);

// When a network request has finished this function will be called.
// browser.devtools.network.onRequestFinished.addListener().then(request => {
		function handleRequestFinished(request) {
			// console.log("Server IP: ", request.serverIPAddress);

			const response = request.response;
			if(request._resourceType == 'websocket'){
				console.debug('request',request._resourceType,request,response);
			}	
				// console.debug('request',request);
				// console.debug('response',response);
			var contentType = "";
			var contentHeader = '';
					
			if (response.httpVersion == "http/2.0")
				contentHeader = response.headers.find(header => header.name === 'content-type');
			else
				contentHeader = response.headers.find(header => header.name === 'Content-Type');

			if (contentHeader) {
				contentType = getType(contentHeader.value);
			}

				if (contentType == "json"){
					// console.debug(request.request.headers);
					contentType = request.request.headers.find(header => header.name === 'client-identification')
					// if(contentType) console.debug('client-identification:', contentType.value.substr(8,5));
					// else{
					// 	contentType = request.request.headers.find(header => header.name === 'Client-Identification')
					// 	// if(contentType) console.debug('Client-Identification:', contentType.value.substr(8,5));
			
					// }
					
					if(contentType && contentType.value && GameVersion != contentType.value.substr(8,5)){
						GameVersion = contentType.value.substr(8,5);
						citystats.innerHTML += `<div><span data-i18n="gameversion">Game Version</span>: ${GameVersion}<br>${EXT_NAME}: ${tool.version}</div>`;
						// console.debug('version:', GameVersion);
					}
					
				request.getContent().then(([body, mimeType]) => {
					// console.log("Content: ", body);
					// console.log("MIME type: ", mimeType);
							  const parsed = JSON.parse(body);
						// console.debug('parsed:', parsed);
						if (parsed && parsed.length) {


							for (var i = 0; i < parsed.length; i++) {
								const msg = parsed[i];


if (msg.requestClass == "CampaignService" && msg.requestMethod == "getDeposits") {
	/*CampaignService*/ 
} 
else if (msg.requestClass == "ConversationService") {

	if (msg.requestMethod == "getCategory") {
		/*ConversationService */ 
		conversationService(msg);
	} 
	else if (msg.requestMethod == "getOverviewForCategory") {
		/*ConversationService */
		conversationService(msg);
	} 
	else if (msg.requestMethod == "getConversation") {
		/*ConversationService */
		getConversation(msg);
	} 
}
else if (msg.requestClass == "OtherPlayerService") {

	if (msg.requestMethod == "getOtherPlayerCityMapEntity") {
		/*PlayerID*/ 
										if (PlayerID != msg.responseData.player_id)
											PlayerName = '';
										PlayerID = msg.responseData.player_id;
	
	} 
	else if (msg.requestMethod == "getSocialList") {
		/*PlayerID*/
										otherPlayerServiceUpdateActions(msg.responseData);
	} 
	else if (msg.requestMethod == "visitPlayer") {
		if (showOptions.showVisit) {
			clearVisitPlayer();
			otherPlayerService(msg);
		}
	} 
	else if (msg.requestMethod == "rewardPlunder") {
		//console.debug('cityentity_id:', msg.responseData.cityentity_id);
		const rewards = msg.responseData[0].product.resources;
		Object.keys(rewards).forEach(reward => {
			console.debug(reward);
			var name = helper.fResourceShortName(reward);
			var qty = rewards[reward];

			if (!rewardsOtherPlayer[name])
				rewardsOtherPlayer[name] = 0;
			rewardsOtherPlayer[name] += qty;
			console.debug(reward);
		});


		var reward = [];
		reward.source = 'otherPlayer';
		reward.name = '';
		reward.amount = 0;

		if (showOptions.showGErewards) {
			showRewards(reward);
		}
	} 
	else if (msg.requestMethod == "rewardResources") {
		/*rewardPlunder */ 
		const rewards = msg.responseData.resources;

		Object.keys(rewards).forEach(reward => {
			// console.debug(reward);
			var name = helper.fResourceShortName(reward);
			var qty = rewards[reward];

			if (!rewardsOtherPlayer[name])
				rewardsOtherPlayer[name] = 0;
			rewardsOtherPlayer[name] += qty;
			// console.debug(reward);
		});


		var reward = [];
		reward.source = 'otherPlayer';
		reward.name = '';
		reward.amount = 0;

		if (showOptions.showGErewards) {
			showRewards(reward);
		}

		/*openChest */ 
	} 
	else if (msg.requestMethod == "getCityProtections") {
		/*City Protections*/ 									
		// console.debug('msg:', msg);
		if (msg.responseData)
			CityProtections = msg.responseData;
	} 
	
}
else if (msg.requestClass == "InventoryService") {
	if (msg.requestMethod == "getGreatBuildings") {
		/*InventoryService*/
										// console.debug(msg.responseData);
	} 
	else if (msg.requestMethod == "getItems") {
		/*InventoryService*/
										// 	console.debug("InventoryService",msg.responseData);
										// console.debug(Object.keys(CityEntityDefs));
										storage.set('CityEntityDefs', CityEntityDefs);
										var forgePoints = 0;
										if (msg.responseData.length) {
											for (var j = 0; j < msg.responseData.length; j++) {
												if (msg.responseData[j].name == "10 Forge Points")
													forgePoints += msg.responseData[j].inStock * 10;
												else if (msg.responseData[j].name == "5 Forge Points")
													forgePoints += msg.responseData[j].inStock * 5;
												else if (msg.responseData[j].name == "2 Forge Points")
													forgePoints += msg.responseData[j].inStock * 2;
											}
											availablePacksFP = forgePoints;
											if (document.getElementById("availableFPID"))
												document.getElementById("availableFPID").textContent = availablePacksFP + availableFP;
										}
	} 
}
else if (msg.requestClass == "ArmyUnitManagementService" && msg.requestMethod == "getArmyInfo") {
	/*ArmyUnitManagementService*/ 
	// console.debug(msg,msg.responseData.counts,MilitaryDefs);
	armyUnitManagementService(msg);

} 
else if (msg.requestClass == "FriendsTavernService" && msg.requestMethod == "getSittingPlayersCount") {
	/*FriendsTavernService*/ 
									// if(msg.responseData) 
									// MyInfo.id = msg.responseData[0];
									// console.debug('FriendsTavernService',MyInfo.id);
} 
else if (msg.requestClass == "IgnorePlayerService" && msg.requestMethod == "getIgnoreList") {
	/*IgnorePlayerService*/
	clearStartup();
	clearBattleground();
	if (msg.responseData) {
		console.debug('Ignored By:', msg.responseData.ignoredByPlayerIds);
		console.debug('Ignoring:', msg.responseData.ignoredPlayerIds);
		ignoredPlayers.ignoredByPlayerIds = msg.responseData.ignoredByPlayerIds;
		ignoredPlayers.ignoredPlayerIds = msg.responseData.ignoredPlayerIds;
		console.debug('Ignores:', ignoredPlayers);
	}
	// console.debug('Ignored :',msg.responseData);
} 
else if (msg.requestClass == "TimeService" && msg.requestMethod == "updateTime") {
	/*Time Service */
	if (msg.responseData) {
		EpocTime = msg.responseData.time;
		// console.debug(EpocTime,msg.responseData);
		helper.fShowIncidents();
	}
} 	
else if (msg.requestClass == "ResourceService") {
	if (msg.requestMethod == "getResourceDefinitions") {
		/*Resource Service */ 
		getResourceDefinitions(msg);
	} 
	else if (msg.requestMethod == "getPlayerResources") {
		/*Resource Service */ 
		getPlayerResources(msg);
	} 	
}	
else if (msg.requestClass == "CityMapService") {
	if (msg.requestMethod == "getEntities") {
		/*getEntities*/ 
		var outputHTML = "";
		//output.innerHTML = "";
		//overview.innerHTML = "";
		// console.debug(msg);
		if (msg.responseData.length) {
			// console.debug('msg:', msg.responseData);
			for (var j = 0; j < msg.responseData.length; j++) {
				if (msg.responseData[j].player_id == MyInfo.id) {
				}
			}
		}
	
	} 
	else if (msg.requestMethod == "updateEntity") {
		/*GB Info */ 
										// console.debug('msg:', msg);
										var outputHTML = "";
										//output.innerHTML = "";
										//overview.innerHTML = "";
										// if (debugEnabled == true)
										// 	console.debug(contentType,msg.requestClass,msg.requestMethod);
										if (msg.responseData.length) {
											console.debug('msg:', msg.responseData);
											// console.debug(collapseOptions);
											console.debug(GBselected);
											var levelText = '';
											for (var j = 0; j < msg.responseData.length; j++) {
												const selected = msg.responseData[j];
												if (selected.type == 'greatbuilding') {
													if (selected.player_id == MyInfo.id) {
														// PlayerName = MyInfo.name;
														// PlayerID = MyInfo.id;
														setPlayerName(MyInfo.name, MyInfo.id);
													}
	
													GBselected.player = selected.player_id;
													GBselected.id = selected.id;
													GBselected.name = helper.fGBname(selected.cityentity_id);
													// console.debug(GBselected.name,CityEntityDefs[selected.cityentity_id],selected);
													var era = selected.cityentity_id.split('_', 2);
													GBselected.era = helper.fGVGagesname(era[1]);
													// console.debug(GBselected.era);
													GBselected.level = selected.level;
													GBselected.max_level = selected.max_level;
													GBselected.connected = selected.connected;
													// GBlevelNext = 0;
													// console.debug('GBlevelNext');
													// outputHTML += `<div>${PlayerName} ${GBselected.name}<br>Current Level ${GBselected.level} Max Level ${GBselected.max_level}</div>`;
													// levelText += `<div>Level ${GBselected.level + 1} (Max ${GBselected.max_level})</div>`;
													GBselected.total = selected.state.forge_points_for_level_up;
													// donor2HTML += GBselected.total + '\n';
													if (selected.state.invested_forge_points)
														GBselected.current = selected.state.invested_forge_points;
	
													else
														GBselected.current = 0;
													levelText += `<table class="table alert-dark">`;
													levelText += `<tr><td colspan="2">Level ${GBselected.level + 1} (Max ${GBselected.max_level})</td></tr><tr><td>${GBselected.current} of ${GBselected.total} FP <span data-i18n="total">total</span></td><td><span data-i18n="remaining">remaining</span>: ${GBselected.total - GBselected.current}FP</td></tr>`;
													// levelText += `</table></div></div>`;
													var date = selected.state.next_state_transition_at;
													// console.debug(date);
													if (date && date != 2147483647) {
														var timer = new Date(date * 1000);
														levelText += `<tr><td colspan="2">Ready: ${timer.toLocaleString()}</td></tr>`;
														// console.debug(timer,levelText);
													}
													levelText += `</table></div></div>`;
												}
												// else
												// levelText = '';
												// console.debug(levelText);
											}
											outputHTML = `<div class="alert alert-dark alert-dismissible show collapsed" href="#infoText" aria-expanded="true" aria-controls="infoText" data-toggle="collapse" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><p id="infoTextLabel"><strong><span data-i18n="gb">GB</span> <span data-i18n="info">Info</span>:</strong> ${PlayerName} | ${GBselected.name} [${GBselected.level}/${GBselected.max_level}]</p>`;
											outputHTML += `<div id="infoText" class="alert-dark collapse ${collapse.collapseGBInfo ? '' : 'show'}">`;
										}
										console.debug(GBselected);
										// console.debug('showGBInfo',showGBInfo,outputHTML);
										if (showOptions.showGBInfo && levelText) {
											info.innerHTML = outputHTML + levelText;
											document.getElementById("infoTextLabel").addEventListener("click", collapse.fCollapseGBInfo);
											$('body').i18n();
										}
	
										/*City Stats */ 
	} 
}		
else if (msg.requestClass == "StartupService" && msg.requestMethod == "getData") {

									contentType = request.request.headers.find(header => header.name === ':authority');
									if (contentType)
										GameOrigin = contentType.value.split('.')[0];
									console.debug('GameOrigin:', GameOrigin);

									browser.storage.local.getBytesInUse(null).then((size) => {
										console.debug('getBytesInUse', size);
									});

									// browser.storage.local.get(['showOptions','collapseOptions','CityEntityDefs','ResourceDefs','tool','targets','toolOptions','donationPercent','url',GameOrigin + 'MyInfo'], 
									browser.storage.local.get(null).then((result) => {
										// post.log('result', result);
										// console.debug('result', result);
										// console.debug('showIncidents', showIncidents);
										if (result[GameOrigin + 'MyInfo'])
											MyInfo.guildPosition = result[GameOrigin + 'MyInfo'].guildPosition;


										else
											MyInfo.guildPosition = 0;
										// console.debug('result', result[GameOrigin + 'MyInfo'],MyInfo.guildPosition,GameOrigin + 'MyInfo');
										receiveStorage(result);
									}
									);


									output.innerHTML = ``;
									overview.innerHTML = ``;
									cityinvested.innerHTML = ``;
									cityrewards.innerHTML = ``;
									incidents.innerHTML = ``;
									donationDIV.innerHTML = ``;
									greatbuilding.innerHTML = ``;
									gvg.innerHTML = ``;
									guild.innerHTML = ``;
									citystats.innerHTML = ``;
									visitstats.innerHTML = ``;
									visitstats.className = "";
									cultural.innerHTML = ``;
									cultural.className = "";
									startupService(msg);

									/*Player Info */ 
} 
else if (msg.requestClass == "RankingService" && msg.requestMethod == "searchRanking") {

									// console.debug('msg:', msg);
									if (msg.responseData.rankings.length && msg.responseData.category != "clan_battle_clan_global") {
										for (var j = 0; j < msg.responseData.rankings.length; j++) {
											if (msg.responseData.rankings[j].player.is_self) {
												if (MyInfo.name != msg.responseData.rankings[j].player.name || MyInfo.id != msg.responseData.rankings[j].player.player_id) {
													MyInfo.name = msg.responseData.rankings[j].player.name;
													MyInfo.id = msg.responseData.rankings[j].player.player_id;
													MyInfo.guild = msg.responseData.rankings[j].clan.name;
													console.debug('user :', MyInfo);
													if (showOptions.showStats)
														citystats.innerHTML = `<div class="alert alert-warning"><strong>${MyInfo.name}</strong></div>`;
												}
											}
										}
										// 	output.innerHTML = ``;
										// overview.innerHTML = ``;
										// cityinvested.innerHTML = ``;
										// // cityrewards.innerHTML = ``;
										// incidents.innerHTML = ``;
										// donationDIV.innerHTML = ``;
										// greatbuilding.innerHTML = ``;
										// gvg.innerHTML = ``;
										// guild.innerHTML = ``;
									}

									/*OtherPlayer Info/Stats */ 
} 
else if (msg.requestClass == "HiddenRewardService" && msg.requestMethod == "getOverview") {
	/*Incidents */
	if (msg.responseData.hiddenRewards.length)
		hiddenRewards = msg.responseData.hiddenRewards;
	else {
		// console.debug('msg:', msg);
		hiddenRewards = [];
	}
	// console.debug('hiddenRewards:', hiddenRewards);
	helper.fShowIncidents();
} 
else if (msg.requestClass == "EmissaryService" && msg.requestMethod == "getAssigned") {
/*Emissary*/
									emissaryService(msg);

									/*Cultural*/ 
} 
else if (msg.requestClass == "AdvancementService" && msg.requestMethod == "getAll") {
									// console.debug('msg:', msg);
									clearCultural();
									let culturalGoods = [];
									msg.responseData.forEach(resource => {
										// console.debug(resource.name,resource,good,goodsList[good]);
										const rss = resource.requirements.resources;

										if (resource.isUnlocked != true) {
											Object.keys(rss).forEach(entry => {
												// Goods[entry] = entry;
												// console.debug(entry,rss[`${entry}`]);
												if (culturalGoods[`${entry}`])
													culturalGoods[`${entry}`] += rss[`${entry}`];

												else
													culturalGoods[`${entry}`] = rss[`${entry}`];
											});
										}
									});

									var culturalHTML = `<div  role="alert">
								<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
								<p href="#culturalText" data-toggle="collapse">
								<svg class="bi header-icon" id="culturalicon" href="#culturalText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseCultural ? 'plus' : 'dash'}-circle"/></svg>
								<strong><span data-i18n="cultural">Cultural Settlement</span></strong></p>`;


									culturalHTML += '<div id="culturalText" class="collapse show"><span data-i18n="needed">Goods Needed</span>:<br>';
									// else
									// visitstatsHTML = `<div class="alert alert-warning"><p><strong>${MyInfo.name}</strong> ${MyInfo.id}<br>`;
									Object.keys(culturalGoods).forEach(entry => {
										var needed = culturalGoods[`${entry}`];
										if (Resources[`${entry}`])
											needed -= Resources[`${entry}`];
										// setResources(entry);
										// console.debug(`${entry}`,needed);
										if (entry != 'diplomacy' && needed > 0)
											culturalHTML += `${needed}` + ` ${helper.fResourceShortName(entry)}<br>`;
									});


									if (showOptions.showSettlement) {
										if (document.getElementById("cultural") == null) {
											cultural = document.createElement('div');
											document.getElementById("content").appendChild(cultural);
											cultural.id = "cultural";
										}
										cultural.innerHTML = culturalHTML + `</div></div>`;
										cultural.className = "alert alert-info alert-dismissible show collapsed";
									}




									/*Limited Bonuses */ 
}
else if (msg.requestClass == "BonusService") {
	if (msg.requestMethod == "getLimitedBonuses") {
										// console.debug('msg:', msg);
										getLimitedBonuses(msg);
	
	
										/*daily FP */ 
	} 
	else if (msg.requestMethod == "getBonuses") {
										// console.debug('msg:', msg);
										getBonuses(msg);
										if (document.getElementById("targetsGBG")) {
											document.getElementById("targetsGBG").innerHTML = '';
										}
	
										/*boosts - overview */ 
	} 
} 
else if (msg.requestClass == "BoostService") {
	if (msg.requestMethod == "getOverview") {
										// console.debug('msg:', msg);
										boostService(msg);
	
										/*all boosts */ 
	} 
	else if (msg.requestMethod == "getAllBoosts") {
	
										boostServiceAllBoosts(msg);
	
										/*rewardPlunder */ 
	} 
}
else if (msg.requestClass == "RewardService" && msg.requestMethod == "collectReward") {
	/*collectReward */
	//console.debug('cityentity_id:', msg.responseData.cityentity_id);
	if (msg.responseData.length) {
		var reward = msg.responseData[0][0];
		reward.source = msg.responseData[1];
		console.debug(msg.responseData[1], reward);
		if (showOptions.showGBGrewards) {
			showRewards(reward);
		}
	}
} 
else if (msg.requestClass == "CityProductionService" && msg.requestMethod == "pickupProduction") {
	/*pickupProduction */
	//console.debug('cityentity_id:', msg.responseData.cityentity_id);
	pickupProduction(msg);
} 
else if (msg.requestClass == "BlueprintService" && msg.requestMethod == "newReward") {
	/*GB Rewards */
									//console.debug('cityentity_id:', msg.responseData.cityentity_id);
									//console.debug('cityentity_id:', msg.responseData.building_owner);
									const GBname = helper.fGBname(msg.responseData.cityentity_id);
									availablePacksFP += msg.responseData.strategy_point_amount;
									if (document.getElementById("availableFPID"))
										document.getElementById("availableFPID").textContent = availablePacksFP + availableFP;

									if (showOptions.showGBRewards) {
										var oldText = document.getElementById("rewardsText");
										if (oldText) {
											oldText.innerHTML = `${msg.responseData.building_owner.name} ${helper.fGBsname(GBname)} ${msg.responseData.level} - ${msg.responseData.strategy_point_amount}FP<br>` + oldText.innerHTML;
										} else {
											cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel" href="#rewardsText" data-toggle="collapse">
										<svg class="bi header-icon" id="rewardsicon" href="#rewardsText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseRewards ? 'plus' : 'dash'}-circle"/></svg>
										<strong><span data-i18n="reward">REWARDS:</span></strong></p>
										<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
										<div id="rewardsText" class="overflow resize collapse ${collapse.collapseRewards ? '' : 'show'}"><p class="overflow" id="rewardsText">${msg.responseData.building_owner.name} ${helper.fGBsname(GBname)} ${msg.responseData.level} - ${msg.responseData.strategy_point_amount}FP</p></div></div>`;

											// cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><strong><span data-i18n="gb">GB</span> REWARDS:</strong> 
											// <p class="overflow" id="rewardsText">${msg.responseData.building_owner.name} ${helper.fGBsname(GBname)} ${msg.responseData.level} - ${msg.responseData.strategy_point_amount}FP</p></div>` + cityrewards.innerHTML;
											document.getElementById("rewardsTextLabel").addEventListener("click", collapse.fCollapseRewards);
										}
										// document.getElementById("infoTextLabel").addEventListener("click", collapse.fCollapseGBRewards);
										rewardObserve();
									}

									// if (msg.responseData.length) {
									// 	var reward = msg.responseData[0][0];
									// 	reward.source = msg.responseData[1];
									// 	console.debug(msg.responseData[1], reward);
									// 	if (showOptions.showGBGrewards) {
									// 		showRewards(reward);
									// 	}
									// }


} 
else if (msg.requestClass == "GreatBuildingsService") {
	/*GB Donors */	
	if (msg.requestMethod == "getConstructionRanking") {
			// console.debug('msg:', msg);
			getConstructionRanking(msg, JSON.parse(request.request.postData.text));

	}
	else if (msg.requestMethod == "getConstruction") {
			// console.debug('msg:', msg);
			getConstruction(msg);

			/* GB Add FP*/
	} 
	else if (msg.requestMethod == "contributeForgePoints") {
				console.debug('msg:', msg);
				contributeForgePoints(msg.responseData);

				/*Invested */
	} 
	else if (msg.requestMethod == "getContributions") {
					var reward = 0;
					var invested = 0;
					var cityinvestedHTML = ``;
					cityinvested.innerHTML = ``;
					// if (debugEnabled == true)
					// 	cityinvestedHTML += `<div>${contentType} : ${msg.requestClass} : ${msg.requestMethod}</div>`;
					if (showOptions.showInvested && msg.responseData.length) {
						var numGB = 0;
						for (var j = 0; j < msg.responseData.length; j++) {
							invested += msg.responseData[j].forge_points;
							if (msg.responseData[j].rank < 6) {
								if (msg.responseData[j].reward.strategy_point_amount && msg.responseData[j].forge_points > 9) {
									reward += msg.responseData[j].reward.strategy_point_amount;
									numGB++;
								}
								console.debug('invested: ', numGB, msg.responseData[j].forge_points, invested, reward);
							}
						}
						const rewardBonus = BigNumber(City.ArcBonus).div(100).plus(1).times(reward).dp(0);
						console.debug(BigNumber(City.ArcBonus), BigNumber(City.ArcBonus).div(100), BigNumber(City.ArcBonus).div(100).plus(1), BigNumber(City.ArcBonus).div(100).plus(1).times(reward));
						console.debug(availablePacksFP, availableFP, reward, invested, rewardBonus);
						cityinvestedHTML = `<div id="investedTextLabel" class="alert alert-success alert-dismissible collapsed" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>`;
						cityinvestedHTML += `<p id="investedTextLabel" href="#investedText" aria-expanded="true" aria-controls="investedText" data-toggle="collapse">
										<svg class="bi header-icon" id="investedicon" href="#investedText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseInvested ? 'plus' : 'dash'}-circle"/></svg>
										<strong>FP Status:</strong> 
										<span id="onHandFP">${!collapse.collapseInvested ? availablePacksFP + availableFP : ''}</span></p>`;
						cityinvestedHTML += `<div id="investedText" class="collapse ${collapse.collapseInvested ? 'show' : ''}">`;
						cityinvestedHTML += `On Hand FP: <span id="onHandFP2">${availablePacksFP + availableFP}</span><br>`;
						cityinvestedHTML += `FP Invested: ${invested} (${numGB} GB)<br>`;
						if (City.ArcBonus > 90)
							cityinvestedHTML += `<span data-i18n="gb">GB</span> Rewards: ${rewardBonus} (+${City.ArcBonus}%)`;

						else
							cityinvestedHTML += `<span data-i18n="gb">GB</span> Rewards: ${rewardBonus}`;
						cityinvestedHTML += `<br>Total FP: ${availablePacksFP + availableFP + Number(rewardBonus)}</p>`;

						cityinvested.innerHTML = cityinvestedHTML + `</div></div>`;
						document.getElementById("investedTextLabel").addEventListener("click", collapse.fCollapseInvested);
					}

					/* GvG Info*/
	} 
	else if (msg.requestMethod == "getOtherPlayerOverview") {
		/*GB Last Donor Date */
		var overviewtxt = ``;
		// console.debug('msg:', msg);
		// console.debug(showGBLastDonor);
		if (msg.responseData.length) {
			for (var j = 0; j < msg.responseData.length; j++) {
				var player = msg.responseData[j].player;
				setPlayerName(player.name, player.player_id);
			}
		}
	} 
	else if (msg.requestMethod == "getAvailablePackageForgePoints") {
		/*ForgePoints*/ 
		availablePacksFP = msg.responseData[0];
		if (document.getElementById("availableFPID"))
			document.getElementById("availableFPID").textContent = availablePacksFP + availableFP;
	} 
	
}
else if (msg.requestClass == "ClanBattleService") {
	if (msg.requestMethod == "getContinent") {
		fCleardForGVG();
		getContinent(msg);
	}
	else if (msg.requestMethod == "getProvinceDetailed") {
		/* GvG Ages*/
		getProvinceDetailed(msg);
	} 
	else if (msg.requestMethod == "deploySiegeArmy") {
		/* GvG Siege*/
		deploySiegeArmy(msg);
	} 
}
else if (msg.requestClass == "GuildExpeditionService") {
	if (msg.requestMethod == "getOverview") {
		/*Guild Expedition*/ 
		clearExpedition();
	} 
	else if (msg.requestMethod == "getContributionList") {
		/*Guild Expedition*/ 
		if (showOptions.showExpedition)
			guildExpeditionService(msg);
	}
	else if (msg.requestMethod == "openChest") {
		//console.debug('cityentity_id:', msg.responseData.cityentity_id);
		// var units = {};
		// var numUnits = 0;
		var reward = msg.responseData;
		reward.source = 'guildExpedition';
		var name = helper.fRewardShortName(reward.name);
		var qty = reward.amount;

		if (!rewardsGE[name])
			rewardsGE[name] = 0;
		rewardsGE[name] += qty;
		console.debug(reward);
		if (showOptions.showGErewards) {
			showRewards(reward);
		}
		console.debug('rewardsGE:', rewardsGE, reward);
	} 
}
else if (msg.requestClass == "GuildBattlegroundService") {
	// GuildBattleground
	if (msg.requestMethod == "getLeaderboard") {
		/*getLeaderboard */
		if (showOptions.showLeaderboard)
			getLeaderboard(msg);
	}
	else if (msg.requestMethod == "getPlayerLeaderboard") {
		/*Guild Battleground*/
		getPlayerLeaderboard(msg);
	}
	else if (msg.requestMethod == "getBattleground") {
		/*Guild Battleground*/
		getBattleground(msg);
	}
	else if (msg.requestMethod == "getState") {
		if (msg.responseData.stateId == 'participating') {
			clearForBattleground();
		}
	}
	else
		console.debug('GuildBattlegroundService', msg);
}
else if (msg.requestClass == "GuildBattlegroundStateService") {
	// GuildBattleground
	if (msg.requestMethod == "getState" && msg.responseData.stateId == 'participating') {
		clearForBattleground();
	}
	else if (msg.requestMethod == "getState" && showOptions.showBattleground) {
		getState(msg);
	}

	else
		console.debug('GuildBattlegroundStateService', msg);
}
else if (msg.requestClass == "GuildBattlegroundBuildingService") {
	// GuildBattleground
	if (msg.requestMethod == "getBuildings") {
		/*Guild Battleground*/
		getBuildings(msg);
	}

	else
		console.debug('GuildBattlegroundBuildingService', msg);
}
else if (msg.requestClass == "GuildBattlegroundSignalsService") {
	// GuildBattleground
	if (msg.requestMethod == "setSignal") {
		/*Guild Battleground*/
		setSignal(msg);
	}
	else if (msg.requestMethod == "removeSignal") {
		/*Guild Battleground*/
		removeSignal(msg);
	}

	else
		console.debug('GuildBattlegroundSignalsService', msg);
	// console.debug("GuildBattlegroundSignalsService", msg,JSON.parse(request.request.postData.text));
}
else if (msg.__class__ && msg.__class__.substring(0, 17) == 'GuildBattleground') {

	if (msg.__class__ && msg.__class__ == 'GuildBattlegroundMapMetadata') {
		if (msg.id == 'volcano_archipelago') {
			VolcanoProvinceDefs = msg.provinces;
			VolcanoProvinceDefs[0].id = 0;
		}
		else if (msg.id == 'waterfall_archipelago') {
			WaterfallProvinceDefs = msg.provinces;
			WaterfallProvinceDefs[0].id = 0;
		}
		else
			console.debug(msg);
	}
	else if (msg.__class__ && msg.__class__ == 'GuildBattlegroundLeagueMetadata') {
		// console.debug('GuildBattlegroundLeagueMetadata',msg);
	}
	else if (msg.__class__ && msg.__class__ == 'GuildBattlegroundBuildingMetadata') {
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
				'name': msg.name,
				'buildingTime': msg.buildingTime,
				'description': msg.description
			};
		}
	}
	else
		console.debug('GuildBattleground', msg);
}
else if (msg.requestClass == "ClanService") {

	if (msg.requestMethod == "getOwnClanData" || msg.requestMethod == "getClanData") {
	/*Guild Members*/ 
										// console.debug(showOptions, msg.responseData.members);
										if (showOptions.showTreasury && msg.requestMethod == "getOwnClanData") {
											const members = msg.responseData.members;
											GuildDonations.push([msg.responseData.name, msg.responseData.membersNum]);
											// console.debug(members);
											members.forEach(entry => {
												GuildDonations.push([entry.rank, entry.name, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
												//rank,name,medals spent,medals returned,medals donated,GB goods, soh goods, other donation goods, total goods,
												//0 rank,
												// 1 name,
												// 2 medals spent,
												// 3 medals returned,
												// 4 medals donated,
												// 5 gvg goods out, 
												// 6 gvg goods in, 
												// 7 gbh goods out, 
												// 8 ge goods out, 
												// 9 GB goods, 
												// 10 soh goods, 
												// 11 other donation goods, 
												// 12 total goods,
												// 13 SAV - all goods 
												// 14 SAAB - all goods 
												//  - all goods 
												// console.debug(entry.rank,entry.name);
												// citystats.innerHTML += `${entry.name} ${entry.player_id}<br>`
												if (entry.is_self == true) {
													setMyGuildPosition(entry.rank);
													// console.debug('MyInfo.guildPosition',entry.rank);
												}
	
											});
											// console.debug(GuildDonations);
											$('body').i18n();
										}
	
										if (showOptions.showGuild && msg.responseData.members) {
											var guildlist = msg.responseData.members;
											// console.debug('guildlist',guildlist);
											// if(title){
											var friendsHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert"><p id="friendsTextLabel" href="#friendsText" data-toggle="collapse">
						<svg class="bi header-icon" id="friendsicon" href="#friendsText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseFriends ? 'plus' : 'dash'}-circle"/></svg>
						<strong>Guild Members</strong></p>
						<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
						<div id="friendsCopy">${collapse.collapseFriends == false ? '<button type="button" class="badge badge-pill badge-success right-button" id="friendsCopyID"><span data-i18n="copy">Copy</span></button>' : ''}</div>`;
											friendsHTML += `<div id="friendsText" class="overflow-y collapse ${collapse.collapseFriends == false ? 'show' : ''}"><table id="friendsText2"><tr><th>Name</th><th>Title</th><th>ID</th><th>Era</th><th>Battles</th><th>Score</th></tr>`;
											guildlist.forEach(entry => {
												friendsHTML += `<tr><td>${entry.name}</td><td>${entry.title}</td><td>${entry.player_id}</td><td>${helper.fGVGagesname(entry.era)}</td><td>${entry.won_battles}</td><td>${entry.score}</td></tr>`;
											});
											// var friends = document.getElementById("friends");
											friendsDiv.innerHTML = friendsHTML + `</table></div></div>`;
											if (collapse.collapseFriends == false) {
												document.getElementById("friendsCopyID").addEventListener("click", copy.fFriendsCopy);
											}
											document.getElementById("friendsTextLabel").addEventListener("click", collapse.fCollapseFriends);
											// }
											$('body').i18n();
										}
	
	
	} 
	else if (msg.requestMethod == "getTreasuryLogs") {
	/*Guild Treasury Logs*/
										// var users.checkNull = null;
										if (showOptions.showContributions || showOptions.showLogs) {
											// if(users.checkNull) {
											if (showOptions.showLogs) {
												var treasuryHTML = treasuryLog.innerHTML;
												// console.debug('msg:', msg);
												// console.debug('treasury',msg);
												if (!treasuryHTML) {
													treasuryHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
							<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
							<p href="#treasuryLogText" aria-expanded="true" aria-controls="treasuryLogText" data-toggle="collapse">
							<svg class="bi header-icon" id="treasuryLogicon" href="#treasuryLogText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseTreasuryLog ? 'plus' : 'dash'}-circle"/></svg>
							<strong>Guild Treasury Log:</strong></p>`;
													treasuryHTML += `<table id="treasuryLogText" class="overflow collapse show">`;
												}
												else {
													treasuryHTML = treasuryHTML.substring(0, treasuryHTML.length - 8);
												}
											}
											// console.debug(msg.responseData);
											const logs = msg.responseData.logs;
											// console.debug(logs);
											logs.forEach(entry => {
												if (entry.resource == "medals") {
													GuildDonations.forEach(member => {
														// rank,name,spent,returned,donated
														if (member[1] == entry.player.name) {
															if (entry.action.toLowerCase() == 'guild continent: slot unlocked')
																member[2] += entry.amount;
															else if (entry.action.toLowerCase() == 'siege army deployment')
																member[2] += entry.amount;
															else if (entry.action.toLowerCase() == 'guild continent: grant freedom')
																member[3] += entry.amount;
															else if (entry.action.toLowerCase() == 'donation')
																member[4] += entry.amount;
														}
														// console.debug(entry.action,entry.amount);
													});
												}
												else {
													GuildDonations.forEach(member => {
														// spent,returned,donated
														if (member[1] == entry.player.name) {
															if (entry.action.toLowerCase() == 'siege army deployment' ||
																entry.action.toLowerCase() == 'guild continent: slot unlocked')
																member[5] += entry.amount;
															else if (entry.action.toLowerCase() == 'guild continent: grant freedom')
																member[6] += entry.amount;
															else if (entry.action.toLowerCase() == 'battlegrounds: place building')
																member[7] += entry.amount;
															else if (entry.action.toLowerCase() == 'guild expedition: difficulty unlocked')
																member[8] += entry.amount;
	
	
															// else if(entry.action == 'Great building production')
															// 	member[9] += entry.amount;
															else if (entry.action.toLowerCase() == 'building production')
																member[9] += entry.amount;
															else if (entry.action.toLowerCase() == 'guild treasury donation') {
																// if(entry.amount > 80)
																member[11] += entry.amount; // manual donation
	
	
	
																// else
																// member[10] += entry.amount; // assume SoH
															} else {
																console.debug(entry.action, entry.amount);
															}
	
															// if(entry.action == 'Great building production' || entry.action == 'Guild treasury donation'){
															if (entry.action.toLowerCase() == 'guild treasury donation') {
																// console.debug(ResourceDefs.find(entry.id));
																ResourceDefs.forEach(rssDef => {
																	// console.debug(entry, rssDef.era);
																	if (rssDef.id == entry.resource) {
																		// rssName = rssDef.name;
																		// rssEra = rssDef.era;
																		member[(31 - helper.fLevelfromAge(rssDef.era))] += entry.amount;
																		// console.debug(entry.action,entry.resource, entry.amount,rssDef.era,helper.fLevelfromAge(rssDef.era),(30 - helper.fLevelfromAge(rssDef.era)),member[(30 - helper.fLevelfromAge(rssDef.era))]);
																	}
																});
															}
	
														}
														// console.debug(entry.action,entry.amount);
													});
	
													GuildTreasury.forEach(rss => {
														if (entry.resource == rss[0]) {
															// ID, era name, rss name, treasury qty, donation, GE spend, GVG spend, GBG spend, net change
															if (entry.action.toLowerCase() == 'siege army deployment' ||
																entry.action.toLowerCase() == 'guild continent: slot unlocked' ||
																entry.action.toLowerCase() == 'guild continent: grant freedom') {
																rss[6] += entry.amount;
																// rss[8] += entry.amount;
															}
															else if (entry.action.toLowerCase() == 'battlegrounds: place building') {
																rss[7] += entry.amount;
																// rss[8] += entry.amount;
															}
															else if (entry.action.toLowerCase() == 'guild expedition: difficulty unlocked') {
																rss[5] += entry.amount;
																// rss[8] += entry.amount;
															}
															else if (entry.action.toLowerCase() == 'building production' || entry.action.toLowerCase() == 'guild treasury donation') {
																rss[4] += entry.amount; // manual donation
	
																// rss[8] += entry.amount;
															}
															rss[8] += entry.amount;
															return;
														}
													});
	
												}
												// console.debug(helper.fResourceShortName(entry.resource),entry);
												// if(entry.resource == "medals")
												if (showOptions.showLogs)
													treasuryHTML += `<tr><td>${entry.player.name}</td><td>${helper.fResourceShortName(entry.resource)}</td><td>${entry.action}</td><td>${entry.amount}</td><td>${entry.createdAt}</td></tr>`;
											});
											if (showOptions.showLogs)
												treasuryLog.innerHTML = treasuryHTML + `</table>`;
	
											if (showOptions.showContributions) {
												treasuryHTML = `<div class="alert alert-success alert-dismissible show collapsed" data-toggle="collapse" role="alert">
						<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
						<button type="button" class="badge badge-pill badge-success float-right right-button" id="treasuryCopyID"><span data-i18n="copy">Copy</span></button>
						<p id="treasuryTextLabel" href="#treasuryText" data-toggle="collapse">
						<svg class="bi header-icon" id="treasuryicon" href="#treasuryText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseTreasury ? 'plus' : 'dash'}-circle"/></svg>
						<strong>Guild Treasury:</strong></p>`;
												treasuryHTML += `<div id="treasuryText" class="collapse ${collapse.collapseTreasury ? '' : 'show'}"><table class="overflow table collapse show"><tr><th>Name</th><th>Medals Spent</th><th>Medals Returned</th><th>Medals Donated</th><th>Medals Total</th><th>Goods Spent GVG</th><th>Goods Returned GVG</th><th>Goods Spent GBG</th><th>Goods Spent GE</th><th>Goods Donated Building</th><th>Goods Donated ???</th><th>Goods Donated</th><th>SAV</th><th>SAAB</th><th>SAM</th><th>VF</th><th>OF</th><th>AF</th><th>TF</th><th>TE</th><th>CE</th><th>PME</th><th>ME</th><th>PE</th><th>IndA</th><th>CA</th><th>LMA</th><th>HMA</th><th>EMA</th><th>IA</th></tr>`;
												GuildDonations.forEach(member => {
													// rank,name,medals: spent,returned,donated, goods: spent,returned,donated
													if (member[0] != MyInfo.guild)
														treasuryHTML += `<tr><td>${member[1]}</td><td>${member[2]}</td><td>${member[3]}</td><td>${member[4]}</td><td>${member[2] + member[3] + member[4]}</td><td>${member[5]}</td><td>${member[6]}</td><td>${member[7]}</td><td>${member[8]}</td><td>${member[9]}</td><td>${member[10]}</td><td>${member[11]}</td><td>${member[12]}</td><td>${member[13]}</td><td>${member[14]}</td><td>${member[15]}</td><td>${member[16]}</td><td>${member[17]}</td><td>${member[18]}</td><td>${member[19]}</td><td>${member[20]}</td><td>${member[21]}</td><td>${member[22]}</td><td>${member[23]}</td><td>${member[24]}</td><td>${member[25]}</td><td>${member[26]}</td><td>${member[27]}</td><td>${member[28]}</td><td>${member[29]}</td></tr>`;
												});
	
												if (GuildTreasury) {
													treasuryHTML += `<tr></tr>`;
													treasuryHTML += `<tr><th>Era:Resource</th><th>Treasury</th><th>Donations</th><th>GE Cost</th><th>GVG Cost</th><th>GBG Cost</th><th>Net Change</th></tr>`;
													GuildTreasury.forEach(rss => {
														treasuryHTML += `<tr><td>${rss[1]}:${rss[2]}</td><td>${rss[3]}</td><td>${rss[4]}</td><td>${rss[5]}</td><td>${rss[6]}</td><td>${rss[7]}</td><td>${rss[8]}</td></tr>`;
													});
												}
	
												treasury.innerHTML = treasuryHTML + `</table></div>`;
												document.getElementById("treasuryCopyID").addEventListener("click", copy.TreasuryCopy);
												document.getElementById("treasuryTextLabel").addEventListener("click", collapse.fCollapseTreasury);
											}
											// console.debug(GuildDonations);
											$('body').i18n();
										}
										else {
											console.debug(msg.responseData.length);
										}
	
	} 
	else if (msg.requestMethod == "getTreasury") {
	/*Guild Treasury*/
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
										visitstats.className = "";
										cultural.innerHTML = ``;
										cultural.className = "";
										friendsDiv.innerHTML = '';
										gvg.innerHTML = ``;
										gvg.className = "";
										// armyDIV.innerHTML = ``;
										if (gvgSummary)
											gvgSummary.innerHTML = '';
										if (gvgAges)
											gvgAges.innerHTML = '';
	
	
										if (showOptions.showTreasury) {
											// var treasuryHTML = guild.innerHTML;
											var treasuryHTML = '';
	
	
											// if (!treasuryHTML){
											treasuryHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
						<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><p id="treasuryTextLabel" href="#treasuryText" data-toggle="collapse">
						<svg class="bi header-icon" id="treasuryicon" href="#treasuryText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseTreasury ? 'plus' : 'dash'}-circle"/></svg>
						<strong>Guild Treasury:</strong></p><button type="button" class="badge badge-pill badge-success float-right right-button" id="treasuryCopyID"><span data-i18n="copy">Copy</span></button>`;
											treasuryHTML += `<div id="treasuryText" style="height: ${toolOptions.treasurySize}px" class="overflow collapse ${collapse.collapseTreasury ? '' : 'show'}"><table>`;
											// }
											// else{
											// treasuryHTML = treasuryHTML.substring(0, treasuryHTML.length - 8);
											// }
											const resources = msg.responseData.resources;
											// GuildTreasury = msg.responseData.resources;
											initTreasury(msg.responseData.resources);
	
	
											for (var i = 0; i < helper.numAges; i++) {
												ResourceDefs.forEach(rssDef => {
													if (rssDef.era == helper.fAgefromLevel(helper.numAges - i) && resources[rssDef.id]) {
														treasuryHTML += `<tr><td>${helper.fGVGagesname(rssDef.era)}:${rssDef.name}</td><td>${resources[rssDef.id]}</td></tr>`;
														// rssName = rssDef.name;
														// rssEra = rssDef.era;
													}
												});
											}
											treasuryHTML += `<tr><td>Medals</td><td>${resources['medals']}</td></tr>`;
	
	
											treasury.innerHTML = treasuryHTML + `</table></div>`;
											// donationDIV.innerHTML = treasuryHTML + `</table></div>`;
											document.getElementById("treasuryCopyID").addEventListener("click", copy.TreasuryCopy);
											console.debug('GuildTreasury', GuildTreasury);
											document.getElementById("treasuryTextLabel").addEventListener("click", collapse.fCollapseTreasury);
											const treasuryDiv = document.getElementById("treasuryText");
											const resizeObserver = new ResizeObserver(entries => {
												for (const entry of entries) {
													if (entry.contentRect && entry.contentRect.height)
														setTreasurySize(entry.contentRect.height);
												}
											});
											resizeObserver.observe(treasuryDiv);
											$('body').i18n();
										}
										else {
											console.debug(msg.responseData.length);
										}
	
	} 
}            
else
{
									//output.innerHTML += `<div>*** ${msg.requestClass}</div>`;
	if (msg.requestClass == null) {
		if (msg.__class__ &&
			(msg.__class__ == 'CityEntityCulturalGoodsBuilding'
				|| msg.__class__ == 'CityEntityImpediment'
				|| msg.__class__ == 'CityEntityDiplomacy'
				|| msg.__class__ == 'CityEntityStaticProvider'
				|| msg.__class__ == 'CityEntityStreet'
				|| msg.__class__ == 'CityEntityHub'
				|| msg.__class__ == 'CityEntityOutpostShip'
				|| msg.__class__ == 'QuestTabMetadata'
				|| msg.__class__ == 'ChainMetadata'
				|| msg.__class__ == 'BuildingSetMetadata'
				|| msg.__class__ == 'InfoScreen'
				|| msg.type == 'off_grid')) {
			// ignore these
		}
		else if (msg.__class__ && msg.__class__.substring(0, 10) == 'CityEntity') {
			if (!CityEntityDefs[msg.id]) {
				CityEntityDefs[msg.id] = {
					'name': msg.name,
					'abilities': [],
					'entity_levels': [],
					'available_products': [],
				};
			}
			// console.debug(msg.name,msg);
			CityEntityDefs[msg.id] = msg;

		}
		else if (msg.__class__ && msg.__class__ == 'GenericCityEntity') {
			if (!CityEntityDefs[msg.id]) {
				CityEntityDefs[msg.id] = {
					'name': msg.name,
					'abilities': [],
					'entity_levels': [],
					'available_products': [],
				};
			}
			// console.debug(msg.name,msg);
			CityEntityDefs[msg.id] = msg;

		}
		else if (msg.__class__ && msg.__class__ == 'UnitType') {
			// MilitaryDefs.push([msg.unitTypeId,msg.name,msg.minEra]); 
			MilitaryDefs[msg.unitTypeId] = { 'name': msg.name, 'era': msg.minEra };
		}
		else if (msg.__class__ && msg.__class__ == 'CastleSystemLevelMetadata') {
			CastleDefs.push(msg);
			// console.debug(`CastleSystemLevelMetadata`, msg,CastleDefs);
		}
		else if (msg.__class__ && msg.__class__ == 'SelectionKitMetadata') {
			SelectionKitDefs.push(msg);
			// console.debug(`SelectionKitMetadata`, msg,SelectionKitDefs);
		}
		else if (msg.__class__ && msg.__class__ == 'BoostMetadata') {
			BoostMetadataDefs.push(msg);
			// console.debug(`BoostMetadata`, msg,BoostMetadataDefs);
		}
		else if (msg.__class__ && msg.__class__.substring(0, 18) == 'CityEntityCultural') {
			// console.debug(`CityEntityCultural`, msg.name,msg);
		}
		else if (msg.__class__ && msg.__class__ == 'BuildingUpgrade') {
			// console.debug(`BuildingUpgrade`, msg.name,msg);
		}
		else if (!msg.__class__) {
			// console.debug(`NO __class__`, msg.name,msg);
		}

		else
			console.debug(msg.name, msg);

	}

									// if(msg.__class__ && msg.__class__.substring(0,10) == 'CityEntity' && msg.type != 'military' && msg.type != 'off_grid'
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
};



browser.storage.onChanged.addListener(storageChange);

function storageChange(changes, namespace)  {
		for (var key in changes) {
			var storageChange = changes[key];
			//   console.debug('Storage key "%s" in namespace "%s" changed. ' +
			// 			  'Old value was "%s", new value is "%s".',
			// 			  key,
			// 			  namespace,
			// 			  storageChange.oldValue,
			// 			  storageChange.newValue);
			if (key == 'showOptions')
				setOptions('showOptions', storageChange.newValue);


			// showOptions = storageChange.newValue;
			// console.debug(changes);
			else if (key == 'tool'){
				language = storageChange.newValue.language;
				console.debug(language);
			}
			else if (key == 'targets') {
				// console.debug(storageChange.newValue,targetsTopic);
				targetsTopic = storageChange.newValue;
			}
			else if (key == 'targetText') {
				// console.debug(storageChange.newValue,targetText);
				targetText = storageChange.newValue;
			}
			else if (key == 'toolOptions') {
				setToolOptions(storageChange.newValue);
				// console.debug(toolOptions);
			}
			else if (key == 'donationPercent') {
				donationPercent = storageChange.newValue;
				setCurrentPercent(storageChange.newValue);
				// console.debug(storageChange.newValue);
			}
			else if (key == 'donationSuffix') {
				donationSuffix = storageChange.newValue;
				setCurrentPercent(storageChange.newValue);
				// console.debug(storageChange.newValue);
			}
			else if (key == 'url') {
				url = storageChange.newValue;
				// console.debug(url);
			}

		}
		// console.debug('onChanged',changes);
		// console.debug('showOptions',showOptions);
	};

	export function setMyInfo(name,id,clan,clan_id,createdAt,era){
		MyInfo.name = name;
		MyInfo.id = id;
		MyInfo.guild = clan;
		MyInfo.guildID = clan_id;
		MyInfo.createdAt = createdAt;
		MyInfo.era = era;
	}
	
export function setMyName(name){
	MyInfo.name = name;
}

export function setMyID(id){
	MyInfo.id = id;
}

export function setMyGuild(name){
	MyInfo.guild = name;
}

export function setMyGuildID(id){
	MyInfo.guildID = id;
}

export function setMyGuildPermissions(permissions){
	MyGuildPermissions = permissions;
}


export function setMyGuildPosition(id){
	MyInfo.guildPosition = id;
	storage.set(GameOrigin + 'MyInfo',MyInfo);
}

export function setPlayerName(name,id){
	PlayerName = name;
	PlayerID = id;
	GBselected.player_name = name;
}


function fCleardForGVG(){
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
    visitstats.className = "";
	cultural.innerHTML = ``;
    cultural.className = "";
	friendsDiv.innerHTML = '';
	treasury.innerHTML = '';
	treasuryLog.innerHTML = '';

}

function clearVisitPlayer(){
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
	cultural.className = "";
	friendsDiv.innerHTML = '';
	treasury.innerHTML = '';
	treasuryLog.innerHTML = '';

}

function clearExpedition(){
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
    visitstats.className = "";
	cultural.innerHTML = ``;
    cultural.className = "";
	friendsDiv.innerHTML = '';
	gvg.innerHTML = ``;
	gvg.className = "";
	// armyDIV.innerHTML = ``;
	treasury.innerHTML = '';
	treasuryLog.innerHTML = '';
	if(gvgSummary)
		gvgSummary.innerHTML = '';
	if(gvgAges)
		gvgAges.innerHTML = '';

}

function clearForBattleground(){
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
	visitstats.className = "";
	cultural.innerHTML = ``;
	cultural.className = "";
	friendsDiv.innerHTML = '';
	gvg.innerHTML = ``;
	gvg.className = "";
	// armyDIV.innerHTML = ``;
	treasury.innerHTML = '';
	treasuryLog.innerHTML = '';
	if(gvgSummary)
		gvgSummary.innerHTML = '';
	if(gvgAges)
		gvgAges.innerHTML = '';

}

function clearStartup(){
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
    visitstats.className = "";
	cultural.innerHTML = ``;
    cultural.className = "";
	friendsDiv.innerHTML = '';
	gvg.innerHTML = ``;
	gvg.className = "";
	armyDIV.innerHTML = ``;
	treasury.innerHTML = '';
	treasuryLog.innerHTML = '';
	if(gvgSummary)
		gvgSummary.innerHTML = '';
	if(gvgAges)
		gvgAges.innerHTML = '';
	GuildDonations = [];
	GuildTreasury = [];
	//  ResourceDefs = [];
	//  PowerSoH = [];
	// PowerHoF = [];
	GuildsGoods = []; 
	Bonus = {
		'aid' : 0,
		'spoils' : 0,
		'diplomatic' : 0,
		'strike' : 0
	};
	rewardsGE = [];
	rewardsGBG = [];
	rewardsGeneric = [];
	rewardsArmy = [];
	rewardsCity = [];
	rewardsOtherPlayer = [];
}

function clearCultural(){
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
	visitstats.className = "";
	friendsDiv.innerHTML = '';
	gvg.innerHTML = ``;
	gvg.className = "";
	armyDIV.innerHTML = ``;
	treasury.innerHTML = '';
	treasuryLog.innerHTML = '';
	if(gvgSummary)
		gvgSummary.innerHTML = '';
	if(gvgAges)
		gvgAges.innerHTML = '';

}

function receiveStorage(result){
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
	Object.entries(result).forEach(element => {
			// if(element.toString)
			// console.debug(element);
			const [key,value] = element;
			// console.debug(key,value,key.substring(0,8));
			if(key.substring(0,8) == "collapse"){
				// console.debug(key,value);
				collapseOptions(key,value);
			}
			else if(key == 'showOptions')
				setOptions('showOptions',value);
			else if(key == ResourceDefs){
				// if(key == ResourceDefs)
				setResourceDefs(value);
			}
			else if(key == 'CityEntityDefs'){
				// if(key == CityEntityDefs)
					CityEntityDefs = value;
					console.debug(key,value);
				}
			else if(key == 'tool'){
				if(value.language != 'auto'){
					language = value.language;
					console.debug(language);
				}
			}
			else if(key == 'targets'){
					targetsTopic = value;
					// console.debug(targetsTopic);
			}
			else if(key == 'targetText'){
				targetText = value;
				// console.debug(targetText);
			}
			else if(key == 'toolOptions'){
				setToolOptions(value);
				// console.debug(toolOptions);
			}
			else if(key == 'donationPercent'){
				donationPercent = value;
				setCurrentPercent(value);
				// console.debug(value);
			}
			else if(key == 'donationSuffix'){
				donationSuffix = value;
				setCurrentPercent(value);
				// console.debug(value);
			}
			else if(key == 'url'){
				url = value;
				// console.debug(value);
			}
			else	
				console.debug(key,value);
		});
	
}

export function initTreasury(resources){


	for (var i = 0; i < helper.numAges; i++) {
		ResourceDefs.forEach(rssDef => {
			if(rssDef.era == helper.fAgefromLevel(helper.numAges - i) && resources[rssDef.id]){
				GuildTreasury.push([rssDef.id,helper.fGVGagesname(rssDef.era),rssDef.name,resources[rssDef.id],0,0,0,0,0]);
				// ID, era name, rss name, treasury qty, donation, GE spend, GVG spend, GBG spend, net change
			}
		});
	};
	console.debug(GuildTreasury);

}

export function showRewards(reward){
	var rewardId = 'collectRewardText';
	var rewardTitle = '';
	// var rewards = [];
	var name = helper.fRewardShortName(reward.name);
	var qty = reward.amount;
	// if((reward.type = 'good' && !reward.subType == 'rogue') || reward.id.includes('goods#each#CurrentEra')) 
	if(reward.totalAmount) qty = reward.totalAmount;
	if(reward.source == 'guildExpedition'){
		rewardTitle = 'GE ';
		rewardId = 'collectGERewardText';
		if(!rewardsGE[name]) 
			rewardsGE[name] = 0;
		rewardsGE[name] += qty;
		console.debug('rewardsGE:', rewardsGE,reward);
		// rewards = rewardsGE;
	}
	else if(reward.source == 'battlegrounds_conquest'){
		rewardTitle = 'GBG ';
		rewardId = 'collectGBGRewardText';
		if(!rewardsGBG[name]) 
			rewardsGBG[name] = 0;
		rewardsGBG[name] += qty;
		console.debug('rewardsGBG:', rewardsGBG,reward);
		// rewards = rewardsGBG;
	}
	else if(reward.source == 'otherPlayer' || reward.source == 'pickupProduction'){
		// reward already stored. so just show it
	}
	else {
		rewardTitle = 'Other ';
		rewardId = 'collectRewardText';
		if(reward.type == 'resource')
			name = helper.fResourceShortName(reward.subType);
		if(!rewardsGeneric[name]) 
			rewardsGeneric[name] = 0;
		rewardsGeneric[name] += qty;
		console.debug('rewardsGeneric:', rewardsGeneric,reward);
		// rewards = rewardsGeneric;
	}
	var text = '';
	if(Object.keys(rewardsGE).length){	
		text += '<p><em>GE</em><br>';
		Object.keys(rewardsGE).forEach(item => {
			// console.debug(item);
			text += `${rewardsGE[item]} ${item}<br>`;
		});
		text += '</p>';
	}
	if(Object.keys(rewardsGBG).length){
		text += '<p><em>GBG</em><br>';
		Object.keys(rewardsGBG).forEach(item => {
			// console.debug(item);
			text += `${rewardsGBG[item]} ${item}<br>`;
		});
		text += '</p>';
	}
	if(Object.keys(rewardsGeneric).length){
		text += '<p><em>Event/City</em><br>';
		Object.keys(rewardsGeneric).forEach(item => {
			// console.debug(item);
			text += `${rewardsGeneric[item]} ${item}<br>`;
		});
		text += '</p>';
	}
	if(Object.keys(rewardsOtherPlayer).length){
		text += '<p><em>Aid/Plunder</em><br>';
		Object.keys(rewardsOtherPlayer).forEach(item => {
			// console.debug(item);
			text += `${rewardsOtherPlayer[item]} ${item}<br>`;
		});
		text += '</p>';
	}
	if(Object.keys(rewardsCity).length){
		text += '<p><em>City</em><br>';
		Object.keys(rewardsCity).forEach(item => {
			// console.debug(item);
			text += `${rewardsCity[item]} ${item}<br>`;
		});
		text += '</p>';
	}
	if(Object.keys(rewardsArmy).length){
		text += '<p><em>Army</em><br>';
		Object.keys(rewardsArmy).forEach(item => {
			// console.debug(item);
			text += `${rewardsArmy[item]} ${item}<br>`;
		});
		text += '</p>';
	}

	cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel" href="#rewardsText" data-toggle="collapse">
	<svg class="bi header-icon" id="rewardsicon" href="#rewardsText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseRewards ? 'plus' : 'dash'}-circle"/></svg>
	<strong><span data-i18n="reward">REWARDS:</span></strong></p>
	<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
	<div id="rewardsText" class="overflow resize collapse ${collapse.collapseRewards ? '' : 'show'}">${text}</div></div>`;
	rewardObserve();
	document.getElementById("rewardsTextLabel").addEventListener("click", collapse.fCollapseRewards);
}


function rewardObserve(){
	const  rewardDiv = document.getElementById("rewardsText");
	rewardDiv.addEventListener("mouseup", setHeight);
	const resizeObserver = new ResizeObserver(entries => {
		for (const entry of entries) {
			if (entry.contentRect && entry.contentRect.height) heightRewards = entry.contentRect.height;
		}
	});
	resizeObserver.observe(rewardDiv);
	if($('#rewardsText').height() > toolOptions.rewardSize){
		$('#rewardsText').height(toolOptions.rewardSize) ;
	}

}


// The onClicked callback function.
function onClickHandler(info, tab) {
	console.debug("onClickHandler: " + JSON.stringify(info));

	if (info.menuItemId == "radio1" || info.menuItemId == "radio2") {
	  console.debug("radio item " + info.menuItemId +
				  " was clicked (previous checked state was "  +
				  info.wasChecked + ")");
	} else if (info.menuItemId == "checkbox1" || info.menuItemId == "checkbox2") {
	  console.debug(JSON.stringify(info));
	  console.debug("checkbox item " + info.menuItemId +
				  " was clicked, state is now: " + info.checked +
				  " (previous state was " + info.wasChecked + ")");
  
	} else {
	  console.debug("item " + info.menuItemId + " was clicked");
	  console.debug("info: " + JSON.stringify(info));
	  console.debug("tab: " + JSON.stringify(tab));
	}
  };
  
  
  browser.runtime.onInstalled.addListener(handleInstalled);
  // Check whether new version is installed
  function handleInstalled(details) {
		if (details.reason == "install") {
			console.debug(tool.name + " installed!");
		} else if (details.reason == "update") {
			console.debug(tool.name + " updated from " + details.previousVersion + " to " + tool.version + "!");
			alert(tool.name + " updated from " + details.previousVersion + " to " + tool.version + "!");
			// console.debug(oReq.responseText);
		}
	};

function toggleDebug(){
	debugEnabled = !debugEnabled;
	var logo = document.getElementById("logo")
	if(debugEnabled == true){
		// logo.src = bug;
		logo.outerHTML = `<svg id="logo" class="bi text-light" width="24" height="24" fill="currentColor"><use xlink:href="${icons}#bug"/></svg>`;
	}
	else{
		logo.outerHTML = `<img src="/icons/Icon48.png" width="24" height="24" id="logo">`;
		// logo.src = "/icons/Icon48.png";
	}
	document.getElementById("logo").addEventListener('click', toggleDebug);
	console.debug('toggleDebug',debugEnabled);
}

export function removeDebug(){
	document.getElementById("logo").removeEventListener('click', toggleDebug);
}

export function checkDebug() {

	return debugEnabled;
}	

var heightRewards = toolOptions.rewardSize;
function setHeight(){
	console.debug('mouseup',heightRewards);
	setRewardSize(heightRewards);
}



browser.runtime.onUpdateAvailable.addListener(handleUpdateAvailable);
function handleUpdateAvailable(details) {
		console.debug("updating to version " + details.version);
		alert("updating to version " + details.version);
		browser.runtime.reload();
	};

	let requestingCheck = browser.runtime.requestUpdateCheck();
	requestingCheck.then(onRequested, onError);

function onRequested(status, details) {
		if (status == "update_available") {
			console.debug("update pending...");
			console.log(details.version);
		} else if (status == "no_update") {
			console.debug("no update found");
		} else if (status == "throttled") {
			console.debug("Oops, I'm asking too frequently - I need to back off.");
		}
	};

	function onError(error) {
		console.log(`Error: ${error}`);
	  }
	  