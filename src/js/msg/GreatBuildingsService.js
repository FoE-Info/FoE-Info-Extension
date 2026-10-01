// import '../../css/main.css';
let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GreatBuildingsService');
} catch {}

const { calculateArcReward } = require('../calc/GreatBuildingCalculator.js');
const GreatBuildingRegistry = require('../state/GreatBuildingRegistry.js');
const { inventoryService } = require('./InventoryService.js');
const {
  greatBuildingsState: defaultGreatBuildingsState,
} = require('../state/GreatBuildingDomainState.js');
const GbDonationService = require('./GbDonationService.js');
const { getContributions } = require('./InvestedService.js');
const { messageDispatcher } = require('../protocol/MessageDispatcher.js');
const serviceDom = {
  findCityRewardsContainer: () => null,
  setCurrentView: () => {},
};

function configurePresentation(callbacks = {}) {
  if (callbacks.element) element = callbacks.element;
  for (const key of Object.keys(serviceDom)) {
    if (typeof callbacks[key] === 'function') serviceDom[key] = callbacks[key];
  }
}

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
    element = require('../fn/AddElement.mjs');
    collapse = require('../fn/collapse.mjs');
    copy = require('../fn/copy.mjs');
    helper = require('../fn/helper.mjs');
    const showOpt = require('../vars/showOptions.mjs');
    showOptions = showOpt.showOptions || showOpt;
    const startup = require('./StartupService.js');
    City = startup.City || {};
    state = require('../vars/state.mjs');
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

