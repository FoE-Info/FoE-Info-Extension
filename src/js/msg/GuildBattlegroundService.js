/**
 * GuildBattlegroundService.js
 *
 * Unified Guild Battlegrounds RPC service for map, state, signals, and leaderboards.
 */

let browser = globalThis.browser;
try {
  browser = require('webextension-polyfill');
} catch {}

let translateContainer = () => {};
try {
  ({ translateContainer } = require('../fn/i18n.js'));
} catch {}

let storage = {
  set: () => {},
  remove: () => {},
};
try {
  storage = require('../fn/storage.js');
} catch {}

let formatDateTime = (val) => String(val);
try {
  ({ formatDateTime } = require('../utils/date.js'));
} catch {}

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GBG');
} catch {}

const { guildBattlegroundState } = require('../state/GuildDomainState.js');
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

const { getServerMarket, timeGBG } = require('./GbgSignalService.js');

// ============================================================================
// 1. MAP UTILITIES & CONQUER DETECTION
// ============================================================================

/**
 * Normalizes province IDs and carries forward building state from oldMap to map.
 */
function preserveProvinceBuildings(map, oldMap) {
  if (!Array.isArray(map)) return;
  map.forEach((province) => {
    if (!province || typeof province !== 'object') return;
    if (!province.id) province.id = 0;
    if (Array.isArray(oldMap) && oldMap.length > 0) {
      const oldProv = oldMap.find(
        (oldProvince) =>
          oldProvince && Number(oldProvince.id) === Number(province.id),
      );
      if (oldProv) {
        if (oldProv.placedBuildings) {
          province.placedBuildings = oldProv.placedBuildings;
        }
        if (oldProv.availableBuildings) {
          province.availableBuildings = oldProv.availableBuildings;
        }
      }
    }
  });
}

/**
 * Normalizes raw clan signal items to have consistent id, provinceId, type, and signal keys.
 */
function normalizeClanSignals(signals) {
  if (!Array.isArray(signals)) return;
  signals.forEach((clan) => {
    if (!clan || typeof clan !== 'object') return;
    if (clan.provinceId === undefined && clan.id !== undefined) {
      clan.provinceId = clan.id;
    }
    if (clan.provinceId === undefined) clan.provinceId = 0;
    if (clan.id === undefined) clan.id = clan.provinceId;
    if (clan.signal === undefined && clan.type !== undefined) {
      clan.signal = clan.type;
    }
    if (clan.type === undefined && clan.signal !== undefined) {
      clan.type = clan.signal;
    }
  });
}

/**
 * Evaluates whether two signal arrays represent the same signal assignments.
 */
function areSignalsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  if (a.length === 0 && b.length === 0) return true;
  const mapA = new Map();
  for (const s of a) {
    if (!s || typeof s !== 'object') return false;
    const id = Number(s.id !== undefined ? s.id : s.provinceId);
    const type = s.type !== undefined ? s.type : s.signal;
    mapA.set(id, type);
  }
  for (const s of b) {
    if (!s || typeof s !== 'object') return false;
    const id = Number(s.id !== undefined ? s.id : s.provinceId);
    const type = s.type !== undefined ? s.type : s.signal;
    if (!mapA.has(id) || mapA.get(id) !== type) return false;
  }
  return true;
}

/**
 * Checks if an updated province was conquered compared to the existing map state.
 */
