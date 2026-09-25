// import '../../css/main.css';
let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GreatBuildingsService');
} catch {}

const { calculateArcReward } = require('../calc/GreatBuildingCalculator.js');
const GreatBuildingRegistry = require('../state/GreatBuildingRegistry.js');
const { greatBuildingsState } = require('../state/GreatBuildingsState.js');
const GbDonationService = require('./GbDonationService.js');
const { getContributions } = require('./InvestedService.js');
const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

let element = {};
let collapse = {};
let copy = {};
let helper = {};
let showOptions = {};
let City = {};
const defaultState = {
  GBselected: {
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
  },
  MyInfo: { id: 0, name: '' },
  PlayerID: 0,
  PlayerName: '',
  donationPercent: 190,
  donationSuffix: '',
  donationDIV: null,
  donation2DIV: null,
  gbInfoDIV: null,
  greatbuilding: null,
  cityrewards: null,
  url: {},
};
let state = defaultState;

if (typeof __webpack_require__ !== 'undefined') {
  try {
    element = require('../fn/AddElement.js');
    collapse = require('../fn/collapse.js');
    copy = require('../fn/copy.js');
    helper = require('../fn/helper.js');
    const showOpt = require('../vars/showOptions.js');
    showOptions = showOpt.showOptions || showOpt;
    const startup = require('./StartupService.js');
    City = startup.City || {};
    state = require('../vars/state.js');
  } catch {}
} else {
  try {
    element = require('../ui/AddElement.js');
  } catch {}
}

const GBselected = new Proxy(defaultState.GBselected, {
  get(target, prop) {
    if (state?.GBselected && prop in state.GBselected) {
      return state.GBselected[prop];
    }
    return target[prop];
  },
  set(target, prop, value) {
    if (state?.GBselected) {
      state.GBselected[prop] = value;
    }
    target[prop] = value;
    return true;
  },
});

const MyInfo = new Proxy(defaultState.MyInfo, {
  get(target, prop) {
    if (state?.MyInfo && prop in state.MyInfo) {
      return state.MyInfo[prop];
    }
    return target[prop];
  },
  set(target, prop, value) {
    if (state?.MyInfo) {
      state.MyInfo[prop] = value;
    }
    target[prop] = value;
    return true;
  },
});

function setPlayerName(name, id) {
  if (state && typeof state.setPlayerName === 'function') {
    return state.setPlayerName(name, id);
  }
}

function getPlayerName(id) {
  if (state && typeof state.getPlayerName === 'function') {
    return state.getPlayerName(id);
  }
  return '';
}

var Top = [0, 0, 0, 0, 0, 0];
var GBrewards = [0, 0, 0, 0, 0];
var Reward = [0, 0, 0, 0, 0];
var currentPercent = state?.donationPercent ? state.donationPercent : 190;
var rankings;
var availablePackageForgePoints = 0;

function syncRankingPayload(
  msg,
  rankingParams,
  extractedLevel,
  target = GBselected,
  registry = GreatBuildingRegistry,
  info = MyInfo,
  setPlayer = setPlayerName,
) {
  if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
    target.level = extractedLevel;
  }

  const myId = info?.id || 0;
  const myName = info?.name || info?.player_name || '';
  const isForeign =
    rankingParams?.playerId !== undefined &&
    rankingParams.playerId !== null &&
    rankingParams.playerId !== 0 &&
    rankingParams.playerId !== myId;

  const pId = isForeign ? rankingParams.playerId : 0;
  const eId = rankingParams?.entityId || target.id || target.entity_id;

  if (
    msg?.responseData &&
    typeof msg.responseData === 'object' &&
    !Array.isArray(msg.responseData)
  ) {
    GbDonationService.syncGbSelected(target, msg.responseData);
    registry.registerGreatBuilding(msg.responseData, pId);
    if (pId === 0 && myId) {
      registry.registerGreatBuilding(msg.responseData, myId);
    }
  }

  if (Array.isArray(msg?.responseData?.rankings)) {
    rankings = msg.responseData.rankings;
  } else if (Array.isArray(msg?.responseData)) {
    rankings = msg.responseData;
  } else if (Array.isArray(msg)) {
    rankings = msg;
  } else if (!Array.isArray(rankings)) {
    rankings = [];
  }

  let cached = registry.getGreatBuilding(pId, eId);
  if (!cached && pId === 0 && myId) {
    cached = registry.getGreatBuilding(myId, eId);
  }
  if (!cached && eId) {
    cached = registry.getGreatBuilding(null, eId);
  }
  if (!cached && pId) {
    cached = registry.getGreatBuilding(pId, null);
  }

  if (cached) {
    if (pId === 0) {
      if (!cached.player && myId) cached.player = myId;
      if (!cached.player_name && myName) cached.player_name = myName;
    }
    GbDonationService.syncGbSelected(target, cached);
    if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
      target.level = extractedLevel;
    }
    const resolvedName = cached.player_name || (pId === 0 ? myName : '') || '';
    const resolvedId = cached.player || (pId === 0 ? myId : pId) || 0;
    if (resolvedName || resolvedId) {
      setPlayer(resolvedName, resolvedId);
    }
  } else if (eId && eId !== target.id) {
    target.id = eId;
    target.entity_id = eId;
    if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
      target.level = extractedLevel;
    }
    if (pId === 0) {
      target.player = myId;
      target.player_name = myName;
      setPlayer(myName, myId);
    } else {
      target.player = pId;
      const foreignName = getPlayerName(pId) || '';
      target.player_name = foreignName;
      setPlayer(foreignName, pId);
    }
  }

  if (
    (!target.total || target.total === 0) &&
    target.cityentity_id &&
    target.level > 0
  ) {
    target.total = registry.calculateLevelCost(
      target.cityentity_id,
      target.level,
    );
  }
}

