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
import "bootstrap";
import collapseOptions, * as collapse from "./fn/collapse.js";
import browser from "webextension-polyfill";
import { setRewardSize, setToolOptions, toolOptions } from "./fn/globals.js";
import * as helper from "./fn/helper.js";
import * as element from "./fn/AddElement";
import { setCurrentPercent } from "./msg/GreatBuildingsService.js";
import { ResourceDefs, setResourceDefs } from "./msg/ResourceService.js";
import setOptions, { showOptions } from "./vars/showOptions.js";
import "../css/main.scss";
import { mapToStyles } from "@popperjs/core/lib/modifiers/computeStyles.js";
import {
  handleRequestFinished,
  SetCityEntityDefs,
  CityEntityDefs,
  rewardsOtherPlayer,
} from "./handleRequestFinished.js";
import { storageChange } from "./handleRequestFinished.js";

console.debug(toolOptions);
export var debugEnabled = false;

let contentTypes = {};
export var tool = browser.runtime.getManifest();
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
console.info("themeName", browser.devtools.panels.themeName);
var title = document.createElement("div");
document.body.appendChild(title);
title.id = "title";
title.className = "d-flex flex-row justify-content-between";

// TODO fix dark theme
if (darkMode == "dark") {
  title.className = "d-flex flex-row justify-content-between text-light bg-dark";
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
if (darkMode == "dark") {
  // 	newelement.classList.toggle("nord-styles");
  // 	newelement.classList.toggle("dark-mode");
  newelement.classList.toggle("bg-dark");
}
// else
newelement.classList.toggle("bootstrap-styles");
newelement = document.createElement("div");
newelement.className = "p-2";
title.appendChild(newelement);
var child = document.createElement("img");
child.src = "/icons/Icon48.png";
child.width = "24";
child.height = "24";
child.id = "logo";
// if (DEV)
child.addEventListener("click", toggleDebug);
newelement.appendChild(child);
newelement = document.createElement("div");
newelement.className = "p-8 title";
title.appendChild(newelement);
child = document.createElement("h6");
// TODO fix dark theme
if (darkMode == "dark") child.className = "title text-light bg-dark";
else child.className = "title";
// child.innerHTML = pkg.name;
child.textContent = EXT_NAME;
newelement.appendChild(child);
newelement = document.createElement("div");
newelement.innerHTML = `<span class="material-icons-outlined md-18 options-icon">settings</span>`;
newelement.classList.toggle("p-2");
// newelement.className = "p-2";
// child = document.createElement("img");
var svgNS = "http://www.w3.org/2000/svg";
// child = document.createElementNS(svgNS,"svg");
// child = document.createElement("div");
newelement.id = "go-to-options";

title.appendChild(newelement);

// city info
export var content = document.createElement("div");
document.body.appendChild(content);
content.id = "content";
if (darkMode == "dark") content.className = "text-light bg-dark";
export var citystats = document.createElement("div");
content.appendChild(citystats);
citystats.className = "alert alert-warning";
citystats.id = "citystats";
citystats.innerHTML = `<p><strong><span data-i18n="load">Load the game ...</span></strong></p>`;

export var alerts = document.createElement("div");
alerts.id = "alerts";
content.appendChild(alerts);

export var targets = document.createElement("div");
targets.id = "targets";
content.appendChild(targets);

export var bonusDIV = document.createElement("div");
bonusDIV.id = "bonus";
content.appendChild(bonusDIV);

export var incidents = document.createElement("div");
incidents.className = "incidents";
incidents.id = "incidents";
content.appendChild(incidents);
export var cityinvested = document.createElement("div");
content.appendChild(cityinvested);
cityinvested.id = "invested";

export var galaxyDIV = document.createElement("div");
galaxyDIV.id = "galaxy";
// galaxyDIV.className="hidden";
galaxyDIV.style.display = "none";
content.appendChild(galaxyDIV);

export var visitstats = document.createElement("div");
content.appendChild(visitstats);
visitstats.id = "visit";
export var cityrewards = document.createElement("div");
content.appendChild(cityrewards);
cityrewards.id = "rewards";

export var output = document.createElement("div");
content.appendChild(output);
output.id = "output";
export var donationDIV = document.createElement("div");
content.appendChild(donationDIV);
donationDIV.id = "donation";
export function SetDonationDIV(value) {
  donationDIV = value;
}
export var donation2DIV = document.createElement("div");
content.appendChild(donation2DIV);
donation2DIV.id = "donation2";
export function SetDonation2DIV(value) {
  donation2DIV = value;
}
export var donationDIV2 = document.createElement("div");
content.appendChild(donationDIV2);
donationDIV2.id = "donationDIV2";
export function SetDonationDIV2(value) {
  donationDIV2 = value;
}
export var greatbuilding = document.createElement("div");
content.appendChild(greatbuilding);
greatbuilding.id = "greatbuilding";
export function SetGreatbuilding(value) {
  greatbuilding = value;
}

export var overview = document.createElement("div");
content.appendChild(overview);
overview.id = "overview";
export var cultural = document.createElement("div");
content.appendChild(cultural);
cultural.id = "cultural";
export function SetCultural(value) {
  cultural = value;
}
export var info = document.createElement("div");
content.appendChild(info);
info.id = "info";

export var armyDIV = document.createElement("div");
content.appendChild(armyDIV);
armyDIV.id = "army";

export var goodsDIV = document.createElement("div");
content.appendChild(goodsDIV);
goodsDIV.id = "goods";

export var gvg = document.createElement("div");
content.appendChild(gvg);
gvg.id = "gvg";

var buildingsDIV = document.createElement("div");
buildingsDIV.id = "buildings";
content.appendChild(buildingsDIV);

export var guild = document.createElement("div");
content.appendChild(guild);
guild.id = "guild";
export var friendsDiv = document.createElement("div");
content.appendChild(friendsDiv);
friendsDiv.id = "friends";
export var treasury = document.createElement("div");
content.appendChild(treasury);
treasury.id = "treasury";
export var treasuryLog = document.createElement("div");
content.appendChild(treasuryLog);
treasury.id = "treasuryLog";
export var clipboard = document.createElement("div");
content.appendChild(clipboard);
clipboard.id = "clipboard";
clipboard.style.display = "none";
export var alerts_bottom = document.createElement("div");
alerts_bottom.id = "alerts_bottom";
content.appendChild(alerts_bottom);
export var debug = document.createElement("div");
content.appendChild(debug);
debug.id = "debug";
export var modal = document.createElement("div");
content.appendChild(modal);
modal.id = "modal";

newelement = document.createElement("div");
newelement.className = "modal-dialog modal-sm";
newelement.id = "testModal";
// newelement.innerHTML = '<div class="modal-dialog modal-sm">...</div>';
modal.appendChild(newelement);

console.debug("clipboard", clipboard.innerHTML);
if (showOptions.clipboard) {
  console.debug("clipboard", clipboard.innerHTML);
  // var clipboard = document.getElementById("clipboard");

  // if( clipboard == null){
  // 	// console.debug('2');
  // 	clipboard = document.createElement('div');
  // 	var content = document.getElementById("content");
  // 	content.appendChild(clipboard);
  //  }

  var clipboardHTML = `<div class="alert alert-success alert-dismissible show collapsed"><p id="clipboardTextLabel" href="#buildingsText" data-bs-toggle="collapse">
	${element.icon("clipboardicon", "clipboardText", collapse.collapseClipboard)}
	<strong><span data-i18n="clipboard">Clipboard</span>:</strong></p>`;
  clipboardHTML += element.close();
  clipboardHTML += element.copy("clipboardCopyID", "warning", "right", collapse.collapseClipboard);
  clipboardHTML += `<div id="clipboardText" class="resize collapse ${collapse.collapseClipboard ? "" : "show"}"><p>`;

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

export const getType = (type) => {
  return type.replace(/.*(javascript|image|html|font|json|css|text).*/g, "$1");
};

// eslint-disable-next-line no-unused-vars
const formatBytes = (size) => {
  return `${parseInt(size / 1000)} KB`;
};

document.querySelector("#go-to-options").addEventListener("click", function () {
  // console.debug('options');

  browser.permissions
    .request({
      permissions: ["storage"],
    })
    .then((granted) => {
      // The callback argument will be true if the user granted the permissions.
      if (granted) {
        //   doSomething();
        if (browser.runtime.openOptionsPage) {
          browser.runtime.openOptionsPage();
        } else {
          window.open(browser.runtime.getURL("options.html"));
        }
      } else {
        //   doSomethingElse();
      }
    });
});

export var language = window.navigator.userLanguage || window.navigator.language;
console.debug(language);
export function SetLanguage(value) {
  language = value;
}
// eslint-disable-next-line no-undef
if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line no-undef
  $.i18n.debug = true;
  // language =
  // console.debug(window);
}

window.addEventListener(
  "message",
  function (event) {
    console.debug("received response:  ", event.data);
  },
  false
);

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ({ matches }) => {
  document.body.classList.toggle("bg-dark");
  document.body.classList.toggle("text-light");
  if (matches) {
    console.log("change to dark mode!");
    darkMode == "dark";
  } else {
    console.log("change to light mode!");
  }
});
// eslint-disable-next-line no-unused-vars
function onEvent(message, params) {
  console.debug(message, params);
}