function isProvinceConquered(existing, updated, currentParticipantId) {
  if (!updated || typeof updated !== 'object') return false;
  return Boolean(
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
}

// ============================================================================
// 2. SIGNAL PAYLOAD RESOLUTION
// ============================================================================

function resolveRequestPayloadItems(context) {
  if (Array.isArray(context?.requestPayload)) return context.requestPayload;
  if (context?.requestPayload && typeof context.requestPayload === 'object') {
    return [context.requestPayload];
  }
  return [];
}

function resolvePostText(context) {
  return (
    context?.request?.request?.postData?.text ||
    context?.request?.postData?.text ||
    context?.postData?.text ||
    (typeof context?.postData === 'string' ? context.postData : null) ||
    (typeof context?.request?.postData === 'string' ? context.request.postData
    : typeof context?.request?.request?.postData === 'string' ?
      context.request.request.postData
    : null)
  );
}

function resolveSignalData(msg, payload, context, requestMethod) {
  let data =
    Array.isArray(payload) && payload.length > 0 ? payload
    : Array.isArray(msg?.requestData) && msg.requestData.length > 0 ?
      msg.requestData
    : Array.isArray(msg?.responseData) && msg.responseData.length > 0 ?
      msg.responseData
    : Array.isArray(msg) && msg.length > 0 ? msg
    : [];

  if (data.length === 0 && context) {
    const reqPayloadItems = resolveRequestPayloadItems(context);
    if (reqPayloadItems.length > 0) {
      const match =
        (msg?.requestId !== undefined ?
          reqPayloadItems.find((r) => r && r.requestId === msg.requestId)
        : null) ||
        reqPayloadItems.find(
          (r) =>
            r &&
            (r.requestMethod === requestMethod ||
              r.requestClass?.includes('GuildBattleground')),
        ) ||
        reqPayloadItems[0];
      if (Array.isArray(match?.requestData) && match.requestData.length > 0) {
        data = match.requestData;
      }
    }

    if (data.length === 0) {
      const postText = resolvePostText(context);
      if (postText) {
        try {
          const parsed =
            typeof postText === 'string' ? JSON.parse(postText) : postText;
          const reqItems = Array.isArray(parsed) ? parsed : [parsed];
          const match = reqItems.find(
            (r) =>
              r &&
              (r.requestMethod === requestMethod ||
                r.requestClass?.includes('GuildBattleground')),
          );
          if (
            Array.isArray(match?.requestData) &&
            match.requestData.length > 0
          ) {
            data = match.requestData;
          }
        } catch {}
      }
    }
  }

  return data;
}

function resolveCandidateObject(msg, payload) {
  return (
    (payload && typeof payload === 'object' && !Array.isArray(payload) ?
      payload
    : null) ||
    ((
      msg?.responseData &&
      typeof msg.responseData === 'object' &&
      !Array.isArray(msg.responseData)
    ) ?
      msg.responseData
    : null) ||
    ((
      msg?.requestData &&
      typeof msg.requestData === 'object' &&
      !Array.isArray(msg.requestData)
    ) ?
      msg.requestData
    : null) ||
    (msg && typeof msg === 'object' && !Array.isArray(msg) ? msg : null)
  );
}

function resolveSignalTarget(msg, payload, data) {
  let provinceId = Array.isArray(data) ? data[0] : undefined;
  let signalType = Array.isArray(data) ? data[1] : undefined;

  if (provinceId === undefined || provinceId === null) {
    const candidateObj = resolveCandidateObject(msg, payload);
    if (candidateObj) {
      provinceId = candidateObj.provinceId ?? candidateObj.id;
      signalType = candidateObj.type ?? candidateObj.signal ?? signalType;
    }
  }

  if (
    provinceId !== undefined &&
    provinceId !== null &&
    !isNaN(Number(provinceId))
  ) {
    provinceId = Number(provinceId);
  }

  logger?.debug('signal target resolved:', { provinceId, signalType });

  return { provinceId, signalType };
}

function applySignalToList(signals, provinceId, signalType) {
  const list = Array.isArray(signals) ? signals : [];

  if (signalType === 'ignore') {
    return list.filter(
      (p) => Number(p.id !== undefined ? p.id : p.provinceId) !== provinceId,
    );
  }

  if (signalType === 'focus') {
    const existing = list.find(
      (p) => Number(p.id !== undefined ? p.id : p.provinceId) === provinceId,
    );
    if (existing) {
      existing.id = provinceId;
      existing.provinceId = provinceId;
      existing.type = signalType;
      existing.signal = signalType;
    } else {
      list.push({
        id: provinceId,
        provinceId: provinceId,
        type: signalType,
        signal: signalType,
      });
    }
  }

  return list;
}

function removeSignalFromList(signals, provinceId) {
  const list = Array.isArray(signals) ? signals : [];
  return list.filter(
    (p) => Number(p.id !== undefined ? p.id : p.provinceId) !== provinceId,
  );
}

function extractSignalData(msg, context) {
  if (Array.isArray(msg) && msg.length > 0) return msg;
  if (Array.isArray(msg?.requestData) && msg.requestData.length > 0) {
    return msg.requestData;
  }
  if (Array.isArray(context?.requestData) && context.requestData.length > 0) {
    return context.requestData;
  }
  if (
    Array.isArray(context?.request?.requestData) &&
    context.request.requestData.length > 0
  ) {
    return context.request.requestData;
  }

  const reqPayloadItems = resolveRequestPayloadItems(context);
  if (reqPayloadItems.length > 0) {
    const match =
      (msg?.requestId !== undefined ?
        reqPayloadItems.find((r) => r && r.requestId === msg.requestId)
      : null) ||
      reqPayloadItems.find(
        (r) =>
          r &&
          (r.requestMethod === 'setSignal' ||
            r.requestMethod === 'updateSignal' ||
            r.requestMethod === 'removeSignal' ||
            r.requestClass?.includes('GuildBattleground')),
      ) ||
      reqPayloadItems[0];
    if (Array.isArray(match?.requestData) && match.requestData.length > 0) {
      return match.requestData;
    }
  }

  const postText = resolvePostText(context);
  if (postText) {
    try {
      const parsed =
        typeof postText === 'string' ? JSON.parse(postText) : postText;
      const reqItems = Array.isArray(parsed) ? parsed : [parsed];
      const match =
        (msg?.requestId !== undefined ?
          reqItems.find((r) => r && r.requestId === msg.requestId)
        : null) ||
        reqItems.find(
          (r) =>
            r &&
            (r.requestMethod === 'setSignal' ||
              r.requestMethod === 'updateSignal' ||
              r.requestMethod === 'removeSignal' ||
              r.requestClass?.includes('GuildBattleground')),
        ) ||
        reqItems[0];
      if (Array.isArray(match?.requestData) && match.requestData.length > 0) {
        return match.requestData;
      }
    } catch {}
  }

  if (Array.isArray(msg?.responseData) && msg.responseData.length > 0) {
    return msg.responseData;
  }
  if (Array.isArray(context) && context.length > 0) return context;

  const candidateObj = resolveCandidateObject(msg);
  if (candidateObj) {
    const pid = candidateObj.provinceId ?? candidateObj.id;
    const stype = candidateObj.type ?? candidateObj.signal;
    return [pid, stype];
  }

  return [];
}

// ============================================================================
// 3. LEADERBOARDS & MATCH RESULTS
// ============================================================================

function getStateVar(name, fallback) {
  if (defaultState && defaultState[name] !== undefined)
    return defaultState[name];
  if (globalThis[name] !== undefined) return globalThis[name];
  return fallback;
}

function handlePlayerLeaderboard(
  msg,
  {
    onPerformanceUpdated,
    state = {},
    showOptions: customShowOptions,
    storageApi: storageApiOption,
  } = {},
) {
  const perfList =
    state.BattlegroundPerformance || getStateVar('BattlegroundPerformance', []);
  const gbgList = state.GBGdata || getStateVar('GBGdata', []);
  const gMembers = state.GuildMembers || getStateVar('GuildMembers', []);
  const gOrigin =
    state.GameOrigin !== undefined ?
      state.GameOrigin
    : getStateVar('GameOrigin', '');
  const eTime =
    state.EpocTime !== undefined ? state.EpocTime : getStateVar('EpocTime', 0);
  const sBGtime = state.setBGtime || getStateVar('setBGtime', () => {});
  const donDIV =
    state.donationDIV !== undefined ?
      state.donationDIV
    : getStateVar('donationDIV', null);

  perfList.length = 0;
  gbgList.length = 0;
  const entries = Array.isArray(msg?.responseData) ? msg.responseData : [];
  logger?.debug('handlePlayerLeaderboard parsed entries:', entries.length);

  entries.forEach((entry) => {
    let wonNegotiations = 0;
    let wonBattles = 0;
    let attrition = 0;
    if (entry?.negotiationsWon) wonNegotiations = entry.negotiationsWon;
    if (entry?.battlesWon) wonBattles = entry.battlesWon;
    if (entry?.attrition) attrition = entry.attrition;
    const playerName = entry?.player?.name || 'Unknown';
    gbgList.push({
      name: playerName,
      total: wonNegotiations * 2 + wonBattles,
    });
    perfList.push({
      name: playerName,
      wonNegotiations,
      wonBattles,
      attrition,
    });
  });

  const opts = customShowOptions || globalThis.showOptions || showOptions;
  if (opts?.showBattleground) {
    const storageApi =
      storageApiOption ||
      globalThis.browser?.storage?.local ||
      browser?.storage?.local ||
      globalThis.chrome?.storage?.local;
    if (storageApi?.get) {
      storageApi
        .get([gOrigin, gOrigin + 'BGtime'])
        .then((items) => {
          logger?.debug('Retrieved GBG storage items:', items);
          if (items && items[gOrigin] && Array.isArray(items[gOrigin])) {
            gMembers.length = 0;
            gMembers.push(...items[gOrigin]);
          }
          storage.set(gOrigin + 'BGtime', eTime);
          if (items && items[gOrigin + 'BGtime']) {
            sBGtime(formatDateTime(items[gOrigin + 'BGtime']));
          } else {
            sBGtime('not set');
          }

          perfList.forEach((entry) => {
            if (gMembers.find((id) => id.name === entry.name) == null) {
              gMembers.push({
                name: entry.name,
                wonNegotiations: 0,
                wonBattles: 0,
              });
            }
          });

          logger?.debug('Saving GBG performance:', gOrigin, perfList.length);
          storage.set(gOrigin, perfList);

          if (typeof onPerformanceUpdated === 'function') {
            onPerformanceUpdated(perfList, gOrigin);
          } else {
            guildBattlegroundState.setPerformance?.({
              performance: perfList,
              gameOrigin: gOrigin,
            });
          }
        })
        .catch((err) => {
          logger?.error('Failed to get GBG storage:', err);
        });
    }

    if (donDIV) {
      translateContainer(donDIV);
    }
  }
}

function handleBattlegroundState(msg, { state = {} } = {}) {
  if (msg?.responseData?.stateId === 'subscribed') {
    guildBattlegroundState?.setTargetMessageActive?.(false);
    logger?.debug('handleBattlegroundState subscribed state received');
    const gOrigin =
      state.GameOrigin !== undefined ?
        state.GameOrigin
      : getStateVar('GameOrigin', '');
    const perfList =
      state.BattlegroundPerformance ||
      getStateVar('BattlegroundPerformance', []);
    const gbgList = state.GBGdata || getStateVar('GBGdata', []);

    storage.remove(gOrigin + 'BGtime');
    storage.remove(gOrigin);
    perfList.length = 0;
    gbgList.length = 0;

    guildBattlegroundState.setResult?.({
      responseData: msg.responseData,
      onRow: (row) => {
        perfList.push([
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
      let wonNegotiations = 0;
      let wonBattles = 0;
      if (entry?.wonNegotiations) wonNegotiations = entry.wonNegotiations;
      if (entry?.wonBattles) wonBattles = entry.wonBattles;
      gbgList.push({
        name: entry?.player?.name || 'Unknown',
        total: wonNegotiations * 2 + wonBattles,
      });
    });
  }
}

function handleLeaderboard(msg) {
  guildBattlegroundState.setLeaderboard?.({ leaderboard: msg?.responseData });
}

// ============================================================================
// 4. MAIN BATTLEGROUND SERVICE STATE & HANDLERS
// ============================================================================

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

function handlePendingUpdate(msg) {
  const data = msg?.responseData;
  if (!data || !data.updateAt || !Array.isArray(data.provinceIds)) return;
  if (!Array.isArray(map)) return;

  let changed = false;
  for (const id of data.provinceIds) {
    if (id === undefined || id === null) continue;
    const province = map.find((p) => p.id == id);
    if (province && province.lockedUntil !== data.updateAt) {
      province.lockedUntil = data.updateAt;
      changed = true;
    }
  }

  if (changed) {
    checkProvinces({ signalChanged: false });
  }
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
  const targetGetPendingUpdate =
    options.getPendingUpdate || handlePendingUpdate;
  const targetSetSignal = options.setSignal || setSignal;
  const targetRemoveSignal = options.removeSignal || removeSignal;

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
  dispatcher.register(
    'GuildBattlegroundService',
    'getPendingUpdate',
    targetGetPendingUpdate,
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
  handlePendingUpdate,
  getPendingUpdate: handlePendingUpdate,
  updateSignal,
  setSignal,
  removeSignal,
  clearBattleground,
  getSignals,
  register,
  getServerMarket,
  timeGBG,
  // Map Utils
  preserveProvinceBuildings,
  normalizeClanSignals,
  areSignalsEqual,
  isProvinceConquered,
  // Signal Payload Resolution
  resolveSignalData,
  resolveSignalTarget,
  applySignalToList,
  removeSignalFromList,
  extractSignalData,
  // Leaderboard Handlers
  handlePlayerLeaderboard,
  handleBattlegroundState,
  handleLeaderboard,
};

module.exports = {
  getPlayerLeaderboard,
  getLeaderboard,
  getState,
  getBattleground,
  getBuildings,
  getUpdatedProvinces,
  handlePendingUpdate,
  getPendingUpdate: handlePendingUpdate,
  updateSignal,
  setSignal,
  removeSignal,
  clearBattleground,
  getSignals,
  register,
  getServerMarket,
  timeGBG,
  // Map Utils
  preserveProvinceBuildings,
  normalizeClanSignals,
  areSignalsEqual,
  isProvinceConquered,
  // Signal Payload Resolution
  resolveSignalData,
  resolveSignalTarget,
  applySignalToList,
  removeSignalFromList,
  extractSignalData,
  // Leaderboard Handlers
  handlePlayerLeaderboard,
  handleBattlegroundState,
  handleLeaderboard,
  guildBattlegroundService,
  GuildBattlegroundService: guildBattlegroundService,
};
module.exports.default = guildBattlegroundService;
