/** Shared runtime application state, debug flag, and game definitions. */
import {
  isDebugEnabled,
  toggleDebug as loggerToggleDebug,
  onDebugToggle,
} from '../utils/logger.js';
import * as storage from '../utils/storage.js';
import { metadataStore } from './MetadataStore.js';
import nameCacheOps from './playerNameCacheOps.js';

// Shared application state and definitions
export let debugEnabled = isDebugEnabled();
onDebugToggle((enabled) => {
  debugEnabled = enabled;
});
export let availablePacksFP = 0;
export function setAvailablePacksFP(val) {
  const num = Number(val);
  availablePacksFP = Number.isFinite(num) ? num : 0;
  return availablePacksFP;
}
export let PlayerName = '';
export let PlayerID = 0;
export let worlds = [];
export let language = 'en';

export let MyInfo = {
  name: '',
  era: '',
  id: 0,
  guild: '',
  guildID: 0,
  guildPosition: 0,
  createdAt: 0,
  score: 0,
};

export let MyGuildPermissions = {};

export let ignoredPlayers = {
  ignoredByPlayerIds: {},
  ignoredPlayerIds: {},
};

export let playerNameCache = {};
export let deletedPlayerIds = {};

export let GBselected = {
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

export let targetsTopic = 'Targets';
export function setTargetsTopic(val) {
  targetsTopic = typeof val === 'string' && val.trim() ? val.trim() : 'Targets';
}
export let targetText = '';
export function setTargetText(val) {
  targetText = typeof val === 'string' ? val : '';
}
export let CityEntityDefs = metadataStore.createLegacyCityEntityProxy();
export let MetaIds = {};
export let BuildingEntityLookup = {};
export let CityProtections = [];
export let MilitaryDefs = {};
export let CastleDefs = [];
export let SelectionKitDefs = [];
export let BoostMetadataDefs = [];
export let AllyDefs = {};
export let ResearchDefs = {};
export let VolcanoProvinceDefs = metadataStore.volcanoProvinces;
export let WaterfallProvinceDefs = metadataStore.waterfallProvinces;
export let BuildingDefs = metadataStore.buildingDefs;
export let metadataLoaded = false;
export let hiddenRewards = [];

export let Goods = {
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

export let EpocTime = 0;
export let GameOrigin = '';
export let donationPercent = 190;
export let donationSuffix = '';

export let Bonus = {
  aid: 0,
  spoils: 0,
  diplomatic: 0,
  strike: 0,
};

export let url = {};

export function setUrl(newUrl) {
  for (const k of Object.keys(url)) delete url[k];
  if (newUrl && typeof newUrl === 'object') {
    Object.assign(url, newUrl);
  }
}
export let rewardsArmy = [];
export let rewardsCity = [];
export let rewardsGE = {};
export let rewardsGBG = {};
export let rewardsGeneric = {};
export const rewardsBySource = {};
export let rewardsOtherPlayer = {};

export function clearRewardsState() {
  for (const key of Object.keys(rewardsBySource)) delete rewardsBySource[key];
  for (const k of Object.keys(rewardsGE)) delete rewardsGE[k];
  for (const k of Object.keys(rewardsGBG)) delete rewardsGBG[k];
  for (const k of Object.keys(rewardsGeneric)) delete rewardsGeneric[k];
  for (const k of Object.keys(rewardsOtherPlayer)) delete rewardsOtherPlayer[k];
  rewardsArmy.length = 0;
  for (const k of Object.keys(rewardsCity)) delete rewardsCity[k];
}

// Centralized Guild Battleground Shared State
export let GBGdata = [];
export let BattlegroundPerformance = [];
export let BGtime = '';
export function setBGtime(val) {
  BGtime = val;
}
export let GuildMembers = [];

// Centralized Resource Shared State
export let ResourceDefs = [];
export let ResourceNames = [];

// DOM container elements (initialized at runtime by index.js or state accessor)
export let content =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let citystats =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let alerts =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let targets =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (targets && !targets.id) targets.id = 'targets';
export let bonusDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let incidents =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let cityinvested =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let galaxyDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let visitstats =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let cityrewards =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (cityrewards && !cityrewards.id) cityrewards.id = 'cityrewards';
export let output =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (output && !output.id) output.id = 'output';
export let donationDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (donationDIV && !donationDIV.id) donationDIV.id = 'donation';
export let battlegroundDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (battlegroundDIV && !battlegroundDIV.id) battlegroundDIV.id = 'battleground';
export let gbgLeaderboardDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (gbgLeaderboardDIV && !gbgLeaderboardDIV.id)
  gbgLeaderboardDIV.id = 'gbgLeaderboard';
export let donation2DIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (donation2DIV && !donation2DIV.id) donation2DIV.id = 'donation2';
export let donationDIV2 =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (donationDIV2 && !donationDIV2.id) donationDIV2.id = 'donationDIV2';
export let gbInfoDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
if (gbInfoDIV && !gbInfoDIV.id) gbInfoDIV.id = 'gbInfo';
export let greatbuilding =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let overview =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let cultural =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let info =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let armyDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let goodsDIV =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let guild =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let friendsDiv =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let treasury =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let treasuryLog =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let clipboard =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let alerts_bottom =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let debug =
  typeof document !== 'undefined' ? document.createElement('div') : null;
export let modal =
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
  const entry = playerNameCache[String(id)];
  if (typeof entry === 'string') return entry;
  return typeof entry?.currentName === 'string' ? entry.currentName : '';
}

export function setIgnoredPlayers(ignoredBy, ignoring) {
  if (ignoredBy) ignoredPlayers.ignoredByPlayerIds = ignoredBy;
  if (ignoring) ignoredPlayers.ignoredPlayerIds = ignoring;
  storage.set('ignoredPlayers', ignoredPlayers);
}

export function markDeletedPlayer(id) {
  if (!id) return;
  deletedPlayerIds[String(id)] = Date.now();
  storage.set('deletedPlayerIds', deletedPlayerIds);
}

try {
  storage.get('deletedPlayerIds', (err, data) => {
    if (data && typeof data === 'object') {
      Object.assign(deletedPlayerIds, data);
    }
  });
} catch {
  // Ignore storage errors in test environments
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

// --- Player name cache: debounce + bounded persistence ---

const NAME_CACHE_FLUSH_DELAY_MS = 500;
let _nameCacheFlushTimer = null;

function scheduleNameCacheFlush() {
  clearTimeout(_nameCacheFlushTimer);
  _nameCacheFlushTimer = setTimeout(
    flushPlayerNameCache,
    NAME_CACHE_FLUSH_DELAY_MS,
  );
}

/**
 * Immediately persist the player-name cache to storage.
 * Called on debounce settle, page unload, and world switch.
 */
export function flushPlayerNameCache() {
  clearTimeout(_nameCacheFlushTimer);
  _nameCacheFlushTimer = null;
  storage.set('playerNameCache', playerNameCache);
}

// Ensure pending writes are flushed before the page unloads.
if (typeof window !== 'undefined' && window.addEventListener) {
  try {
    window.addEventListener('beforeunload', flushPlayerNameCache);
  } catch {
    /* test environments */
  }
}

export function updatePlayerNameCache(id, name, options = {}) {
  const dirty = nameCacheOps.updateEntry(playerNameCache, id, name, options);
  if (!dirty) return;

  // Evict expired notFound entries opportunistically (amortised)
  nameCacheOps.evictExpired(playerNameCache, Date.now());

  // Enforce cache cap (LRU eviction of oldest entries)
  nameCacheOps.evictToCap(playerNameCache);

  scheduleNameCacheFlush();
}

export function toggleDebug() {
  const next = loggerToggleDebug();
  debugEnabled = next;
  if (next) console.debug('toggleDebug', debugEnabled);
  return next;
}

export function removeDebug() {
  if (typeof document !== 'undefined') {
    let logo = document.getElementById('logo');
    if (logo) logo.removeEventListener('click', toggleDebug);
  }
}

export function checkDebug() {
  return isDebugEnabled();
}