// browser.storage.local.clear();
browser.permissions
  .contains({
    permissions: ["storage"],
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
        console.debug("getBytesInUse", size);
      });

      // browser.storage.local.get(['showOptions','collapseOptions','CityEntityDefs','tool','targets','toolOptions','donationPercent','url'],
      browser.storage.local.get(null).then((result) => {
        // console.debug('result', result);
        receiveStorage(result);
        if (language != "auto") {
          // eslint-disable-next-line no-undef
          $.i18n({
            locale: language,
          });
        }
        // eslint-disable-next-line no-undef
        console.debug(language, $.i18n().locale, $.i18n.debug);
        // eslint-disable-next-line no-undef
        $.i18n()
          .load({
            //     'fr' : {
            //         'load' : 'Chargez le jeu pour voir les statistiques de votre ville'
            // },
            de: {
              load: "Laden Sie das Spiel, um Ihre Stadtstatistiken anzuzeigen",
            },
            sv: {
              load: "Ladda spelet för att se din stadsstatistik",
            },
            fi: {
              load: "Lataa peli nähdäksesi kaupunkitilastot",
            },
            it: {
              load: "Carica il gioco per vedere le statistiche della tua città",
            },
            pt: {
              load: "Carregue o jogo para ver as estatísticas da sua cidade",
            },
            nl: {
              load: "Laad het spel om je stadsstatistieken te zien",
            },
            sr: {
              load: "Учитајте игру да бисте видели статистику града",
            },
            ru: {
              load: "Слава Украине!",
            },
            ua: {
              load: "Слава Україні!",
            },
            us: "i18n/en.json",
            en: "i18n/en.json",
            es: "i18n/es.json",
            fr: "i18n/fr.json",
            el: "i18n/el.json",
            gr: "i18n/gr.json",
          })
          .done(function () {
            // load lang strings on page already loaded
            // eslint-disable-next-line no-undef
            $("body").i18n();
            // eslint-disable-next-line no-undef
            console.debug("jQuery " + (jQuery ? $().jquery : "NOT") + " loaded");
            console.debug("i18n.load OK");
          });
      });
    } else {
      // The extension doesn't have the permissions.
      citystats.innerHTML = `<div class="alert alert-danger"><p><strong>Please Enable FoE-Info</strong></p>
							  <button type="button" class="btn btn-danger" id="enableFoE">Enable</button></div>`;
      citystats.className = "alert alert-danger";
      document.getElementById("enableFoE").addEventListener("click", function () {
        // console.debug('options');

        browser.permissions
          .request({
            permissions: ["storage", "clipboardWrite"],
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
    header.name.toLowerCase() === "origin" &&
    (header.value.indexOf("moz-extension://") === 0 || header.value.indexOf("chrome-extension://") === 0)
  );
}

// eslint-disable-next-line no-undef
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    return {
      requestHeaders: details.requestHeaders.filter((x) => !originWithId(x)),
    };
  },
  { urls: ["https://*.innogamescdn.com/*"] },
  ["requestHeaders"]
);

browser.devtools.network.onRequestFinished.addListener(handleRequestFinished);
browser.storage.onChanged.addListener(storageChange);

export function fCleardForGVG() {
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
  friendsDiv.innerHTML = "";
  treasury.innerHTML = "";
  treasuryLog.innerHTML = "";
}

export function receiveStorage(result) {
  console.debug("result", result);
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
    if (key.substring(0, 8) == "collapse") {
      // console.debug(key,value);
      collapseOptions(key, value);
    } else if (key == "showOptions") setOptions("showOptions", value);
    else if (key == ResourceDefs) {
      // if(key == ResourceDefs)
      setResourceDefs(value);
    } else if (key == "CityEntityDefs") {
      // if(key == CityEntityDefs)
      SetCityEntityDefs(value);
      console.debug(key, value);
    } else if (key == "tool") {
      if (value.language != "auto") {
        language = value.language;
        console.debug(language);
      }
    } else if (key == "targets") {
      targetsTopic = value;
      // console.debug(targetsTopic);
    } else if (key == "targetText") {
      targetText = value;
      // console.debug(targetText);
    } else if (key == "toolOptions") {
      setToolOptions(value);
      // console.debug(toolOptions);
    } else if (key == "donationPercent") {
      donationPercent = value;
      setCurrentPercent(value);
      // console.debug(value);
    } else if (key == "donationSuffix") {
      donationSuffix = value;
      // console.debug(value);
    } else if (key == "url") {
      url = value;
      // console.debug(value);
    } else console.debug(key, value);
  });
}

