/** Guild Battlegrounds RPC service for map, state, and leaderboards. */
import browser from 'webextension-polyfill';
import { getAttritionReduction } from '../calc/GbgCalculator.js';
import * as helper from '../fn/helper.js';
import * as storage from '../fn/storage.js';
import { guildBattlegroundState } from '../state/GuildBattlegroundState.js';
import {
  formatDateTime,
  formatInTimeZone,
  resolveDate,
} from '../utils/date.js';
import { createLogger } from '../utils/logger.js';
import { showOptions } from '../vars/showOptions.js';
import {
  BattlegroundPerformance,
  BGtime,
  BuildingDefs,
  donationDIV,
  EpocTime,
  GameOrigin,
  GBGdata,
  GuildMembers,
  setBGtime,
  targetText,
  VolcanoProvinceDefs,
  WaterfallProvinceDefs,
} from '../vars/state.js';
import {
  applySignalToList,
  removeSignalFromList,
  resolveSignalData,
  resolveSignalTarget,
} from './GbgSignalPayloadHandler.js';

const logger = createLogger('GBG');

var map = [];
var signals = [];
var battlegroundParticipants = [];
var mapName = '';
var ProvinceDefs = [];

var currentParticipantId = 0;

export function getPlayerLeaderboard(msg) {
  BattlegroundPerformance.length = 0;
  GBGdata.length = 0;
  const entries = Array.isArray(msg?.responseData) ? msg.responseData : [];
  // GuildMembers = BattlegroundPerformance;		// save old values
  entries.forEach((entry) => {
    // console.debug(entry);
    var wonNegotiations = 0;
    var wonBattles = 0;
    var attrition = 0;
    if (entry?.negotiationsWon) wonNegotiations = entry.negotiationsWon;
    if (entry?.battlesWon) wonBattles = entry.battlesWon;
    if (entry?.attrition) attrition = entry.attrition;
    const playerName = entry?.player?.name || 'Unknown';
    GBGdata.push({
      name: playerName,
      total: wonNegotiations * 2 + wonBattles,
    });
    BattlegroundPerformance.push({
      name: playerName,
      wonNegotiations: wonNegotiations,
      wonBattles: wonBattles,
      attrition: attrition,
    });
  });
  // console.debug('BattlegroundPerformance',BattlegroundPerformance,GBGdata);

  console.debug('2', showOptions.showBattleground);

  if (showOptions.showBattleground) {
    browser.storage.local
      .get([GameOrigin, GameOrigin + 'BGtime'])
      .then((items) => {
        console.debug('items', items);
        if (items[GameOrigin] && Array.isArray(items[GameOrigin])) {
          GuildMembers.length = 0;
          GuildMembers.push(...items[GameOrigin]);
        }
        // console.debug('GuildMembers',GuildMembers);
        storage.set(GameOrigin + 'BGtime', EpocTime);
        if (items[GameOrigin + 'BGtime'])
          setBGtime(formatDateTime(items[GameOrigin + 'BGtime']));
        else setBGtime('not set');

        BattlegroundPerformance.forEach((entry) => {
          // console.debug('entry',entry);
          if (GuildMembers.find((id) => id.name == entry.name) == null)
            GuildMembers.push({
              name: entry.name,
              wonNegotiations: 0,
              wonBattles: 0,
            }); // if member not listed, add new member
        });
        console.debug('save GBG', GameOrigin, BattlegroundPerformance);
        storage.set(GameOrigin, BattlegroundPerformance);
        helper.fshowBattleground();
      });
    if (donationDIV) helper.translateContainer(donationDIV);
  }
}

export function getLeaderboard(msg) {
  guildBattlegroundState.setLeaderboard({ leaderboard: msg?.responseData });
}

