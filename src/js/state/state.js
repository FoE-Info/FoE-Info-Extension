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
import {
  isDebugEnabled,
  toggleDebug as loggerToggleDebug,
  onDebugToggle,
} from '../utils/logger.js';
import * as storage from '../utils/storage.js';
import { metadataStore } from './MetadataStore.js';

// Shared application state and definitions
export var debugEnabled = isDebugEnabled();
onDebugToggle((enabled) => {
  debugEnabled = enabled;
});
export var availablePacksFP = 0;
export function setAvailablePacksFP(val) {
  const num = Number(val);
  availablePacksFP = Number.isFinite(num) ? num : 0;
  return availablePacksFP;
}
export var PlayerName = '';
export var PlayerID = 0;
export var worlds = [];
export var language = 'en';

export var MyInfo = {
  name: '',
  era: '',
  id: 0,
  guild: '',
  guildID: 0,
  guildPosition: 0,
  createdAt: 0,
  score: 0,
};

export var MyGuildPermissions = {};

export var ignoredPlayers = {
  ignoredByPlayerIds: {},
  ignoredPlayerIds: {},
};

export var playerNameCache = {};

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

export var targetsTopic = 'targets';
export function setTargetsTopic(val) {
  targetsTopic = typeof val === 'string' ? val : 'targets';
}
export var targetText = '';
export function setTargetText(val) {
  targetText = typeof val === 'string' ? val : '';
}
export var CityEntityDefs = metadataStore.createLegacyCityEntityProxy();
export var MetaIds = {};
export var BuildingEntityLookup = {};
export var CityProtections = [];
export var MilitaryDefs = {};
export var CastleDefs = [];
export var SelectionKitDefs = [];
export var BoostMetadataDefs = [];
export var AllyDefs = {};
export var ResearchDefs = {};
export var VolcanoProvinceDefs = metadataStore.volcanoProvinces;
export var WaterfallProvinceDefs = metadataStore.waterfallProvinces;
export var BuildingDefs = metadataStore.buildingDefs;
export var metadataLoaded = false;
export var hiddenRewards = [];

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
export var GameOrigin = '';
export var donationPercent = 190;
export var donationSuffix = '';

export var Bonus = {
  aid: 0,
  spoils: 0,
  diplomatic: 0,
  strike: 0,
};

export var url = {};

export function setUrl(newUrl) {
  for (const k of Object.keys(url)) delete url[k];
  if (newUrl && typeof newUrl === 'object') {
    Object.assign(url, newUrl);
  }
}
export var rewardsArmy = [];
export var rewardsCity = [];
export var rewardsGE = {};
export var rewardsGBG = {};
export var rewardsGeneric = {};
export var rewardsOtherPlayer = {};

export function clearRewardsState() {
  for (const k of Object.keys(rewardsGE)) delete rewardsGE[k];
  for (const k of Object.keys(rewardsGBG)) delete rewardsGBG[k];
  for (const k of Object.keys(rewardsGeneric)) delete rewardsGeneric[k];
  for (const k of Object.keys(rewardsOtherPlayer)) delete rewardsOtherPlayer[k];
  rewardsArmy.length = 0;
  for (const k of Object.keys(rewardsCity)) delete rewardsCity[k];
}

// Centralized Guild Battleground Shared State
export var GBGdata = [];
export var BattlegroundPerformance = [];
export var BGtime = '';
export function setBGtime(val) {
  BGtime = val;
}
export var GuildMembers = [];

// Centralized Resource Shared State
export var ResourceDefs = [];
export var ResourceNames = [];

// DOM container elements (initialized at runtime by index.js or state accessor)
export var content =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var citystats =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var alerts =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var targets =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (targets && !targets.id) targets.id = 'targets';
export var bonusDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var incidents =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var cityinvested =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var galaxyDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var visitstats =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var cityrewards =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (cityrewards && !cityrewards.id) cityrewards.id = 'cityrewards';
export var output =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (output && !output.id) output.id = 'output';
export var donationDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (donationDIV && !donationDIV.id) donationDIV.id = 'donation';
export var battlegroundDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (battlegroundDIV && !battlegroundDIV.id) battlegroundDIV.id = 'battleground';
export var gbgLeaderboardDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (gbgLeaderboardDIV && !gbgLeaderboardDIV.id)
  gbgLeaderboardDIV.id = 'gbgLeaderboard';
export var donation2DIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (donation2DIV && !donation2DIV.id) donation2DIV.id = 'donation2';
export var donationDIV2 =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (donationDIV2 && !donationDIV2.id) donationDIV2.id = 'donationDIV2';
export var gbInfoDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (gbInfoDIV && !gbInfoDIV.id) gbInfoDIV.id = 'gbInfo';
export var greatbuilding =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var overview =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var cultural =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var info =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var armyDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var goodsDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var guild =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var friendsDiv =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var treasury =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var treasuryLog =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var clipboard =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var alerts_bottom =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var debug =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var modal =
  typeof document !== 'undefined' ? document.createElement('div') : null;

// State mutators and accessors
export function setHiddenRewards(rewards) {
  hiddenRewards.length = 0;
  if (Array.isArray(rewards)) {
    hiddenRewards.push(...rewards);
  }
}

export function setEpocTime(time) {
  const num = Number(time);
  if (!Number.isNaN(num)) {
    EpocTime = num;
  }
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

export function setMyScore(score) {
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
  if (name && id) {
    updatePlayerNameCache(id, name);
  }
}

export function getPlayerName(id) {
  return playerNameCache[id] || '';
}

export function setIgnoredPlayers(ignoredBy, ignoring) {
  if (ignoredBy) ignoredPlayers.ignoredByPlayerIds = ignoredBy;
  if (ignoring) ignoredPlayers.ignoredPlayerIds = ignoring;
  storage.set('ignoredPlayers', ignoredPlayers);
}

try {
  storage.get('ignoredPlayers', (err, data) => {
    if (data && typeof data === 'object') {
      if (data.ignoredByPlayerIds)
        ignoredPlayers.ignoredByPlayerIds = data.ignoredByPlayerIds;
      if (data.ignoredPlayerIds)
        ignoredPlayers.ignoredPlayerIds = data.ignoredPlayerIds;
    }
  });
} catch {
  // Ignore storage errors in test environments
}

export function setGameOrigin(origin) {
  if (origin) GameOrigin = origin;
}

export function updatePlayerNameCache(id, name, options = {}) {
  if (!id) return;
  const key = String(id);
  const existing = playerNameCache[key];

  if (options && options.notFound) {
    playerNameCache[key] = {
      notFound: true,
      lastUpdated: Date.now(),
    };
    storage.set('playerNameCache', playerNameCache);
    return;
  }

  if (!name) return;

  if (!existing || existing.notFound) {
    playerNameCache[key] = {
      currentName: name,
      previousNames: [],
      lastUpdated: Date.now(),
    };
  } else if (existing.currentName !== name) {
    if (!existing.previousNames.includes(existing.currentName)) {
      existing.previousNames.push(existing.currentName);
    }
    existing.currentName = name;
    existing.lastUpdated = Date.now();
  }
  storage.set('playerNameCache', playerNameCache);
}

export function toggleDebug() {
  const next = loggerToggleDebug();
  debugEnabled = next;
  if (next) console.debug('toggleDebug', debugEnabled);
  return next;
}

export function removeDebug() {
  if (typeof document !== 'undefined') {
    var logo = document.getElementById('logo');
    if (logo) logo.removeEventListener('click', toggleDebug);
  }
}

export function checkDebug() {
  return isDebugEnabled();
}