function getConstruction(msg, data, context) {
  const rankingParams = GbDonationService.extractRankingParams(
    msg,
    data,
    context,
  );
  const extractedLevel =
    rankingParams?.level ??
    GbDonationService.extractRankingLevel(msg, data, context);
  syncRankingPayload(msg, rankingParams, extractedLevel);

  if (
    (!GBselected.current || GBselected.current === 0) &&
    Array.isArray(rankings)
  ) {
    const investedSum = (rankings || []).reduce(
      (sum, r) => sum + (Number(r?.forge_points) || 0),
      0,
    );
    if (investedSum > 0) GBselected.current = investedSum;
  }

  if (!GBselected.max_level || GBselected.max_level === 0) {
    GBselected.max_level = (GBselected.level || 0) + 1;
  }

  showGreatBuldingDonation();
}

function contributeForgePoints(msg, data, context) {
  const rankingParams = GbDonationService.extractRankingParams(
    msg,
    data,
    context,
  );
  const extractedLevel =
    rankingParams?.level ??
    GbDonationService.extractRankingLevel(msg, data, context);
  syncRankingPayload(msg, rankingParams, extractedLevel);

  const currentViewerId = state?.PlayerID || 0;
  GbDonationService.updateContributionProgress(
    GBselected,
    rankings,
    rankingParams,
    currentViewerId,
  );

  const pId = rankingParams?.playerId || GBselected.player || currentViewerId;
  const eId = rankingParams?.entityId || GBselected.id || GBselected.entity_id;
  if (eId) {
    const cached = GreatBuildingRegistry.getGreatBuilding(pId, eId);
    if (cached) {
      cached.current = GBselected.current;
      cached.current_progress = GBselected.current;
    }
  }

  if (!GBselected.max_level || GBselected.max_level === 0) {
    GBselected.max_level = (GBselected.level || 0) + 1;
  }

  showGreatBuldingDonation();
}

function showGreatBuldingDonation() {
  fCheckOutput();
  if (!Array.isArray(rankings)) {
    rankings = [];
  }

  const pName = state?.PlayerName || GBselected.player_name || '';
  const pId = state?.PlayerID || 0;

  greatBuildingsState.setDonors({
    GBselected,
    rankings,
    showOptions,
    greatbuilding: state?.greatbuilding || null,
    Top,
    GBrewards,
    Reward,
    City,
    PlayerID: pId,
    playerName: pName,
    setPlayerName,
    helper,
    element,
    collapse,
    copy,
    calculateArcReward,
  });
  greatBuildingsState.setInfo({
    targetEl: state?.gbInfoDIV || null,
    gbData: GBselected,
    playerName: pName,
    showOptions,
  });

  greatBuildingsState.setDonation({
    GBselected,
    showOptions,
    donationDIV: state?.donationDIV || null,
    donation2DIV: state?.donation2DIV || null,
    Top,
    GBrewards,
    currentPercent,
    City,
    PlayerID: pId,
    PlayerName: pName,
    MyInfo,
    donationSuffix: state?.donationSuffix || '',
    availablePackageForgePoints,
    onRerender: showGreatBuldingDonation,
  });
}

function getConstructionRanking(msg, data, context) {
  return getConstruction(msg, data, context);
}