export function getState(msg) {
  // console.debug('getState:', msg);
  if (msg?.responseData?.stateId == 'subscribed') {
    console.debug('msg:', msg);
    storage.remove(GameOrigin + 'BGtime');
    storage.remove(GameOrigin);
    BattlegroundPerformance.length = 0;
    GBGdata.length = 0;

    guildBattlegroundState.setResult({
      responseData: msg.responseData,
      onRow: (row) => {
        BattlegroundPerformance.push([
          row.rank,
          row.name,
          row.negotiations,
          row.fights,
          row.attrition,
        ]);
      },
    });

    const playerLeaderboardEntries =
      Array.isArray(msg?.responseData?.playerLeaderboardEntries) ?
        msg.responseData.playerLeaderboardEntries
      : [];
    playerLeaderboardEntries.forEach((entry) => {
      // console.debug(entry);
      var wonNegotiations = 0;
      var wonBattles = 0;
      if (entry?.wonNegotiations) wonNegotiations = entry.wonNegotiations;
      if (entry?.wonBattles) wonBattles = entry.wonBattles;
      // GBGdata[i] = {'name':entry.player.name,
      // 'wonNegotiations': wonNegotiations,
      // 'wonBattles': wonBattles,
      // 'total':wonNegotiations*2+wonBattles};
      GBGdata.push({
        name: entry?.player?.name || 'Unknown',
        total: wonNegotiations * 2 + wonBattles,
      });
    });
    // console.debug('GBGdata',GBGdata);
  }
}

export function getBattleground(msg) {
  mapName = msg?.responseData?.map?.id?.split('_')?.[0] || 'default';
  console.debug(mapName, msg);
  if (mapName == 'volcano') ProvinceDefs = VolcanoProvinceDefs;
  else if (mapName == 'waterfall') ProvinceDefs = WaterfallProvinceDefs;

  var oldMap = map;
  currentParticipantId = msg?.responseData?.currentParticipantId;
  map = msg?.responseData?.map?.provinces || [];
  if (!Array.isArray(map)) map = [];
  map = map.filter((province) => province);
  // console.debug(oldMap,map);
  map.forEach((province, i) => {
    if (!province.id) province.id = 0;
    // if(oldMap[i] && oldMap[i].placedBuildings){
    //     province.placedBuildings = oldMap[i].placedBuildings;
    // }
    if (Array.isArray(oldMap) && oldMap.length > 0) {
      const oldProv = oldMap.find(
        (oldProvince) => oldProvince.id == province.id,
      );
      if (oldProv) {
        if (oldProv.placedBuildings)
          province.placedBuildings = oldProv.placedBuildings;
        if (oldProv.availableBuildings)
          province.availableBuildings = oldProv.availableBuildings;
      }
    }
  });
  // console.debug(map);
  // console.debug(map);

  battlegroundParticipants = msg?.responseData?.battlegroundParticipants || [];
  const myClan =
    Array.isArray(battlegroundParticipants) ?
      battlegroundParticipants.find(
        (clan) =>
          clan?.participantId == msg?.responseData?.currentParticipantId,
      )
    : null;
  signals = myClan?.signals ? [...myClan.signals] : [];
  if (Array.isArray(signals)) {
    signals.forEach((clan) => {
      if (clan.provinceId === undefined && clan.id !== undefined)
        clan.provinceId = clan.id;
      if (clan.provinceId === undefined) clan.provinceId = 0;
      if (clan.id === undefined) clan.id = clan.provinceId;
      if (clan.signal === undefined && clan.type !== undefined)
        clan.signal = clan.type;
      if (clan.type === undefined && clan.signal !== undefined)
        clan.type = clan.signal;
    });
  }
  console.debug(map, signals, battlegroundParticipants);

  // console.debug(message.lastMessage.text);

  checkProvinces();
}

