/** Guild Battlegrounds RPC service for map, state, and leaderboards. */
import { guildBattlegroundState } from '../state/GuildBattlegroundState.js';
import { createLogger } from '../utils/logger.js';
import { showOptions } from '../vars/showOptions.js';
import {
  BattlegroundPerformance,
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
  handleBattlegroundState,
  handlePlayerLeaderboard,
} from './GbgLeaderboardHandler.js';
import {
  isProvinceConquered,
  normalizeClanSignals,
  preserveProvinceBuildings,
} from './GbgMapUtils.js';
import {
  applySignalToList,
  removeSignalFromList,
  resolveSignalData,
  resolveSignalTarget,
} from './GbgSignalPayloadHandler.js';
import { getServerMarket, timeGBG } from './GbgTimeFormatter.js';

export { getServerMarket, timeGBG };

const logger = createLogger('GBG');

let map = [];
let signals = [];
let battlegroundParticipants = [];
let mapName = '';
let ProvinceDefs = [];
let currentParticipantId = 0;

export function getPlayerLeaderboard(msg) {
  handlePlayerLeaderboard(msg, {
    state: {
      BattlegroundPerformance,
      GBGdata,
      GuildMembers,
      GameOrigin,
      EpocTime,
      setBGtime,
      donationDIV,
    },
    showOptions,
    onPerformanceUpdated: (performance, gameOrigin) => {
      guildBattlegroundState.setPerformance({
        performance,
        gameOrigin,
      });
    },
  });
}

export function getLeaderboard(msg) {
  guildBattlegroundState.setLeaderboard({ leaderboard: msg?.responseData });
}

export function getState(msg) {
  handleBattlegroundState(msg, {
    state: {
      GameOrigin,
      BattlegroundPerformance,
      GBGdata,
    },
  });
}

export function getBattleground(msg) {
  guildBattlegroundState?.setTargetMessageActive?.(false);
  mapName = msg?.responseData?.map?.id?.split('_')?.[0] || 'default';
  logger.debug('GBG mapName:', mapName);
  if (mapName === 'volcano') ProvinceDefs = VolcanoProvinceDefs;
  else if (mapName === 'waterfall') ProvinceDefs = WaterfallProvinceDefs;

  const oldMap = map;
  currentParticipantId = msg?.responseData?.currentParticipantId;
  map = msg?.responseData?.map?.provinces || [];
  if (!Array.isArray(map)) map = [];
  map = map.filter(Boolean);

  preserveProvinceBuildings(map, oldMap);

  battlegroundParticipants = msg?.responseData?.battlegroundParticipants || [];
  const myClan =
    Array.isArray(battlegroundParticipants) ?
      battlegroundParticipants.find(
        (clan) =>
          clan?.participantId == msg?.responseData?.currentParticipantId,
      )
    : null;
  signals = myClan?.signals ? [...myClan.signals] : [];
  normalizeClanSignals(signals);

  checkProvinces({ signalChanged: true });
}

export function getBuildings(msg) {
  const provinceId = msg?.responseData?.provinceId || 0;
  const prov = Array.isArray(map) ? map.find((p) => p.id === provinceId) : null;
  if (prov) {
    prov.placedBuildings = msg.responseData.placedBuildings;
    prov.availableBuildings = msg.responseData.availableBuildings;
  }
  checkProvinces({ signalChanged: false });
  if (showOptions.buildingCosts && msg?.responseData?.availableBuildings) {
    showBuildingCost(msg.responseData);
  }
}

export function getUpdatedProvinces(msg) {
  if (!Array.isArray(map)) return;
  const updatedProvinces =
    Array.isArray(msg?.responseData) ? msg.responseData
    : Array.isArray(msg) ? msg
    : [];
  let signalRemoved = false;
  for (const updated of updatedProvinces) {
    if (!updated || updated.id === undefined) continue;
    const existing = map.find((p) => p.id == updated.id);

    const wasConquered = isProvinceConquered(
      existing,
      updated,
      currentParticipantId,
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
    if (wasConquered && Array.isArray(signals)) {
      const prevCount = signals.length;
      signals = signals.filter(
        (p) =>
          Number(p.id !== undefined ? p.id : p.provinceId) !==
          Number(updated.id),
      );
      if (signals.length !== prevCount) {
        signalRemoved = true;
      }
    }
  }
  checkProvinces({ signalChanged: signalRemoved });
}

function applySignalAction(msg, payload, context, action, mutate) {
  const data = resolveSignalData(msg, payload, context, action);
  const target = resolveSignalTarget(msg, payload, data);
  if (target.provinceId === undefined || target.provinceId === null) {
    logger?.debug(`${action} returned early - provinceId is null/undefined`);
    return;
  }
  signals = mutate(signals, target.provinceId, target.signalType);
  checkProvinces({ signalChanged: true });
}

export function updateSignal(msg, payload, context) {
  applySignalAction(msg, payload, context, 'updateSignal', (list, pid, type) =>
    !type || type === 'none' || type === 'clear' ?
      removeSignalFromList(list, pid)
    : applySignalToList(list, pid, type),
  );
}

export function setSignal(msg, payload, context) {
  applySignalAction(msg, payload, context, 'setSignal', (list, pid, type) =>
    applySignalToList(list, pid, type),
  );
}

export function removeSignal(msg, payload, context) {
  applySignalAction(msg, payload, context, 'removeSignal', (list, pid) =>
    removeSignalFromList(list, pid),
  );
}

export function clearBattleground() {
  guildBattlegroundState?.setTargetMessageActive?.(false);
  BattlegroundPerformance.length = 0;
  GuildMembers.length = 0;
  map = {};
  signals = [];
  const costsEl = document.getElementById('costs');
  if (costsEl) costsEl.innerHTML = '';
  const targetsGbgEl = document.getElementById('targetsGBG');
  if (targetsGbgEl) targetsGbgEl.innerHTML = '';
}

export function getSignals() {
  return signals;
}

function checkProvinces({ signalChanged = false } = {}) {
  if (signalChanged) {
    guildBattlegroundState?.setTargetMessageActive?.(false);
  }
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
    signalChanged,
  });
}

function showBuildingCost(_msg) {
  guildBattlegroundState.setProvince({
    map,
    provinceDefs: ProvinceDefs,
    mapName,
    buildingDefs: BuildingDefs,
  });
}