function handleNewReward(msg) {
  const container =
    state?.cityrewards ||
    (typeof document !== 'undefined' ?
      document.getElementById('cityrewards') ||
      document.getElementById('rewards')
    : null);
  return GbDonationService.handleNewReward(msg, showOptions, container);
}

function getAvailablePackageForgePoints(msg) {
  const data = msg?.responseData ?? msg;
  const raw = Array.isArray(data) ? data[0] : data;
  availablePackageForgePoints = Number(raw) || 0;
  return availablePackageForgePoints;
}

function getAvailablePackageFp() {
  return availablePackageForgePoints;
}

// export function fCheckOutput
function fCheckOutput() {
  // Output repair and container safeguard are handled reactively
  // in src/js/ui/greatBuildingsRenderBinding.js via gbOutputRepair.js.
}

function setCurrentPercent(percent) {
  if (percent) currentPercent = percent;
  else currentPercent = state?.donationPercent || 190;
  console.debug(percent);
}

function extractRankingData(msg, context) {
  return GbDonationService.extractRankingData(msg, context);
}

function register(dispatcher = messageDispatcher, options = {}) {
  if (!dispatcher || typeof dispatcher.register !== 'function') return this;

  const targetGbSelected =
    options.GBselected || options.gbSelected || GBselected;
  const targetGbRegistry =
    options.gbRegistry ||
    options.GreatBuildingRegistry ||
    GreatBuildingRegistry;
  const targetMyInfo = options.MyInfo || MyInfo;
  const targetSetPlayerName = options.setPlayerName || setPlayerName;
  const customGetConstruction = options.getConstruction;
  const customGetConstructionRanking = options.getConstructionRanking;
  const customGetContributions = options.getContributions;
  const customGetAvailablePackageFp = options.getAvailablePackageForgePoints;

  dispatcher.register(
    'GreatBuildingsService',
    'getConstruction',
    (msg, context) => {
      const reqData = extractRankingData(msg, context);
      return (customGetConstruction || getConstruction)(msg, reqData, context);
    },
  );

  dispatcher.register(
    'GreatBuildingsService',
    'contributeForgePoints',
    (msg, context) => {
      const reqData = extractRankingData(msg, context);
      return (options.contributeForgePoints || contributeForgePoints)(
        msg,
        reqData,
        context,
      );
    },
  );

  dispatcher.register(
    'GreatBuildingsService',
    'getConstructionRanking',
    (msg, context) => {
      const reqData = extractRankingData(msg, context);
      if (customGetConstructionRanking) {
        return customGetConstructionRanking(msg, reqData, context);
      }
      if (options.GBselected || options.gbSelected) {
        const rankingParams = GbDonationService.extractRankingParams(
          msg,
          reqData,
          context,
        );
        const extractedLevel =
          rankingParams?.level ??
          GbDonationService.extractRankingLevel(msg, reqData, context);
        syncRankingPayload(
          msg,
          rankingParams,
          extractedLevel,
          targetGbSelected,
          targetGbRegistry,
          targetMyInfo,
          targetSetPlayerName,
        );
        return;
      }
      return getConstructionRanking(msg, reqData, context);
    },
  );

  dispatcher.register('GreatBuildingsService', 'getContributions', (msg) => {
    return (customGetContributions || getContributions)(msg);
  });

  dispatcher.register(
    'GreatBuildingsService',
    'getAvailablePackageForgePoints',
    (msg, context) =>
      (customGetAvailablePackageFp || getAvailablePackageForgePoints)(
        msg,
        context,
      ),
  );

  GbDonationService.register(dispatcher, options);

  logger?.debug('GreatBuildingsService registered RPC handlers');
  return this;
}

const greatBuildingsService = exports;

exports.getConstruction = getConstruction;
exports.contributeForgePoints = contributeForgePoints;
exports.showGreatBuldingDonation = showGreatBuldingDonation;
exports.getConstructionRanking = getConstructionRanking;
exports.setCurrentPercent = setCurrentPercent;
exports.getContributions = getContributions;
// export function fCheckOutput
exports.fCheckOutput = fCheckOutput;
exports.getAvailablePackageForgePoints = getAvailablePackageForgePoints;
exports.getAvailablePackageFp = getAvailablePackageFp;
exports.handleNewReward = handleNewReward;
exports.extractRankingData = extractRankingData;
exports.register = register;
exports.greatBuildingsService = greatBuildingsService;
exports.GreatBuildingsService = greatBuildingsService;
exports.default = exports;
module.exports = exports;