export function getBuildings(msg) {
  var provinceId = 0;
  if (msg?.responseData?.provinceId) provinceId = msg.responseData.provinceId;
  const prov =
    Array.isArray(map) ?
      map.find((province) => province.id == provinceId)
    : null;
  if (prov) {
    prov.placedBuildings = msg.responseData.placedBuildings;
    prov.availableBuildings = msg.responseData.availableBuildings;
  }
  checkProvinces();
  if (showOptions.buildingCosts && msg?.responseData?.availableBuildings)
    showBuildingCost(msg.responseData);
  // console.debug('getBuildings',msg.responseData,map);
}

export function getUpdatedProvinces(msg) {
  if (!Array.isArray(map)) return;
  const updatedProvinces =
    Array.isArray(msg?.responseData) ? msg.responseData
    : Array.isArray(msg) ? msg
    : [];
  for (const updated of updatedProvinces) {
    if (!updated || updated.id === undefined) continue;
    const existing = map.find((p) => p.id == updated.id);

    const wasConquered = Boolean(
      (updated.ownerId !== undefined &&
        currentParticipantId &&
        updated.ownerId == currentParticipantId) ||
      (existing &&
        existing.ownerId !== undefined &&
        updated.ownerId !== undefined &&
        existing.ownerId !== updated.ownerId) ||
      (updated.lockedUntil &&
        (!existing?.lockedUntil || updated.lockedUntil > existing.lockedUntil)),
    );

    if (existing) {
      if (existing.placedBuildings && !updated.placedBuildings) {
        updated.placedBuildings = existing.placedBuildings;
      }
      if (existing.availableBuildings && !updated.availableBuildings) {
        updated.availableBuildings = existing.availableBuildings;
      }
      Object.assign(existing, updated);
    } else {
      map.push(updated);
    }
    if (wasConquered) {
      if (Array.isArray(signals)) {
        signals = signals.filter(
          (p) =>
            Number(p.id !== undefined ? p.id : p.provinceId) !==
            Number(updated.id),
        );
      }
    }
  }
  checkProvinces();
}

export function updateSignal(msg, payload, context) {
  const data = resolveSignalData(msg, payload, context, 'updateSignal');
  const { provinceId, signalType } = resolveSignalTarget(msg, payload, data);

  if (provinceId === undefined || provinceId === null) {
    logger?.debug('updateSignal returned early - provinceId is null/undefined');
    return;
  }

  if (!signalType || signalType === 'none' || signalType === 'clear') {
    signals = removeSignalFromList(signals, provinceId);
  } else {
    signals = applySignalToList(signals, provinceId, signalType);
  }

  checkProvinces();
}

export function setSignal(msg, payload, context) {
  const data = resolveSignalData(msg, payload, context, 'setSignal');
  const { provinceId, signalType } = resolveSignalTarget(msg, payload, data);

  if (provinceId === undefined || provinceId === null) {
    logger?.debug('setSignal returned early - provinceId is null/undefined');
    return;
  }

  signals = applySignalToList(signals, provinceId, signalType);
  checkProvinces();
}

export function removeSignal(msg, payload, context) {
  const data = resolveSignalData(msg, payload, context, 'removeSignal');
  const { provinceId } = resolveSignalTarget(msg, payload, data);

  if (provinceId === undefined || provinceId === null) {
    logger?.debug('removeSignal returned early - provinceId is null/undefined');
    return;
  }

  signals = removeSignalFromList(signals, provinceId);
  checkProvinces();
}

export function clearBattleground() {
  BattlegroundPerformance.length = 0;
  GuildMembers.length = 0;
  map = {};
  if (document.getElementById('costs'))
    document.getElementById('costs').innerHTML = '';
}

export function getServerMarket(origin) {
  if (!origin || typeof origin !== 'string') return 'en';
  const clean = origin.trim().toLowerCase();
  if (clean.includes('zz') || clean.includes('beta')) return 'zz';
  const hostMatch = clean.match(
    /(?:https?:\/\/)?([a-z]{2,3})\d*\.forgeofempires\.com/i,
  );
  if (hostMatch && hostMatch[1]) {
    return hostMatch[1];
  }
  const prefixMatch = clean.match(/^(?:https?:\/\/)?([a-z]{2,3})\d*/i);
  if (prefixMatch && prefixMatch[1]) {
    return prefixMatch[1];
  }
  return 'en';
}