let Top = [0, 0, 0, 0, 0, 0];
let GBrewards = [0, 0, 0, 0, 0];
let Reward = [0, 0, 0, 0, 0];
let currentPercent = state?.donationPercent ? state.donationPercent : 190;
let rankings;
let availablePackageForgePoints = 0;

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

  // Live response fields take precedence over the registry's city snapshot.
  if (msg?.responseData && !Array.isArray(msg.responseData)) {
    GbDonationService.syncGbSelected(target, msg.responseData);
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

function handleNewReward(msg) {
  const container = state?.cityrewards || serviceDom.findCityRewardsContainer();
  return GbDonationService.handleNewReward(msg, showOptions, container);
}

function getAvailablePackageForgePoints(msg) {
  const data = msg?.responseData ?? msg;
  const raw = Array.isArray(data) ? data[0] : data;
  if (typeof raw !== 'number' && typeof raw !== 'string')
    return availablePackageForgePoints;
  availablePackageForgePoints = inventoryService
    .setTotalForgePoints(raw)
    .toNumber();
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
  logger?.debug('Donation percentage requested:', percent);
}

function extractRankingData(msg, context) {
  return GbDonationService.extractRankingData(msg, context);
}

function createGreatBuildingsService({
  greatBuildingsState: injectedGbState = null,
  metadataStore: _injectedMetadataStore = null,
  gbRegistry: injectedGbRegistry = null,
  logger: injectedLogger = null,
  state: injectedState = null,
  showOptions: injectedShowOptions = null,
} = {}) {
  const greatBuildingsState = injectedGbState || defaultGreatBuildingsState;
  const activeGbRegistry = injectedGbRegistry || GreatBuildingRegistry;
  const activeLogger = injectedLogger || logger;
  const activeState = injectedState || state;
  const activeShowOptions = injectedShowOptions || showOptions;

  function localSyncRankingPayload(
    msg,
    rankingParams,
    extractedLevel,
    target = GBselected,
  ) {
    return syncRankingPayload(
      msg,
      rankingParams,
      extractedLevel,
      target,
      activeGbRegistry,
      activeState?.MyInfo || MyInfo,
      setPlayerName,
    );
  }

  function localShowGreatBuldingDonation() {
    fCheckOutput();
    if (!Array.isArray(rankings)) {
      rankings = [];
    }

    const pName = activeState?.PlayerName || GBselected.player_name || '';
    const pId = activeState?.PlayerID || 0;

    greatBuildingsState.setDonors({
      GBselected,
      rankings,
      showOptions: activeShowOptions,
      greatbuilding: activeState?.greatbuilding || null,
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
      targetEl: activeState?.gbInfoDIV || null,
      gbData: GBselected,
      playerName: pName,
      showOptions: activeShowOptions,
    });

    greatBuildingsState.setDonation({
      GBselected,
      showOptions: activeShowOptions,
      donationDIV: activeState?.donationDIV || null,
      donation2DIV: activeState?.donation2DIV || null,
      Top,
      GBrewards,
      currentPercent,
      City,
      PlayerID: pId,
      PlayerName: pName,
      MyInfo,
      donationSuffix: activeState?.donationSuffix || '',
      availablePackageForgePoints,
      onRerender: localShowGreatBuldingDonation,
    });
  }

  function localGetConstruction(msg, data, context) {
    const rankingParams = GbDonationService.extractRankingParams(
      msg,
      data,
      context,
    );
    const extractedLevel =
      rankingParams?.level ??
      GbDonationService.extractRankingLevel(msg, data, context);
    localSyncRankingPayload(msg, rankingParams, extractedLevel);

    // A construction ranking can change while the city/registry snapshot is
    // still old. Reconcile it before publishing any of the three GB cards.
    GbDonationService.updateContributionProgress(GBselected, rankings);

    if (!GBselected.max_level || GBselected.max_level === 0) {
      GBselected.max_level = (GBselected.level || 0) + 1;
    }

    localShowGreatBuldingDonation();
  }

  function localContributeForgePoints(msg, data, context) {
    const rankingParams = GbDonationService.extractRankingParams(
      msg,
      data,
      context,
    );
    const extractedLevel =
      rankingParams?.level ??
      GbDonationService.extractRankingLevel(msg, data, context);
    localSyncRankingPayload(msg, rankingParams, extractedLevel);

    const currentViewerId = activeState?.PlayerID || 0;
    GbDonationService.updateContributionProgress(
      GBselected,
      rankings,
      rankingParams,
      currentViewerId,
    );

    const pId = rankingParams?.playerId || GBselected.player || currentViewerId;
    const eId =
      rankingParams?.entityId || GBselected.id || GBselected.entity_id;
    if (eId) {
      const cached = activeGbRegistry.getGreatBuilding(pId, eId);
      if (cached) {
        cached.current = GBselected.current;
        cached.current_progress = GBselected.current;
      }
    }

    if (!GBselected.max_level || GBselected.max_level === 0) {
      GBselected.max_level = (GBselected.level || 0) + 1;
    }

    localShowGreatBuldingDonation();
  }

  function localGetConstructionRanking(msg, data, context) {
    return localGetConstruction(msg, data, context);
  }

  function localRegister(dispatcher = messageDispatcher, options = {}) {
    if (!dispatcher || typeof dispatcher.register !== 'function')
      return instance;

    const targetGbSelected =
      options.GBselected || options.gbSelected || GBselected;
    const targetGbRegistry =
      options.gbRegistry || options.GreatBuildingRegistry || activeGbRegistry;
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
        return (customGetConstruction || localGetConstruction)(
          msg,
          reqData,
          context,
        );
      },
    );

    dispatcher.register(
      'GreatBuildingsService',
      'contributeForgePoints',
      (msg, context) => {
        const reqData = extractRankingData(msg, context);
        return (options.contributeForgePoints || localContributeForgePoints)(
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
        return localGetConstructionRanking(msg, reqData, context);
      },
    );

    dispatcher.register('GreatBuildingsService', 'getContributions', (msg) => {
      if (
        Array.isArray(msg?.responseData) ||
        Array.isArray(msg?.responseData?.contributions)
      ) {
        serviceDom.setCurrentView('OWN_CITY');
      }
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

    activeLogger?.debug('GreatBuildingsService registered RPC handlers');
    return instance;
  }

  const instance = {
    getConstruction: localGetConstruction,
    contributeForgePoints: localContributeForgePoints,
    showGreatBuldingDonation: localShowGreatBuldingDonation,
    getConstructionRanking: localGetConstructionRanking,
    setCurrentPercent,
    getContributions,
    fCheckOutput,
    getAvailablePackageForgePoints,
    getAvailablePackageFp,
    handleNewReward,
    extractRankingData,
    register: localRegister,
    syncRankingPayload: localSyncRankingPayload,
    greatBuildingsState,
    gbRegistry: activeGbRegistry,
    logger: activeLogger,
  };

  return instance;
}

const defaultGreatBuildingsService = createGreatBuildingsService();

exports.createGreatBuildingsService = createGreatBuildingsService;
exports.getConstruction = defaultGreatBuildingsService.getConstruction;
exports.contributeForgePoints =
  defaultGreatBuildingsService.contributeForgePoints;
exports.showGreatBuldingDonation =
  defaultGreatBuildingsService.showGreatBuldingDonation;
exports.getConstructionRanking =
  defaultGreatBuildingsService.getConstructionRanking;
exports.setCurrentPercent = setCurrentPercent;
exports.getContributions = getContributions;
exports.fCheckOutput = fCheckOutput;
exports.getAvailablePackageForgePoints = getAvailablePackageForgePoints;
exports.getAvailablePackageFp = getAvailablePackageFp;
exports.handleNewReward = handleNewReward;
exports.extractRankingData = extractRankingData;
exports.register = defaultGreatBuildingsService.register;
exports.greatBuildingsService = defaultGreatBuildingsService;
exports.GreatBuildingsService = defaultGreatBuildingsService;
exports.default = defaultGreatBuildingsService;
module.exports = exports;

module.exports.configurePresentation = configurePresentation;
