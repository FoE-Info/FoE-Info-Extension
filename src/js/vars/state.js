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
import * as storage from '../fn/storage.js';

// Shared application state and definitions
export var debugEnabled = false;
export var availablePacksFP = 0;
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
export var targetText = '';
export var CityEntityDefs = {};
export var CityProtections = [];
export var MilitaryDefs = [];
export var CastleDefs = [];
export var SelectionKitDefs = [];
export var BoostMetadataDefs = [];
export var VolcanoProvinceDefs = [];
export var WaterfallProvinceDefs = [];
export var BuildingDefs = [];
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

export var url = [];
export var rewardsArmy = [];
export var rewardsCity = [];

// DOM container elements (initialized at runtime by index.js or state accessor)
export var content =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var citystats =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var alerts =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var targets =
  typeof document !== 'undefined' ? document.createElement('div') : null;
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
export var output =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var donationDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var donation2DIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export var donationDIV2 =
  typeof document !== 'undefined' ? document.createElement('div') : null;
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
export var gvg =
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
  if (name && id) {
    updatePlayerNameCache(id, name);
  }
}

export function setIgnoredPlayers(ignoredBy, ignoring) {
  if (ignoredBy) ignoredPlayers.ignoredByPlayerIds = ignoredBy;
  if (ignoring) ignoredPlayers.ignoredPlayerIds = ignoring;
}

export function setGameOrigin(origin) {
  if (origin) GameOrigin = origin;
}

export function updatePlayerNameCache(id, name) {
  if (!id || !name) return;
  const key = String(id);
  const existing = playerNameCache[key];
  if (!existing) {
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
  debugEnabled = !debugEnabled;
  if (typeof document !== 'undefined') {
    var logo = document.getElementById('logo');
    if (logo) {
      if (debugEnabled == true) {
        logo.outerHTML = `<span class="material-icons-outlined" id="logo">bug_report</span>`;
      } else {
        logo.outerHTML = `<img src="/icons/Icon48.png" width="24" height="24" id="logo">`;
      }
      var newLogo = document.getElementById('logo');
      if (newLogo) newLogo.addEventListener('click', toggleDebug);
    }
  }
  console.debug('toggleDebug', debugEnabled);
}

export function removeDebug() {
  if (typeof document !== 'undefined') {
    var logo = document.getElementById('logo');
    if (logo) logo.removeEventListener('click', toggleDebug);
  }
}

export function checkDebug() {
  return debugEnabled;
}