const SERVER_TIMEZONES = {
  en: { timeZone: 'Europe/London', locale: 'en-GB', hour12: false },
  zz: { timeZone: 'Europe/London', locale: 'en-GB', hour12: false },
  us: { timeZone: 'America/New_York', locale: 'en-US', hour12: true },
  de: { timeZone: 'Europe/Berlin', locale: 'de-DE', hour12: false },
  fr: { timeZone: 'Europe/Paris', locale: 'fr-FR', hour12: false },
  gr: { timeZone: 'Europe/Athens', locale: 'el-GR', hour12: false },
  fi: { timeZone: 'Europe/Helsinki', locale: 'fi-FI', hour12: false },
  ru: { timeZone: 'Europe/Moscow', locale: 'ru-RU', hour12: false },
  es: { timeZone: 'Europe/Madrid', locale: 'es-ES', hour12: false },
  it: { timeZone: 'Europe/Rome', locale: 'it-IT', hour12: false },
  nl: { timeZone: 'Europe/Amsterdam', locale: 'nl-NL', hour12: false },
  pl: { timeZone: 'Europe/Warsaw', locale: 'pl-PL', hour12: false },
  br: { timeZone: 'America/Sao_Paulo', locale: 'pt-BR', hour12: false },
};

export function timeGBG(
  date,
  origin = typeof GameOrigin !== 'undefined' ? GameOrigin : '',
  options = {},
) {
  if (!date) return '';
  if (typeof origin === 'object' && origin !== null) {
    options = origin;
    origin = typeof GameOrigin !== 'undefined' ? GameOrigin : '';
  }
  const d = resolveDate(date);
  if (!d) return '';

  const timeMode =
    options?.GBGtimeMode ||
    (typeof showOptions !== 'undefined' && showOptions?.GBGtimeMode) ||
    'server';

  if (timeMode === 'local') {
    let is12Hour = false;
    try {
      const { getTimeFormattingConfig } = require('../utils/date.js');
      const cfg = getTimeFormattingConfig();
      is12Hour = /\bhh\b|[Aa]/.test(
        cfg.customPattern || cfg.timeFormat || cfg.dateTimeFormat,
      );
    } catch {}
    if (is12Hour) {
      const h24 = d.getHours();
      const h12 = h24 % 12 || 12;
      const hours = String(h12).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      return `@ ${hours}:${minutes} ${ampm}`;
    }
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `@ ${hours}:${minutes}`;
  }

  const market = getServerMarket(origin);
  const config = SERVER_TIMEZONES[market] || {
    timeZone: 'Europe/Berlin',
    locale: 'de-DE',
    hour12: false,
  };

  const formatted = formatInTimeZone(d, {
    locale: config.locale,
    timeZone: config.timeZone,
    hour12: config.hour12,
  });

  return `@ ${formatted}`;
}

function attritionReduction(building) {
  return getAttritionReduction(building);
}

function checkProvinces() {
  guildBattlegroundState.setTargets({
    map,
    signals,
    provinceDefs: ProvinceDefs,
    volcanoProvinceDefs: VolcanoProvinceDefs,
    waterfallProvinceDefs: WaterfallProvinceDefs,
    currentParticipantId,
    mapName,
    epocTime: EpocTime,
    gameOrigin: typeof GameOrigin !== 'undefined' ? GameOrigin : '',
    targetText,
    formatTime: timeGBG,
  });
}

function showBuildingCost(msg) {
  guildBattlegroundState.setProvince({
    map,
    provinceDefs: ProvinceDefs,
    mapName,
    buildingDefs: BuildingDefs,
  });
}
