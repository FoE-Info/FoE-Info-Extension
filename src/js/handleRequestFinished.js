import BigNumber from "bignumber.js";
import * as collapse from "./fn/collapse.js";
import browser from "webextension-polyfill";
import * as copy from "./fn/copy.js";
import { setTreasurySize, toolOptions } from "./fn/globals.js";
import * as helper from "./fn/helper.js";
import * as storage from "./fn/storage.js";
import * as element from "./fn/AddElement";
import { armyUnitManagementService } from "./msg/ArmyUnitManagementService.js";
import { getBonuses, getLimitedBonuses } from "./msg/BonusService.js";
import { pickupProduction } from "./msg/CityProductionService.js";
import {
  deploySiegeArmy,
  getContinent,
  getProvinceDetailed,
  gvgAges,
  gvgSummary,
  grantIndependence,
} from "./msg/ClanBattleService.js";
import { conversationService, getConversation } from "./msg/ConversationService.js";
import { contributeForgePoints, getConstruction, getConstructionRanking } from "./msg/GreatBuildingsService.js";
import {
  clearBattleground,
  getBattleground,
  getBuildings,
  getLeaderboard,
  getPlayerLeaderboard,
  getState,
  removeSignal,
  setSignal,
} from "./msg/GuildBattlegroundService.js";
import { guildExpeditionService } from "./msg/GuildExpeditionService.js";
import { otherPlayerService, otherPlayerServiceUpdateActions } from "./msg/OtherPlayerService.js";
import {
  availableFP,
  getPlayerResources,
  getResourceDefinitions,
  ResourceDefs,
  Resources,
} from "./msg/ResourceService.js";
import { boostService, boostServiceAllBoosts, City, emissaryService, startupService } from "./msg/StartupService.js";
import { showOptions } from "./vars/showOptions.js";
import {
  alerts,
  armyDIV,
  cityinvested,
  cityrewards,
  citystats,
  cultural,
  debug,
  debugEnabled,
  donation2DIV,
  donationDIV,
  donationDIV2,
  fCleardForGVG,
  friendsDiv,
  getType,
  greatbuilding,
  guild,
  gvg,
  incidents,
  info,
  initTreasury,
  output,
  overview,
  receiveStorage,
  rewardObserve,
  showReward,
  showRewards,
  tool,
  treasury,
  treasuryLog,
  visitstats,
} from "./index.js";
import { targets } from "./index.js";

export var EpocTime = 0;
export var GameVersion = 0;
export var GameOrigin = "";
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
  createdAt: 0,
};

export var ignoredPlayers = {
  ignoredByPlayerIds: {},
  ignoredPlayerIds: {},
};

export var GBselected = {
  player: 0,
  player_name: "",
  id: 0,
  level: 0,
  name: "",
  era: "",
  connected: false,
  max_level: 0,
  current: 0,
  total: 0,
};
// var GBinfo = [];
// var GBrequest = [];
export var GuildDonations = [];
export var GuildTreasury = [];
// var GuildTreasuryAnalysis = [];
export var targetsTopic = "targets";
export var targetText = "";
export var GuildsGoods = [];
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
export var donationPercent = 190;
export var donationSuffix = "";

export var Bonus = {
  aid: 0,
  spoils: 0,
  diplomatic: 0,
  strike: 0,
};

export var url = [];

export var rewardsGE = [];
export var rewardsGBG = [];
export var rewardsGeneric = [];
export var rewardsArmy = [];
export var rewardsCity = [];
export var rewardsOtherPlayer = [];