export function initTreasury(resources) {
  for (var i = 0; i < helper.numAges; i++) {
    ResourceDefs.forEach((rssDef) => {
      if (rssDef.era == helper.fAgefromLevel(helper.numAges - i) && resources[rssDef.id]) {
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
  var rewardId = "collectRewardText";
  var rewardTitle = "";
  // var rewards = [];
  var name = helper.fRewardShortName(reward.name);
  var qty = reward.amount;
  // if((reward.type = 'good' && !reward.subType == 'rogue') || reward.id.includes('goods#each#CurrentEra'))
  if (reward.totalAmount) qty = reward.totalAmount;
  if (reward.source == "guildExpedition") {
    rewardTitle = "GE ";
    rewardId = "collectGERewardText";
    if (!rewardsGE[name]) rewardsGE[name] = 0;
    rewardsGE[name] += qty;
    console.debug("rewardsGE:", rewardsGE, reward);
    // rewards = rewardsGE;
  } else if (reward.source == "battlegrounds_conquest") {
    rewardTitle = "GBG ";
    rewardId = "collectGBGRewardText";
    if (!rewardsGBG[name]) rewardsGBG[name] = 0;
    rewardsGBG[name] += qty;
    console.debug("rewardsGBG:", rewardsGBG, reward);
    // rewards = rewardsGBG;
  } else if (reward.source == "otherPlayer" || reward.source == "pickupProduction") {
    // reward already stored. so just show it
  } else {
    rewardTitle = "Other ";
    rewardId = "collectRewardText";
    if (reward.type == "resource") name = helper.fResourceShortName(reward.subType);
    if (!rewardsGeneric[name]) rewardsGeneric[name] = 0;
    rewardsGeneric[name] += qty;
    console.debug("rewardsGeneric:", rewardsGeneric, reward);
    // rewards = rewardsGeneric;
  }
  var text = "";
  if (Object.keys(rewardsGE).length) {
    text += "<p><em>GE</em><br>";
    Object.keys(rewardsGE).forEach((item) => {
      // console.debug(item);
      text += `${rewardsGE[item]} ${item}<br>`;
    });
    text += "</p>";
  }
  if (Object.keys(rewardsGBG).length) {
    text += "<p><em>GBG</em><br>";
    Object.keys(rewardsGBG).forEach((item) => {
      // console.debug(item);
      text += `${rewardsGBG[item]} ${item}<br>`;
    });
    text += "</p>";
  }
  if (Object.keys(rewardsGeneric).length) {
    text += "<p><em>Event/City</em><br>";
    Object.keys(rewardsGeneric).forEach((item) => {
      // console.debug(item);
      text += `${rewardsGeneric[item]} ${item}<br>`;
    });
    text += "</p>";
  }
  if (Object.keys(rewardsOtherPlayer).length) {
    text += "<p><em>Aid/Plunder</em><br>";
    Object.keys(rewardsOtherPlayer).forEach((item) => {
      // console.debug(item);
      text += `${rewardsOtherPlayer[item]} ${item}<br>`;
    });
    text += "</p>";
  }
  if (Object.keys(rewardsCity).length) {
    text += "<p><em>City</em><br>";
    Object.keys(rewardsCity).forEach((item) => {
      // console.debug(item);
      text += `${rewardsCity[item]} ${item}<br>`;
    });
    text += "</p>";
  }
  if (Object.keys(rewardsArmy).length) {
    text += "<p><em>Army</em><br>";
    Object.keys(rewardsArmy).forEach((item) => {
      // console.debug(item);
      text += `${rewardsArmy[item]} ${item}<br>`;
    });
    text += "</p>";
  }

  cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel" href="#rewardsText" data-bs-toggle="collapse">
  ${element.icon("rewardsicon", "rewardsText", collapse.collapseRewards)}
	<strong><span data-i18n="reward">REWARDS:</span></strong></p>
	${element.close()}
	<div id="rewardsText" stype="height: 400px" class="overflow resize collapse ${
    collapse.collapseRewards ? "" : "show"
  }">${text}</div></div>`;
  rewardObserve();
  document.getElementById("rewardsTextLabel").addEventListener("click", collapse.fCollapseRewards);
}

export function showRewards(rewards) {
  var rewardTitle = "";
  var text = "";
  // var rewards = [];

  rewards.forEach((reward) => {
    var name = helper.fRewardShortName(reward.name);
    var qty = reward.amount;
    if (reward.source == "autoAid") {
      rewardTitle = "City ";
      if (reward.type == "resource") {
        console.debug("autoAid:resource", reward.subType, qty, reward);
        if (rewardsCity[reward.subType]) rewardsCity[reward.subType] += qty;
        else rewardsCity[reward.subType] = qty;
      } else if (reward.type == "blueprint") {
        console.debug("autoAid:resource", helper.fGBsname(reward.subType) + " " + name, qty, reward);
        if (rewardsCity[helper.fGBsname(reward.subType) + " " + name])
          rewardsCity[helper.fGBsname(reward.subType) + " " + name] += qty;
        else rewardsCity[helper.fGBsname(reward.subType) + " " + name] = qty;
      } else {
        if (rewardsCity[reward.subType]) rewardsCity[reward.subType] += qty;
        else rewardsCity[reward.subType] = qty;
      }

      console.debug("autoAid:", rewardsCity, reward);
      // rewards = rewardsGE;
    } else {
      rewardTitle = "Other ";
      if (reward.type == "resource") name = helper.fResourceShortName(reward.subType);
      if (!rewardsGeneric[name]) rewardsGeneric[name] = 0;
      rewardsGeneric[name] += qty;
      console.debug("rewardsGeneric:", rewardsGeneric, reward);
      // rewards = rewardsGeneric;
    }
    if (Object.keys(rewardsGE).length) {
      text += "<p><em>GE</em><br>";
      Object.keys(rewardsGE).forEach((item) => {
        console.debug(item);
        text += `${rewardsGE[item]} ${item}<br>`;
      });
      text += "</p>";
    }
    if (Object.keys(rewardsGBG).length) {
      text += "<p><em>GBG</em><br>";
      Object.keys(rewardsGBG).forEach((item) => {
        console.debug(item);
        text += `${rewardsGBG[item]} ${item}<br>`;
      });
      text += "</p>";
    }
    if (Object.keys(rewardsGeneric).length) {
      text += "<p><em>Event/City</em><br>";
      Object.keys(rewardsGeneric).forEach((item) => {
        console.debug(item);
        text += `${rewardsGeneric[item]} ${item}<br>`;
      });
      text += "</p>";
    }
    if (Object.keys(rewardsOtherPlayer).length) {
      text += "<p><em>Aid/Plunder</em><br>";
      Object.keys(rewardsOtherPlayer).forEach((item) => {
        console.debug(item);
        text += `${rewardsOtherPlayer[item]} ${item}<br>`;
      });
      text += "</p>";
    }
    if (Object.keys(rewardsCity).length) {
      text += "<p><em>City</em><br>";
      Object.keys(rewardsCity).forEach((item) => {
        console.debug(item);
        text += `${rewardsCity[item]} ${item}<br>`;
      });
      text += "</p>";
    }
    if (Object.keys(rewardsArmy).length) {
      text += "<p><em>Army</em><br>";
      Object.keys(rewardsArmy).forEach((item) => {
        console.debug(item);
        text += `${rewardsArmy[item]} ${item}<br>`;
      });
      text += "</p>";
    }
  });

  cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel" href="#rewardsText" data-toggle="collapse">
  ${element.icon("rewardsicon", "rewardsText", collapse.collapseRewards)}
	<span data-i18n="reward"><strong>REWARDS:</strong></span></p>
	${element.close()}
	<div id="rewardsText" class="overflow resize collapse ${collapse.collapseRewards ? "" : "show"}">${text}</div></div>`;
  rewardObserve();
  document.getElementById("rewardsTextLabel").addEventListener("click", collapse.fCollapseRewards);
}

export function rewardObserve() {
  // eslint-disable-next-line no-undef
  $("#rewards").i18n();
  const rewardDiv = document.getElementById("rewardsText");
  rewardDiv.addEventListener("mouseup", setHeight);
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.contentRect && entry.contentRect.height) heightRewards = entry.contentRect.height;
    }
  });
  resizeObserver.observe(rewardDiv);
  // eslint-disable-next-line no-undef
  if ($("#rewardsText").height() > toolOptions.rewardSize) {
    // eslint-disable-next-line no-undef
    $("#rewardsText").height(toolOptions.rewardSize);
  }
}

// The onClicked callback function.
function onClickHandler(info, tab) {
  console.debug("onClickHandler: " + JSON.stringify(info));

  if (info.menuItemId == "radio1" || info.menuItemId == "radio2") {
    console.debug(
      "radio item " + info.menuItemId + " was clicked (previous checked state was " + info.wasChecked + ")"
    );
  } else if (info.menuItemId == "checkbox1" || info.menuItemId == "checkbox2") {
    console.debug(JSON.stringify(info));
    console.debug(
      "checkbox item " +
        info.menuItemId +
        " was clicked, state is now: " +
        info.checked +
        " (previous state was " +
        info.wasChecked +
        ")"
    );
  } else {
    console.debug("item " + info.menuItemId + " was clicked");
    console.debug("info: " + JSON.stringify(info));
    console.debug("tab: " + JSON.stringify(tab));
  }
}

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
}

function toggleDebug() {
  debugEnabled = !debugEnabled;
  var logo = document.getElementById("logo");
  if (debugEnabled == true) {
    // logo.src = bug;
    logo.outerHTML = `<span class="material-icons-outlined" id="logo">bug_report</span>`;
  } else {
    logo.outerHTML = `<img src="/icons/Icon48.png" width="24" height="24" id="logo">`;
    // logo.src = "/icons/Icon48.png";
  }
  document.getElementById("logo").addEventListener("click", toggleDebug);
  console.debug("toggleDebug", debugEnabled);
}

export function removeDebug() {
  document.getElementById("logo").removeEventListener("click", toggleDebug);
}

export function checkDebug() {
  return debugEnabled;
}

var heightRewards = toolOptions.rewardSize;
function setHeight() {
  console.debug("mouseup", heightRewards);
  setRewardSize(heightRewards);
}

browser.runtime.onUpdateAvailable.addListener(handleUpdateAvailable);
function handleUpdateAvailable(details) {
  console.debug("updating to version " + details.version);
  alert("updating to version " + details.version);
  browser.runtime.reload();
}

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
}

function onError(error) {
  console.log(`Error: ${error}`);
}
