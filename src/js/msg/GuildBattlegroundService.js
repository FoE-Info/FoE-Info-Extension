/**
 * GuildBattlegroundService.js
 *
 * Guild Battlegrounds RPC service for map, state, and leaderboards.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GBG');
} catch {}

const {
  guildBattlegroundState,
} = require('../state/GuildBattlegroundState.js');
const { metadataStore } = require('../state/MetadataStore.js');
let showOptions = {};
try {
  const showOpt = require('../vars/showOptions.js');
  showOptions = showOpt.showOptions || showOpt;
} catch {}

let defaultState = {};
try {
  defaultState = require('../vars/state.js');
} catch {}

const BattlegroundPerformance = defaultState.BattlegroundPerformance || [];
const BuildingDefs =
  metadataStore?.buildingDefs || defaultState.BuildingDefs || {};
const donationDIV = defaultState.donationDIV || null;
const EpocTime = defaultState.EpocTime || 0;
const GameOrigin = defaultState.GameOrigin || '';
const GBGdata = defaultState.GBGdata || {};
const GuildMembers = defaultState.GuildMembers || [];
const setBGtime = defaultState.setBGtime || (() => {});
const targetText =
  typeof defaultState.targetText === 'string' ? defaultState.targetText : '';
const VolcanoProvinceDefs =
  metadataStore?.volcanoProvinces || defaultState.VolcanoProvinceDefs || [];
const WaterfallProvinceDefs =
  metadataStore?.waterfallProvinces || defaultState.WaterfallProvinceDefs || [];

const {
  handleBattlegroundState,
  handlePlayerLeaderboard,
} = require('./GbgLeaderboardHandler.js');
const {
  isProvinceConquered,
  normalizeClanSignals,
  preserveProvinceBuildings,
} = require('./GbgMapUtils.js');
const {
  applySignalToList,
  removeSignalFromList,
  resolveSignalData,
  resolveSignalTarget,
  extractSignalData,
} = require('./GbgSignalPayloadHandler.js');
const { getServerMarket, timeGBG } = require('./GbgTimeFormatter.js');

let map = [];
let signals = [];
let battlegroundParticipants = [];
let mapName = '';
let ProvinceDefs = [];
let currentParticipantId = 0;

function getPlayerLeaderboard(msg) {
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

function getLeaderboard(msg) {
  guildBattlegroundState.setLeaderboard({ leaderboard: msg?.responseData });
}

function getState(msg) {
  handleBattlegroundState(msg, {
    state: {
      GameOrigin,
      BattlegroundPerformance,
      GBGdata,
    },
  });
}

function getBattleground(msg) {
  guildBattlegroundState?.setTargetMessageActive?.(false);
  mapName = msg?.responseData?.map?.id?.split('_')?.[0] || 'default';
  logger?.debug('GBG mapName:', mapName);
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

function getBuildings(msg) {
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

// export function getUpdatedProvinces(msg)
function getUpdatedProvinces(msg) {
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

function updateSignal(msg, payload, context) {
  applySignalAction(msg, payload, context, 'updateSignal', (list, pid, type) =>
    !type || type === 'none' || type === 'clear' ?
      removeSignalFromList(list, pid)
    : applySignalToList(list, pid, type),
  );
}

function setSignal(msg, payload, context) {
  applySignalAction(msg, payload, context, 'setSignal', (list, pid, type) =>
    applySignalToList(list, pid, type),
  );
}

function removeSignal(msg, payload, context) {
  applySignalAction(msg, payload, context, 'removeSignal', (list, pid) =>
    removeSignalFromList(list, pid),
  );
}

function clearBattleground() {
  guildBattlegroundState?.setTargetMessageActive?.(false);
  BattlegroundPerformance.length = 0;
  GuildMembers.length = 0;
  map = {};
  signals = [];
  if (typeof document !== 'undefined' && document.getElementById) {
    const costsEl = document.getElementById('costs');
    if (costsEl) costsEl.innerHTML = '';
    const targetsGbgEl = document.getElementById('targetsGBG');
    if (targetsGbgEl) targetsGbgEl.innerHTML = '';
  }
}

function getSignals() {
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
    epocTime: defaultState?.EpocTime ?? EpocTime,
    gameOrigin:
      typeof defaultState?.GameOrigin !== 'undefined' ? defaultState.GameOrigin
      : typeof GameOrigin !== 'undefined' ? GameOrigin
      : '',
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

function register(dispatcher, options = {}) {
  if (!dispatcher || typeof dispatcher.register !== 'function') return this;
  const targetSetCurrentView = options.setCurrentView;
  const withGbgContext =
    (handler) =>
    (msg, ...rest) => {
      if (typeof targetSetCurrentView === 'function') {
        try {
          targetSetCurrentView('GBG');
        } catch {}
      }
      if (typeof handler === 'function') {
        return handler(msg, ...rest);
      }
    };

  const targetGetPlayerLeaderboard =
    options.getPlayerLeaderboard || getPlayerLeaderboard;
  const targetGetLeaderboard = options.getLeaderboard || getLeaderboard;
  const targetGetState = options.getState || getState;
  const targetGetBattleground = options.getBattleground || getBattleground;
  const targetGetBuildings = options.getBuildings || getBuildings;
  const targetGetUpdatedProvinces =
    options.getUpdatedProvinces || getUpdatedProvinces;
  const targetSetSignal = options.setSignal || setSignal;
  const targetRemoveSignal = options.removeSignal || removeSignal;
  const targetUpdateSignal = options.updateSignal || updateSignal;

  dispatcher.register(
    'GuildBattlegroundService',
    'getPlayerLeaderboard',
    targetGetPlayerLeaderboard,
  );
  dispatcher.register(
    'GuildBattlegroundService',
    'getLeaderboard',
    targetGetLeaderboard,
  );
  dispatcher.register(
    'GuildBattlegroundService',
    'getState',
    withGbgContext(targetGetState),
  );
  dispatcher.register(
    'GuildBattlegroundStateService',
    'getState',
    withGbgContext(targetGetState),
  );
  dispatcher.register(
    'GuildBattlegroundService',
    'getBattleground',
    withGbgContext(targetGetBattleground),
  );
  dispatcher.register(
    'GuildBattlegroundService',
    'getBuildings',
    targetGetBuildings,
  );
  dispatcher.register(
    'GuildBattlegroundBuildingService',
    'getBuildings',
    targetGetBuildings,
  );
  dispatcher.register(
    'GuildBattlegroundService',
    'getUpdatedProvinces',
    targetGetUpdatedProvinces,
  );
  dispatcher.register(
    'GuildBattlegroundService',
    'getProvinces',
    targetGetUpdatedProvinces,
  );

  const handleSetSignal = (msg, context) => {
    const payload = extractSignalData(msg, context);
    return targetSetSignal(msg, payload, context);
  };

  const handleRemoveSignal = (msg, context) => {
    const payload = extractSignalData(msg, context);
    return targetRemoveSignal(msg, payload, context);
  };

  dispatcher.register('GuildBattlegroundService', 'setSignal', handleSetSignal);
  dispatcher.register(
    'GuildBattlegroundSignalsService',
    'setSignal',
    handleSetSignal,
  );
  dispatcher.register(
    'GuildBattlegroundService',
    'removeSignal',
    handleRemoveSignal,
  );
  dispatcher.register(
    'GuildBattlegroundSignalsService',
    'removeSignal',
    handleRemoveSignal,
  );
  dispatcher.register(
    'GuildBattlegroundService',
    'getAction',
    (msg, context) => {
      if (msg?.responseData?.action === 'province_conquered') {
        return handleRemoveSignal(msg, context);
      }
    },
  );

  const handleUpdateSignal = (msg, context) => {
    const payload = extractSignalData(msg, context);
    if (typeof options.updateSignal === 'function') {
      return options.updateSignal(msg, payload, context);
    }
    const signalType =
      payload?.[1] ?? msg?.responseData?.type ?? msg?.responseData?.signal;
    if (signalType && signalType !== 'none' && signalType !== 'clear') {
      return handleSetSignal(msg, context);
    } else {
      return handleRemoveSignal(msg, context);
    }
  };

  dispatcher.register(
    'GuildBattlegroundSignalsService',
    'updateSignal',
    handleUpdateSignal,
  );
  dispatcher.register(
    'GuildBattlegroundService',
    'updateSignal',
    handleUpdateSignal,
  );

  logger?.debug('GuildBattlegroundService registered RPC handlers');
  return this;
}

const guildBattlegroundService = {
  getPlayerLeaderboard,
  getLeaderboard,
  getState,
  getBattleground,
  getBuildings,
  getUpdatedProvinces,
  updateSignal,
  setSignal,
  removeSignal,
  clearBattleground,
  getSignals,
  register,
  getServerMarket,
  timeGBG,
};

module.exports = {
  getPlayerLeaderboard,
  getLeaderboard,
  getState,
  getBattleground,
  getBuildings,
  getUpdatedProvinces,
  updateSignal,
  setSignal,
  removeSignal,
  clearBattleground,
  getSignals,
  register,
  getServerMarket,
  timeGBG,
  guildBattlegroundService,
  GuildBattlegroundService: guildBattlegroundService,
};
module.exports.default = guildBattlegroundService;
