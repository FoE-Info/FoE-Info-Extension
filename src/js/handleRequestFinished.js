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
  getType,
  GameVersion,
  citystats,
  tool,
  CityEntityDefs,
  PlayerID,
  PlayerName,
  clearVisitPlayer,
  rewardsOtherPlayer,
  showReward,
  CityProtections,
  availablePacksFP,
  clearStartup,
  ignoredPlayers,
  EpocTime,
  clearForMainCity,
  MyInfo,
  GBselected,
  setPlayerName,
  info,
  GameOrigin,
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
  visitstats,
  cultural,
  hiddenRewards,
  clearCultural,
  showRewards,
  rewardObserve,
  fCleardForGVG,
  clearExpedition,
  rewardsGE,
  clearForBattleground,
  VolcanoProvinceDefs,
  WaterfallProvinceDefs,
  BuildingDefs,
  GuildDonations,
  setMyGuildPosition,
  friendsDiv,
  treasuryLog,
  GuildTreasury,
  treasury,
  alerts,
  donation2DIV,
  donationDIV2,
  debug,
  initTreasury,
  MilitaryDefs,
  CastleDefs,
  SelectionKitDefs,
  BoostMetadataDefs,
  debugEnabled,
  worlds,
} from "./index.js";

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
          processParsedMessage(parsed[i]);
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