// When a network request has finished this function will be called.
// browser.devtools.network.onRequestFinished.addListener().then(request => {
export function handleRequestFinished(request) {
  // console.log("Server IP: ", request.serverIPAddress);
  const response = request.response;
  if (request._resourceType == "websocket") {
    console.debug("request", request._resourceType, request, response);
  }
  // console.debug('request',request);
  // console.debug('response',response);
  var contentType = "";
  var contentHeader = "";

  if (response.httpVersion == "http/2.0")
    contentHeader = response.headers.find((header) => header.name === "content-type");
  else contentHeader = response.headers.find((header) => header.name === "Content-Type");

  if (contentHeader) {
    contentType = getType(contentHeader.value);
  }

  if (contentType == "json") {
    // console.debug(request.request.headers);
    contentType = request.request.headers.find((header) => header.name === "client-identification");
    // if(contentType) console.debug('client-identification:', contentType.value.substr(8,5));
    // else{
    // 	contentType = request.request.headers.find(header => header.name === 'Client-Identification')
    // 	// if(contentType) console.debug('Client-Identification:', contentType.value.substr(8,5));
    // }
    if (contentType && contentType.value && GameVersion != contentType.value.substr(8, 5)) {
      GameVersion = contentType.value.substr(8, 5);
      citystats.innerHTML += `<div><span data-i18n="gameversion">Game Version</span>: ${GameVersion}<br>${EXT_NAME}: ${tool.version}</div>`;
      // console.debug('version:', GameVersion);
    }

    request.getContent().then(async ([body, mimeType]) => {
      // console.log("Content: ", body);
      // console.log("MIME type: ", mimeType);
      const parsed = JSON.parse(body);
      // console.debug('parsed:', parsed);
      if (parsed && parsed.length) {
        for (var i = 0; i < parsed.length; i++) {
          let msg = parsed[i];
          processParsedMessage(request, msg);
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
          console.debug("worlds", worlds);
        }
      }
    });
  }
}
export function SetCityEntityDefs(defs) {
  CityEntityDefs = defs;
}
export function clearStartup() {
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
  friendsDiv.innerHTML = "";
  gvg.innerHTML = ``;
  gvg.className = "";
  armyDIV.innerHTML = ``;
  treasury.innerHTML = "";
  treasuryLog.innerHTML = "";
  if (gvgSummary) gvgSummary.innerHTML = "";
  if (gvgAges) gvgAges.innerHTML = "";
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

export function clearCultural() {
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
  friendsDiv.innerHTML = "";
  gvg.innerHTML = ``;
  gvg.className = "";
  armyDIV.innerHTML = ``;
  treasury.innerHTML = "";
  treasuryLog.innerHTML = "";
  if (gvgSummary) gvgSummary.innerHTML = "";
  if (gvgAges) gvgAges.innerHTML = "";
}

async function processParsedMessage(request, msg) {
  console.debug(
    "msg",
    msg,
    "requestClass",
    msg.requestClass,
    "requestMethod",
    msg.requestMethod,
    "__class__",
    msg.__class__
  );
  var contentType = "";
  var contentHeader = "";
  // check if this is static data service info that holds all URLs to all metadata files
  if (msg.requestClass === "StaticDataService" && msg.requestMethod == "getMetadata") {
    // find an URL that has city entities
    const cityEntitiesURL = msg.responseData.find((item) => item.identifier === "city_entities").url;
    // fetch it via ajax
    let response = await fetch(cityEntitiesURL);
    // parse response to JSON
    const cityEntitiesJSON = await response.json();

    // run the code that prefills city entities ( copied from somewhere bellow )
    cityEntitiesJSON.forEach(function (msg) {
      if (msg.__class__ && msg.__class__.substring(0, 10) == "CityEntity") {
        if (!CityEntityDefs[msg.id]) {
          CityEntityDefs[msg.id] = {
            name: msg.name,
            abilities: [],
            entity_levels: [],
            available_products: [],
          };
        }
        // console.debug(msg.name,msg);
        CityEntityDefs[msg.id] = msg;
      } else if (msg.__class__ && msg.__class__ == "GenericCityEntity") {
        if (!CityEntityDefs[msg.id]) {
          CityEntityDefs[msg.id] = {
            name: msg.name,
            abilities: [],
            entity_levels: [],
            available_products: [],
          };
        }
        // console.debug(msg.name,msg);
        CityEntityDefs[msg.id] = msg;
      }
    });
  } else if (msg.requestClass == "CampaignService" && msg.requestMethod == "getDeposits") {
    /*CampaignService*/
  } else if (msg.requestClass == "ConversationService") {
    if (msg.requestMethod == "getCategory") {
      /*ConversationService */
      conversationService(msg);
    } else if (msg.requestMethod == "getOverviewForCategory") {
      /*ConversationService */
      conversationService(msg);
    } else if (msg.requestMethod == "getConversation") {
      /*ConversationService */
      getConversation(msg);
    }
  } else if (msg.requestClass == "OtherPlayerService") {
    if (msg.requestMethod == "getOtherPlayerCityMapEntity") {
      /*PlayerID*/
      if (PlayerID != msg.responseData.player_id) PlayerName = "";
      PlayerID = msg.responseData.player_id;
    } else if (msg.requestMethod == "getSocialList") {
      /*PlayerID*/
      otherPlayerServiceUpdateActions(msg.responseData);
    } else if (msg.requestMethod == "visitPlayer") {
      if (showOptions.showVisit) {
        clearVisitPlayer();
        otherPlayerService(msg);
      }
    } else if (msg.requestMethod == "rewardPlunder") {
      //console.debug('cityentity_id:', msg.responseData.cityentity_id);
      const rewards = msg.responseData[0].product.resources;
      Object.keys(rewards).forEach((reward) => {
        console.debug(reward);
        var name = helper.fResourceShortName(reward);
        var qty = rewards[reward];

        if (!rewardsOtherPlayer[name]) rewardsOtherPlayer[name] = 0;
        rewardsOtherPlayer[name] += qty;
        console.debug(reward);
      });

      var reward = [];
      reward.source = "otherPlayer";
      reward.name = "";
      reward.amount = 0;

      if (showOptions.showGErewards) {
        showReward(reward);
      }
    } else if (msg.requestMethod == "rewardResources") {
      /*rewardPlunder */
      const rewards = msg.responseData.resources;

      Object.keys(rewards).forEach((reward) => {
        // console.debug(reward);
        var name = helper.fResourceShortName(reward);
        var qty = rewards[reward];

        if (!rewardsOtherPlayer[name]) rewardsOtherPlayer[name] = 0;
        rewardsOtherPlayer[name] += qty;
        // console.debug(reward);
      });

      var reward = [];
      reward.source = "otherPlayer";
      reward.name = "";
      reward.amount = 0;

      if (showOptions.showGErewards) {
        showReward(reward);
      }

      /*openChest */
    } else if (msg.requestMethod == "getCityProtections") {
      /*City Protections*/
      // console.debug('msg:', msg);
      if (msg.responseData) CityProtections = msg.responseData;
    }
  } else if (msg.requestClass == "InventoryService") {
    if (msg.requestMethod == "getGreatBuildings") {
      /*InventoryService*/
      // console.debug(msg.responseData);
    } else if (msg.requestMethod == "getItems") {
      /*InventoryService*/
      // 	console.debug("InventoryService",msg.responseData);
      // console.debug(Object.keys(CityEntityDefs));
      storage.set("CityEntityDefs", CityEntityDefs);
      var forgePoints = 0;
      if (msg.responseData.length) {
        for (var j = 0; j < msg.responseData.length; j++) {
          if (msg.responseData[j].name == "10 Forge Points") forgePoints += msg.responseData[j].inStock * 10;
          else if (msg.responseData[j].name == "5 Forge Points") forgePoints += msg.responseData[j].inStock * 5;
          else if (msg.responseData[j].name == "2 Forge Points") forgePoints += msg.responseData[j].inStock * 2;
        }
        availablePacksFP = forgePoints;
        if (document.getElementById("availableFPID"))
          document.getElementById("availableFPID").textContent = availablePacksFP + availableFP;
      }
    }
  } else if (msg.requestClass == "ArmyUnitManagementService" && msg.requestMethod == "getArmyInfo") {
    /*ArmyUnitManagementService*/
    // console.debug(msg,msg.responseData.counts,MilitaryDefs);
    armyUnitManagementService(msg);
  } else if (msg.requestClass == "FriendsTavernService" && msg.requestMethod == "getSittingPlayersCount") {
    /*FriendsTavernService*/
    // if(msg.responseData)
    // MyInfo.id = msg.responseData[0];
    // console.debug('FriendsTavernService',MyInfo.id);
  } else if (msg.requestClass == "IgnorePlayerService" && msg.requestMethod == "getIgnoreList") {
    /*IgnorePlayerService*/
    clearStartup();
    clearBattleground();
    if (msg.responseData) {
      console.debug("Ignored By:", msg.responseData.ignoredByPlayerIds);
      console.debug("Ignoring:", msg.responseData.ignoredPlayerIds);
      ignoredPlayers.ignoredByPlayerIds = msg.responseData.ignoredByPlayerIds;
      ignoredPlayers.ignoredPlayerIds = msg.responseData.ignoredPlayerIds;
      console.debug("Ignores:", ignoredPlayers);
    }
    // console.debug('Ignored :',msg.responseData);
  } else if (msg.requestClass == "TimeService" && msg.requestMethod == "updateTime") {
    /*Time Service */
    if (msg.responseData) {
      EpocTime = msg.responseData.time;
      // console.debug(EpocTime,msg.responseData);
    }
  } else if (msg.requestClass == "AnnouncementsService" && msg.requestMethod == "fetchAllAnnouncements") {
    clearForMainCity();
    helper.fShowIncidents();
  } else if (msg.requestClass == "TimerService" && msg.requestMethod == "getTimers") {
    //clearForBattleground();
  } else if (msg.requestClass == "ResourceService") {
    if (msg.requestMethod == "getResourceDefinitions") {
      /*Resource Service */
      getResourceDefinitions(msg);
    } else if (msg.requestMethod == "getPlayerResources") {
      /*Resource Service */
      getPlayerResources(msg);
    }
  } else if (msg.requestClass == "CityMapService") {
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
    } else if (msg.requestMethod == "updateEntity") {
      /*GB Info */
      // console.debug('msg:', msg);
      var outputHTML = "";
      //output.innerHTML = "";
      //overview.innerHTML = "";
      // if (debugEnabled == true)
      // 	console.debug(contentType,msg.requestClass,msg.requestMethod);
      if (msg.responseData.length) {
        console.debug("msg:", msg.responseData);
        // console.debug(collapseOptions);
        console.debug(GBselected);
        var levelText = "";
        for (var j = 0; j < msg.responseData.length; j++) {
          const selected = msg.responseData[j];
          if (selected.type == "greatbuilding") {
            if (selected.player_id == MyInfo.id) {
              // PlayerName = MyInfo.name;
              // PlayerID = MyInfo.id;
              setPlayerName(MyInfo.name, MyInfo.id);
            }

            GBselected.player = selected.player_id;
            GBselected.id = selected.id;
            GBselected.name = helper.fGBname(selected.cityentity_id);
            // console.debug(GBselected.name,CityEntityDefs[selected.cityentity_id],selected);
            var era = selected.cityentity_id.split("_", 2);
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
            if (selected.state.invested_forge_points) GBselected.current = selected.state.invested_forge_points;
            else GBselected.current = 0;
            levelText += `<table>`;
            levelText += `<tr><td colspan="2">Level ${GBselected.level} (Max ${
              GBselected.max_level
            })</td></tr><tr><td>${GBselected.current} of ${
              GBselected.total
            } FP <span data-i18n="total">total</span></td><td><span data-i18n="remaining">remaining</span>: ${
              GBselected.total - GBselected.current
            }FP</td></tr>`;
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
        outputHTML = `<div class="alert alert-dark alert-dismissible show collapsed" href="#infoText" aria-expanded="true" aria-controls="infoText" data-bs-toggle="collapse" role="alert">${element.close()}<p id="infoTextLabel"><strong><span data-i18n="gb">GB</span> <span data-i18n="info">Info</span>:</strong> ${PlayerName} | ${
          GBselected.name
        } [${GBselected.level}/${GBselected.max_level}]</p>`;
        outputHTML += `<div id="infoText" class="alert-dark collapse ${collapse.collapseGBInfo ? "" : "show"}">`;
      }
      console.debug(GBselected);
      // console.debug('showGBInfo',showGBInfo,outputHTML);
      if (showOptions.showGBInfo && levelText) {
        info.innerHTML = outputHTML + levelText;
        document.getElementById("infoTextLabel").addEventListener("click", collapse.fCollapseGBInfo);
        $("body").i18n();
      }

      /*City Stats */
    }
  } else if (msg.requestClass == "StartupService" && msg.requestMethod == "getData") {
    console.debug("request", request);
    contentType = request.request.headers.find((header) => header.name === ":authority");
    if (contentType) GameOrigin = contentType.value.split(".")[0];
    console.debug("GameOrigin:", GameOrigin);

    browser.storage.local.getBytesInUse(null).then((size) => {
      console.debug("getBytesInUse", size);
    });

    // browser.storage.local.get(['showOptions','collapseOptions','CityEntityDefs','ResourceDefs','tool','targets','toolOptions','donationPercent','url',GameOrigin + 'MyInfo'],
    browser.storage.local.get(null).then((result) => {
      // post.log('result', result);
      // console.debug('result', result);
      // console.debug('showIncidents', showIncidents);
      if (result[GameOrigin + "MyInfo"]) MyInfo.guildPosition = result[GameOrigin + "MyInfo"].guildPosition;
      else MyInfo.guildPosition = 0;
      // console.debug('result', result[GameOrigin + 'MyInfo'],MyInfo.guildPosition,GameOrigin + 'MyInfo');
      receiveStorage(result);
    });

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
  } else if (msg.requestClass == "RankingService" && msg.requestMethod == "searchRanking") {
    // console.debug('msg:', msg);
    if (msg.responseData.rankings.length && msg.responseData.category != "clan_battle_clan_global") {
      for (var j = 0; j < msg.responseData.rankings.length; j++) {
        if (msg.responseData.rankings[j].player.hasOwnProperty("is_self")) {
          if (
            MyInfo.name != msg.responseData.rankings[j].player.name ||
            MyInfo.id != msg.responseData.rankings[j].player.player_id
          ) {
            MyInfo.name = msg.responseData.rankings[j].player.name;
            MyInfo.id = msg.responseData.rankings[j].player.player_id;
            MyInfo.guild = msg.responseData.rankings[j].clan.name;
            console.debug("user :", MyInfo);
            if (showOptions.showStats)
              citystats.innerHTML = `<div class="alert alert-warning"><strong>${MyInfo.name}</strong></div>`;
          }
        }
      }
    }

    /*OtherPlayer Info/Stats */
  } else if (msg.requestClass == "HiddenRewardService" && msg.requestMethod == "getOverview") {
    /*Incidents */
    if (msg.responseData.hiddenRewards.length) hiddenRewards = msg.responseData.hiddenRewards;
    else {
      // console.debug('msg:', msg);
      hiddenRewards = [];
    }
    // console.debug('hiddenRewards:', hiddenRewards);
    helper.fShowIncidents();
  } else if (msg.requestClass == "EmissaryService" && msg.requestMethod == "getAssigned") {
    /*Emissary*/
    emissaryService(msg);

    /*Cultural*/
  } else if (msg.requestClass == "AdvancementService" && msg.requestMethod == "getAll") {
    // console.debug('msg:', msg);
    clearCultural();
    let culturalGoods = [];
    msg.responseData.forEach((resource) => {
      // console.debug(resource.name,resource,good,goodsList[good]);
      const rss = resource.requirements.resources;

      if (resource.isUnlocked != true) {
        Object.keys(rss).forEach((entry) => {
          // Goods[entry] = entry;
          // console.debug(entry,rss[`${entry}`]);
          if (culturalGoods[`${entry}`]) culturalGoods[`${entry}`] += rss[`${entry}`];
          else culturalGoods[`${entry}`] = rss[`${entry}`];
        });
      }
    });

    var culturalHTML = `<div  role="alert">
								${element.close()}
								<p id="culturalTextLabel" href="#culturalText" data-bs-toggle="collapse">
								${element.icon("culturalicon", "culturalText", collapse.collapseCultural)}
								<strong><span data-i18n="cultural">Cultural Settlement</span></strong></p>`;

    culturalHTML += '<div id="culturalText" class="collapse show"><span data-i18n="needed">Goods Needed</span>:<br>';
    // else
    // visitstatsHTML = `<div class="alert alert-warning"><p><strong>${MyInfo.name}</strong> ${MyInfo.id}<br>`;
    Object.keys(culturalGoods).forEach((entry) => {
      var needed = culturalGoods[`${entry}`];
      if (Resources[`${entry}`]) needed -= Resources[`${entry}`];
      // setResources(entry);
      // console.debug(`${entry}`,needed);
      if (entry != "diplomacy" && needed > 0) culturalHTML += `${needed}` + ` ${helper.fResourceShortName(entry)}<br>`;
    });

    if (showOptions.showSettlement) {
      if (document.getElementById("cultural") == null) {
        cultural = document.createElement("div");
        document.getElementById("content").appendChild(cultural);
        cultural.id = "cultural";
      }
      cultural.innerHTML = culturalHTML + `</div></div>`;
      cultural.className = "alert alert-info alert-dismissible show collapsed";
      document.getElementById("culturalicon").addEventListener("click", collapse.fCollapseCultural);
      document.getElementById("culturalTextLabel").addEventListener("click", collapse.fCollapseCultural);
    }

    /*Limited Bonuses */
  } else if (msg.requestClass == "BonusService") {
    if (msg.requestMethod == "getLimitedBonuses") {
      // console.debug('msg:', msg);
      getLimitedBonuses(msg);

      /*daily FP */
    } else if (msg.requestMethod == "getBonuses") {
      // console.debug('msg:', msg);
      getBonuses(msg);
      if (document.getElementById("targetsGBG")) {
        document.getElementById("targetsGBG").innerHTML = "";
      }

      /*boosts - overview */
    }
  } else if (msg.requestClass == "BoostService") {
    if (msg.requestMethod == "getOverview") {
      // console.debug('msg:', msg);
      boostService(msg);

      /*all boosts */
    } else if (msg.requestMethod == "getAllBoosts") {
      boostServiceAllBoosts(msg);

      /*rewardPlunder */
    } else if (msg.requestMethod == "getTimerBoost") {
      // TODO
      // add getTimerBoost att/def to A/D info
    }
  } else if (msg.requestClass == "RewardService") {
    /*collectReward */
    //console.debug('cityentity_id:', msg.responseData.cityentity_id);
    if (msg.requestMethod == "collectReward") {
      /**/
      if (msg.responseData.length) {
        var reward = msg.responseData[0][0];
        reward.source = msg.responseData[1];
        console.debug(msg.responseData[1], reward);
        if (showOptions.showGBGrewards) {
          showReward(reward);
        }
      }
    } else if (msg.requestMethod == "collectRewardSet") {
      /**/
      if (msg.responseData.hasOwnProperty("reward") && msg.responseData.reward.rewards.length) {
        var rewards = msg.responseData.reward.rewards;
        rewards.source = msg.responseData.context;
        console.debug(rewards);
        if (showOptions.showRewards) {
          showRewards(rewards);
        }
      }
    } else if (msg.requestMethod == "") {
      /**/
    } else console.debug("RewardService", msg);
  } else if (msg.requestClass == "CityProductionService" && msg.requestMethod == "pickupProduction") {
    /*pickupProduction */
    //console.debug('cityentity_id:', msg.responseData.cityentity_id);
    pickupProduction(msg);
  } else if (msg.requestClass == "BlueprintService" && msg.requestMethod == "newReward") {
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
        oldText.innerHTML =
          `${msg.responseData.building_owner.name} ${helper.fGBsname(GBname)} ${msg.responseData.level} - ${
            msg.responseData.strategy_point_amount
          }FP<br>` + oldText.innerHTML;
      } else {
        cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel" href="#rewardsText" data-bs-toggle="collapse">
	  ${element.icon("rewardsicon", "rewardsText", collapse.collapseRewards)}
	  <span data-i18n="reward"><strong>REWARDS:</strong></span></p>
										${element.close()}
										<div id="rewardsText" class="overflow resize collapse ${
                      collapse.collapseRewards ? "" : "show"
                    }"><p class="overflow" id="rewardsText">${msg.responseData.building_owner.name} ${helper.fGBsname(
          GBname
        )} ${msg.responseData.level} - ${msg.responseData.strategy_point_amount}FP</p></div></div>`;

        // cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show" role="alert">${element.close()}<strong><span data-i18n="gb">GB</span> REWARDS:</strong>
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
    // 		showReward(reward);
    // 	}
    // }
  } else if (msg.requestClass == "GreatBuildingsService") {
    /*GB Donors */
    if (msg.requestMethod == "getConstructionRanking") {
      // console.debug('msg:', msg);
      getConstructionRanking(msg, JSON.parse(request.request.postData.text));
    } else if (msg.requestMethod == "getConstruction") {
      // console.debug('msg:', msg);
      getConstruction(msg);

      /* GB Add FP*/
    } else if (msg.requestMethod == "contributeForgePoints") {
      console.debug("msg:", msg);
      contributeForgePoints(msg.responseData);

      /*Invested */
    } else if (msg.requestMethod == "getContributions") {
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
            console.debug("invested: ", numGB, msg.responseData[j].forge_points, invested, reward);
          }
        }
        const rewardBonus = BigNumber(City.ArcBonus).div(100).plus(1).times(reward).dp(0);
        console.debug(
          BigNumber(City.ArcBonus),
          BigNumber(City.ArcBonus).div(100),
          BigNumber(City.ArcBonus).div(100).plus(1),
          BigNumber(City.ArcBonus).div(100).plus(1).times(reward)
        );
        console.debug(availablePacksFP, availableFP, reward, invested, rewardBonus);
        cityinvestedHTML = `<div id="investedDiv" class="alert alert-success alert-dismissible collapsed" role="alert">`;
        cityinvestedHTML += element.close();
        cityinvestedHTML += `<p id="investedTextLabel" href="#investedText" aria-expanded="true" aria-controls="investedText" data-bs-toggle="collapse">`;
        cityinvestedHTML += element.icon("investedicon", "investedText", collapse.collapseInvested);
        cityinvestedHTML += `<strong>FP Status: </strong><span id="onHandFP">${
          collapse.collapseInvested ? availablePacksFP + availableFP : ""
        }</span></p>`;
        cityinvestedHTML += element.copy("investedCopyID", "success", "right", collapse.collapseInvested);
        cityinvestedHTML += `<div id="investedText" class="collapse ${collapse.collapseInvested ? "" : "show"}">`;
        cityinvestedHTML += `On Hand FP: <span id="onHandFP2">${availablePacksFP + availableFP}</span><br>`;
        cityinvestedHTML += `FP Invested: ${invested} (${numGB} GB)<br>`;
        if (City.ArcBonus > 90)
          cityinvestedHTML += `<span data-i18n="gb">GB</span> <span data-i18n="reward">Rewards:</span>: ${rewardBonus} (+${City.ArcBonus}%)`;
        else
          cityinvestedHTML += `<span data-i18n="gb">GB</span> <span data-i18n="reward">Rewards:</span>: ${rewardBonus}`;
        cityinvestedHTML += `<br>Total FP: ${availablePacksFP + availableFP + Number(rewardBonus)}</p>`;

        cityinvested.innerHTML = cityinvestedHTML + `</div></div>`;
        document.getElementById("investedTextLabel").addEventListener("click", collapse.fCollapseInvested);
        document.getElementById("investedCopyID").addEventListener("click", copy.fInvestedCopy);
        $("#investedDiv").i18n();
      }

      /* GvG Info*/
    } else if (msg.requestMethod == "getOtherPlayerOverview") {
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
    } else if (msg.requestMethod == "getAvailablePackageForgePoints") {
      /*ForgePoints*/
      availablePacksFP = msg.responseData[0];
      if (document.getElementById("availableFPID"))
        document.getElementById("availableFPID").textContent = availablePacksFP + availableFP;
    }
  } else if (msg.requestClass == "ClanBattleService") {
    if (msg.requestMethod == "getContinent") {
      fCleardForGVG();
      getContinent(msg);
    } else if (msg.requestMethod == "getProvinceDetailed") {
      /* GvG Ages*/
      getProvinceDetailed(msg);
    } else if (msg.requestMethod == "deploySiegeArmy") {
      /* GvG Siege*/
      deploySiegeArmy(msg);
    } else if (msg.requestMethod == "grantIndependence") {
      /* GvG grant freedom to sector*/
      grantIndependence(msg);
    }
  } else if (msg.requestClass == "GuildExpeditionService") {
    if (msg.requestMethod == "getOverview") {
      /*Guild Expedition*/
      clearExpedition();
    } else if (msg.requestMethod == "getContributionList") {
      /*Guild Expedition*/
      if (showOptions.showExpedition) guildExpeditionService(msg);
    } else if (msg.requestMethod == "openChest") {
      //console.debug('cityentity_id:', msg.responseData.cityentity_id);
      // var units = {};
      // var numUnits = 0;
      var reward = msg.responseData;
      reward.source = "guildExpedition";
      var name = helper.fRewardShortName(reward.name);
      var qty = reward.amount;

      if (!rewardsGE[name]) rewardsGE[name] = 0;
      rewardsGE[name] += qty;
      console.debug(reward);
      if (showOptions.showGErewards) {
        showReward(reward);
      }
      console.debug("rewardsGE:", rewardsGE, reward);
    }
  } else if (msg.requestClass == "GuildBattlegroundService") {
    // GuildBattleground
    if (msg.requestMethod == "getLeaderboard") {
      /*getLeaderboard */
      if (showOptions.showLeaderboard) getLeaderboard(msg);
    } else if (msg.requestMethod == "getPlayerLeaderboard") {
      /*Guild Battleground*/
      getPlayerLeaderboard(msg);
    } else if (msg.requestMethod == "getBattleground") {
      /*Guild Battleground*/
      clearForBattleground();
      getBattleground(msg);
    } else if (msg.requestMethod == "getState") {
      if (msg.responseData.stateId == "participating") {
        //clearForBattleground();
      }
    } else console.debug("GuildBattlegroundService", msg);
  } else if (msg.requestClass == "GuildBattlegroundStateService") {
    // GuildBattleground
    if (msg.requestMethod == "getState" && msg.responseData.stateId == "participating") {
      //clearForBattleground();
    } else if (msg.requestMethod == "getState" && showOptions.showBattleground) {
      getState(msg);
    } else console.debug("GuildBattlegroundStateService", msg);
  } else if (msg.requestClass == "GuildBattlegroundBuildingService") {
    // GuildBattleground
    if (msg.requestMethod == "getBuildings") {
      /*Guild Battleground*/
      getBuildings(msg);
    } else console.debug("GuildBattlegroundBuildingService", msg);
  } else if (msg.requestClass == "GuildBattlegroundSignalsService") {
    // GuildBattleground
    const payload = JSON.parse(request.request.postData.text)[0].requestData;
    // console.debug("GuildBattlegroundSignalsService", msg,payload);
    if (msg.requestMethod == "setSignal") {
      /*Guild Battleground*/
      //console.debug("set msg.requestMethod", msg.requestMethod);
      setSignal(msg, payload);
    } else if (msg.requestMethod == "removeSignal") {
      /*Guild Battleground*/
      //console.debug("remove msg.requestMethod", msg.requestMethod);
      removeSignal(msg, payload);
    } else console.debug("GuildBattlegroundSignalsService", msg);
    // console.debug("GuildBattlegroundSignalsService", msg,JSON.parse(request.request.postData.text));
  } else if (msg.__class__ && msg.__class__.substring(0, 17) == "GuildBattleground") {
    if (msg.__class__ && msg.__class__ == "GuildBattlegroundMapMetadata") {
      if (msg.id == "volcano_archipelago") {
        VolcanoProvinceDefs = msg.provinces;
        VolcanoProvinceDefs[0].id = 0;
      } else if (msg.id == "waterfall_archipelago") {
        WaterfallProvinceDefs = msg.provinces;
        WaterfallProvinceDefs[0].id = 0;
      } else console.debug(msg);
    } else if (msg.__class__ && msg.__class__ == "GuildBattlegroundLeagueMetadata") {
      // console.debug('GuildBattlegroundLeagueMetadata',msg);
    } else if (msg.__class__ && msg.__class__ == "GuildBattlegroundBuildingMetadata") {
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
    } else console.debug("GuildBattleground", msg);
  } else if (msg.requestClass == "ClanService") {
    if (msg.requestMethod == "getOwnClanData" || msg.requestMethod == "getClanData") {
      /*Guild Members*/
      // console.debug(showOptions, msg.responseData.members);
      if (showOptions.showTreasury && msg.requestMethod == "getOwnClanData") {
        const members = msg.responseData.members;
        GuildDonations.push([msg.responseData.name, msg.responseData.membersNum]);
        // console.debug(members);
        members.forEach((entry) => {
          GuildDonations.push([
            entry.rank,
            entry.name,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
          ]);
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
        $("body").i18n();
      }

      if (showOptions.showGuild && msg.responseData.members) {
        var guildlist = msg.responseData.members;
        // console.debug('guildlist',guildlist);
        // if(title){
        var friendsHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert"><p id="friendsTextLabel" href="#friendsText" data-bs-toggle="collapse">
		${element.icon("friendsicon", "friendsText", collapse.collapseFriends)}<strong>Guild Members</strong></p>
		${element.close()}<div id="friendsCopy">
		${element.copy("friendsCopyID", "success", "right", collapse.collapseFriends)}</div>`;
        friendsHTML += `<div id="friendsText" class="overflow-y collapse ${collapse.collapseFriends ? "" : "show"}">
	  <table id="friendsText2"><tr><th>Name</th><th>Title</th><th>ID</th><th>Era</th><th>Battles</th><th>Score</th></tr>`;
        guildlist.forEach((entry) => {
          friendsHTML += `<tr><td>${entry.name}</td><td>${entry.title}</td><td>${
            entry.player_id
          }</td><td>${helper.fGVGagesname(entry.era)}</td><td>${entry.won_battles}</td><td>${entry.score}</td></tr>`;
        });
        // var friends = document.getElementById("friends");
        friendsDiv.innerHTML = friendsHTML + `</table></div></div>`;
        if (collapse.collapseFriends == false) {
          document.getElementById("friendsCopyID").addEventListener("click", copy.fFriendsCopy);
        }
        document.getElementById("friendsTextLabel").addEventListener("click", collapse.fCollapseFriends);
        // }
        $("body").i18n();
      }
    } else if (msg.requestMethod == "getTreasuryLogs") {
      /*Treasury Logs*/
      // var users.checkNull = null;
      if (showOptions.showContributions || showOptions.showLogs) {
        // if(users.checkNull) {
        if (showOptions.showLogs) {
          var treasuryHTML = treasuryLog.innerHTML;
          // console.debug('msg:', msg);
          // console.debug('treasury',msg);
          if (!treasuryHTML) {
            treasuryHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
							${element.close()}
							<p href="#treasuryLogText" aria-expanded="true" aria-controls="treasuryLogText" data-bs-toggle="collapse">
              ${element.icon("treasuryLogicon", "treasuryLogText", collapse.collapseTreasuryLog)}
                    <strong>Treasury Logs:</strong></p>`;
            treasuryHTML += `<table id="treasuryLogText" class="overflow collapse show">`;
          } else {
            treasuryHTML = treasuryHTML.substring(0, treasuryHTML.length - 8);
          }
        }
        // console.debug(msg.responseData);
        const logs = msg.responseData.logs;
        // console.debug(logs);
        logs.forEach((entry) => {
          if (entry.resource == "medals") {
            GuildDonations.forEach((member) => {
              // rank,name,spent,returned,donated
              if (member[1] == entry.player.name) {
                if (entry.action.toLowerCase() == "guild continent: slot unlocked") member[2] += entry.amount;
                else if (entry.action.toLowerCase() == "siege army deployment") member[2] += entry.amount;
                else if (entry.action.toLowerCase() == "guild continent: grant freedom") member[3] += entry.amount;
                else if (entry.action.toLowerCase() == "donation") member[4] += entry.amount;
              }
              // console.debug(entry.action,entry.amount);
            });
          } else {
            GuildDonations.forEach((member) => {
              // spent,returned,donated
              if (member[1] == entry.player.name) {
                if (
                  entry.action.toLowerCase() == "siege army deployment" ||
                  entry.action.toLowerCase() == "guild continent: slot unlocked"
                )
                  member[5] += entry.amount;
                else if (entry.action.toLowerCase() == "guild continent: grant freedom") member[6] += entry.amount;
                else if (entry.action.toLowerCase() == "battlegrounds: place building") member[7] += entry.amount;
                else if (entry.action.toLowerCase() == "guild expedition: difficulty unlocked")
                  member[8] += entry.amount;
                // else if(entry.action == 'Great building production')
                // 	member[9] += entry.amount;
                else if (entry.action.toLowerCase() == "building production") member[9] += entry.amount;
                else if (entry.action.toLowerCase() == "guild treasury donation") {
                  // if(entry.amount > 80)
                  member[11] += entry.amount; // manual donation

                  // else
                  // member[10] += entry.amount; // assume SoH
                } else {
                  console.debug(entry.action, entry.amount);
                }

                // if(entry.action == 'Great building production' || entry.action == 'Guild treasury donation'){
                if (entry.action.toLowerCase() == "guild treasury donation") {
                  // console.debug(ResourceDefs.find(entry.id));
                  ResourceDefs.forEach((rssDef) => {
                    // console.debug(entry, rssDef.era);
                    if (rssDef.id == entry.resource) {
                      // rssName = rssDef.name;
                      // rssEra = rssDef.era;
                      member[31 - helper.fLevelfromAge(rssDef.era)] += entry.amount;
                      // console.debug(entry.action,entry.resource, entry.amount,rssDef.era,helper.fLevelfromAge(rssDef.era),(30 - helper.fLevelfromAge(rssDef.era)),member[(30 - helper.fLevelfromAge(rssDef.era))]);
                    }
                  });
                }
              }
              // console.debug(entry.action,entry.amount);
            });

            GuildTreasury.forEach((rss) => {
              if (entry.resource == rss[0]) {
                // ID, era name, rss name, treasury qty, donation, GE spend, GVG spend, GBG spend, net change
                if (
                  entry.action.toLowerCase() == "siege army deployment" ||
                  entry.action.toLowerCase() == "guild continent: slot unlocked" ||
                  entry.action.toLowerCase() == "guild continent: grant freedom"
                ) {
                  rss[6] += entry.amount;
                  // rss[8] += entry.amount;
                } else if (entry.action.toLowerCase() == "battlegrounds: place building") {
                  rss[7] += entry.amount;
                  // rss[8] += entry.amount;
                } else if (entry.action.toLowerCase() == "guild expedition: difficulty unlocked") {
                  rss[5] += entry.amount;
                  // rss[8] += entry.amount;
                } else if (
                  entry.action.toLowerCase() == "building production" ||
                  entry.action.toLowerCase() == "guild treasury donation"
                ) {
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
            treasuryHTML += `<tr><td>${entry.player.name}</td><td>${helper.fResourceShortName(
              entry.resource
            )}</td><td>${entry.action}</td><td>${entry.amount}</td><td>${entry.createdAt}</td></tr>`;
        });
        if (showOptions.showLogs) treasuryLog.innerHTML = treasuryHTML + `</table>`;

        if (showOptions.showContributions) {
          treasuryHTML = `<div class="alert alert-success alert-dismissible show collapsed" data-bs-toggle="collapse" role="alert">`;
          treasuryHTML += element.close();
          treasuryHTML += element.copy("treasuryCopyID", "success", "right", collapse.collapseTreasury);
          treasuryHTML += `<p id="treasuryTextLabel" href="#treasuryText" data-bs-toggle="collapse">`;
          treasuryHTML += element.icon("treasuryicon", "treasuryText", collapse.collapseTreasury);
          treasuryHTML += `<strong>Treasury Contributions:</strong></p>`;
          treasuryHTML += `<div id="treasuryText" class="collapse ${collapse.collapseTreasury ? "" : "show"}">
			<table id="treasurytable" class="overflow table collapse show"><tr><th>Name</th><th>Medals Spent</th><th>Medals Returned</th><th>Medals Donated</th><th>Medals Total</th><th>Goods Spent GVG</th><th>Goods Returned GVG</th><th>Goods Spent GBG</th><th>Goods Spent GE</th><th>Goods Donated Building</th><th>Goods Donated ???</th><th>Goods Donated</th><th>SAV</th><th>SAAB</th><th>SAM</th><th>VF</th><th>OF</th><th>AF</th><th>FE</th><th>TE</th><th>CE</th><th>PME</th><th>ME</th><th>PE</th><th>InA</th><th>CA</th><th>LMA</th><th>HMA</th><th>EMA</th><th>IA</th></tr>`;
          GuildDonations.forEach((member) => {
            // rank,name,medals: spent,returned,donated, goods: spent,returned,donated
            if (member[0] != MyInfo.guild)
              treasuryHTML += `<tr><td>${member[1]}</td><td>${member[2]}</td><td>${member[3]}</td><td>${
                member[4]
              }</td><td>${member[2] + member[3] + member[4]}</td><td>${member[5]}</td><td>${member[6]}</td><td>${
                member[7]
              }</td><td>${member[8]}</td><td>${member[9]}</td><td>${member[10]}</td><td>${member[11]}</td><td>${
                member[12]
              }</td><td>${member[13]}</td><td>${member[14]}</td><td>${member[15]}</td><td>${member[16]}</td><td>${
                member[17]
              }</td><td>${member[18]}</td><td>${member[19]}</td><td>${member[20]}</td><td>${member[21]}</td><td>${
                member[22]
              }</td><td>${member[23]}</td><td>${member[24]}</td><td>${member[25]}</td><td>${member[26]}</td><td>${
                member[27]
              }</td><td>${member[28]}</td><td>${member[29]}</td></tr>`;
          });

          if (GuildTreasury) {
            treasuryHTML += `<tr></tr>`;
            treasuryHTML += `<tr><th>Era:Resource</th><th>Treasury</th><th>Donations</th><th>GE Cost</th><th>GVG Cost</th><th>GBG Cost</th><th>Net Change</th></tr>`;
            GuildTreasury.forEach((rss) => {
              treasuryHTML += `<tr><td>${rss[1]}:${rss[2]}</td><td>${rss[3]}</td><td>${rss[4]}</td><td>${rss[5]}</td><td>${rss[6]}</td><td>${rss[7]}</td><td>${rss[8]}</td></tr>`;
            });
          }

          treasury.innerHTML = treasuryHTML + `</table></div>`;
          document.getElementById("treasuryCopyID").addEventListener("click", copy.TreasuryCopy);
          document.getElementById("treasuryTextLabel").addEventListener("click", collapse.fCollapseTreasury);
        }
        // console.debug(GuildDonations);
        $("body").i18n();
      } else {
        console.debug(msg.responseData.length);
      }
    } else if (msg.requestMethod == "getTreasury") {
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
      friendsDiv.innerHTML = "";
      gvg.innerHTML = ``;
      gvg.className = "";
      // armyDIV.innerHTML = ``;
      if (gvgSummary) gvgSummary.innerHTML = "";
      if (gvgAges) gvgAges.innerHTML = "";

      if (showOptions.showTreasury) {
        // var treasuryHTML = guild.innerHTML;
        var treasuryHTML = "";

        // if (!treasuryHTML){
        treasuryHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
	${element.close()}<p id="treasuryTextLabel" href="#treasuryText" data-bs-toggle="collapse">`;
        treasuryHTML += element.icon("treasuryicon", "treasuryText", collapse.collapseTreasury);
        treasuryHTML += `<strong>Guild Treasury:</strong></p>`;
        treasuryHTML += element.copy("treasuryCopyID", "success", "right", collapse.collapseTreasury);
        treasuryHTML += `<div id="treasuryText" style="height: ${
          toolOptions.treasurySize
        }px" class="overflow collapse ${collapse.collapseTreasury ? "" : "show"}"><table id="treasurytable">`;

        // }
        // else{
        // treasuryHTML = treasuryHTML.substring(0, treasuryHTML.length - 8);
        // }
        const resources = msg.responseData.resources;
        // GuildTreasury = msg.responseData.resources;
        initTreasury(msg.responseData.resources);

        for (var i = 0; i < helper.numAges; i++) {
          ResourceDefs.forEach((rssDef) => {
            if (rssDef.era == helper.fAgefromLevel(helper.numAges - i) && resources[rssDef.id]) {
              treasuryHTML += `<tr><td>${helper.fGVGagesname(rssDef.era)}:${rssDef.name}</td><td>${
                resources[rssDef.id]
              }</td></tr>`;
              // rssName = rssDef.name;
              // rssEra = rssDef.era;
            }
          });
        }
        treasuryHTML += `<tr><td>Medals</td><td>${resources["medals"]}</td></tr>`;

        treasury.innerHTML = treasuryHTML + `</table></div>`;
        // donationDIV.innerHTML = treasuryHTML + `</table></div>`;
        document.getElementById("treasuryCopyID").addEventListener("click", copy.TreasuryCopy);
        console.debug("GuildTreasury", GuildTreasury);
        document.getElementById("treasuryTextLabel").addEventListener("click", collapse.fCollapseTreasury);
        const treasuryDiv = document.getElementById("treasuryText");
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect && entry.contentRect.height) setTreasurySize(entry.contentRect.height);
          }
        });
        resizeObserver.observe(treasuryDiv);
        $("body").i18n();
      } else {
        console.debug(msg.responseData.length);
      }
    }
  } else if (msg.requestClass == "AutoAidService") {
    // Auto Aid
    console.debug("AutoAidService", msg);
    if (msg.requestMethod == "collect") {
      /**/
      console.debug("AutoAidService", msg.responseData.id, msg.responseData.totalPeers);
    } else if (msg.requestMethod == "") {
      /**/
    } else console.debug("AutoAidService", msg);
  } else {
    //output.innerHTML += `<div>*** ${msg.requestClass}</div>`;
    if (msg.requestClass == null) {
      if (msg.id == "W_MultiAge_WIN22A11b") {
        console.info(msg.name, msg);
      }
      if (
        msg.__class__ &&
        (msg.__class__ == "CityEntityCulturalGoodsBuilding" ||
          msg.__class__ == "CityEntityImpediment" ||
          msg.__class__ == "CityEntityDiplomacy" ||
          msg.__class__ == "CityEntityStaticProvider" ||
          msg.__class__ == "CityEntityStreet" ||
          msg.__class__ == "CityEntityHub" ||
          msg.__class__ == "CityEntityOutpostShip" ||
          msg.__class__ == "QuestTabMetadata" ||
          msg.__class__ == "ChainMetadata" ||
          msg.__class__ == "BuildingSetMetadata" ||
          msg.__class__ == "InfoScreen" ||
          msg.type == "off_grid")
      ) {
        // ignore these
        //   console.debug(msg.name, msg);
      } else if (msg.__class__ && msg.__class__.substring(0, 10) == "CityEntity") {
        if (!CityEntityDefs[msg.id]) {
          CityEntityDefs[msg.id] = {
            name: msg.name,
            abilities: [],
            entity_levels: [],
            available_products: [],
          };
        }
        // console.debug(msg.name,msg);
        CityEntityDefs[msg.id] = msg;
      } else if (msg.__class__ && msg.__class__ == "GenericCityEntity") {
        if (!CityEntityDefs[msg.id]) {
          CityEntityDefs[msg.id] = {
            name: msg.name,
            abilities: [],
            entity_levels: [],
            available_products: [],
          };
        }
        // console.debug(msg.name,msg);
        CityEntityDefs[msg.id] = msg;
      } else if (msg.__class__ && msg.__class__ == "UnitType") {
        // MilitaryDefs.push([msg.unitTypeId,msg.name,msg.minEra]);
        MilitaryDefs[msg.unitTypeId] = {
          name: msg.name,
          era: msg.minEra,
        };
      } else if (msg.__class__ && msg.__class__ == "CastleSystemLevelMetadata") {
        CastleDefs.push(msg);
        //   console.debug(`CastleSystemLevelMetadata`, msg, CastleDefs);
      } else if (msg.__class__ && msg.__class__ == "SelectionKitMetadata") {
        SelectionKitDefs.push(msg);
        // console.debug(`SelectionKitMetadata`, msg,SelectionKitDefs);
      } else if (msg.__class__ && msg.__class__ == "BoostMetadata") {
        BoostMetadataDefs.push(msg);
        // console.debug(`BoostMetadata`, msg,BoostMetadataDefs);
      } else if (msg.__class__ && msg.__class__.substring(0, 18) == "CityEntityCultural") {
        // console.debug(`CityEntityCultural`, msg.name,msg);
      } else if (msg.__class__ && msg.__class__ == "BuildingUpgrade") {
        // console.debug(`BuildingUpgrade`, msg.name,msg);
      } else if (msg.__class__ && msg.__class__ == "CityMapEntity") {
        //
        if (msg.id == "W_MultiAge_WIN22A11b") {
          console.info(msg.name, msg);
        }
      } else if (!msg.__class__) {
        // console.debug(`NO __class__`, msg.name,msg);
      } else console.debug(msg.name, msg);
    }

    // if(msg.__class__ && msg.__class__.substring(0,10) == 'CityEntity' && msg.type != 'military' && msg.type != 'off_grid'
  }
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
  storage.set(GameOrigin + "MyInfo", MyInfo);
}

export function setPlayerName(name, id) {
  PlayerName = name;
  PlayerID = id;
  GBselected.player_name = name;
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
  visitstats.className = "";
  cultural.innerHTML = ``;
  cultural.className = "";
  gvg.innerHTML = ``;
  gvg.className = "";
  // armyDIV.innerHTML = ``;
  treasury.innerHTML = "";
  treasuryLog.innerHTML = "";
  if (gvgSummary) gvgSummary.innerHTML = "";
  if (gvgAges) gvgAges.innerHTML = "";
}
