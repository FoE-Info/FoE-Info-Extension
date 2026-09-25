/** Startup data RPC service orchestrating initial city and player ingestion. */
const { SPECIAL_GOODS } = require('../calc/goods/goodsClassification.js');
const {
  buildClanGoodsData: buildClanGoodsDataImpl,
} = require('../calc/goodsTooltipFormatter.js');
let element = {};
try {
  element = require('../fn/AddElement.js');
} catch {}
let collapse = {};
try {
  collapse = require('../fn/collapse.js');
} catch {}
let copy = {};
try {
  copy = require('../fn/copy.js');
} catch {}
let helper = {};
try {
  helper = require('../fn/helper.js');
} catch {}
let t = (k, f) => f || k;
let translateContainer = () => {};
try {
  ({ t, translateContainer } = require('../fn/i18n.js'));
} catch {}
const { blueGalaxyState } = require('../state/BlueGalaxyState.js');
const { City } = require('../state/CityState.js');
const { metadataStore } = require('../state/MetadataStore.js');
const { startupRenderState } = require('../state/StartupRenderState.js');
const { formatDateTime } = require('../utils/date.js');
const { createLogger, isDebugEnabled } = require('../utils/logger.js');
let showOptions = {};
try {
  ({ showOptions } = require('../vars/showOptions.js'));
} catch {}
let state = {};
try {
  state = require('../vars/state.js');
} catch {}
const { clearArmyUnits } = require('./ArmyUnitManagementService.js');
const { applyBoostsToCity } = require('./BoostService.js');
const { resolveMissingCityEntities } = require('./MetadataService.js');
const { ResourceDefs } = require('./ResourceService.js');
const {
  handleBoostServiceAllBoosts,
  subscribeBoostUpdates,
} = require('./StartupBoostCoordinator.js');
const {
  coordinateStartupEntities,
  ensureCitystatsContainer,
} = require('./StartupEntityCoordinator.js');
const {
  renderWhenStartupReady,
  scheduleStartupRender,
  subscribeMetadataRenders,
} = require('./StartupRenderOrchestrator.js');
const {
  createStartupContext,
  createTimingTracker,
  initializeStartupSession,
  updateCombatTotals: updateCombatTotalsState,
} = require('./StartupStateInitializer.js');
const { emissaryService } = require('./EmissaryService.js');

const logger = createLogger('StartupService');

let tooltipHTML = {
  goods: [],
  fp: [],
  clanGoods: [],
  clanPower: [],
  SoH: [],
  tGE: [],
};
let Galaxy = blueGalaxyState.getLegacyShim();

let buildingsReady = [],
  fpBuildings = [],
  goodsBuildings = [],
  clanGoodsBuildings = [];
let lastStartupContext = null,
  startupTimingRun = 0;
let lastStartupMsg = null;
let lastBoostsMsg = null;

function startupService(msg, dependencies = {}) {
  const activeCity = dependencies.City || dependencies.city || City;
  const activeLogger = dependencies.logger || logger;
  const _activeStartupRenderState =
    dependencies.startupRenderState || startupRenderState;
  const activeBlueGalaxyState = dependencies.blueGalaxyState || blueGalaxyState;
  const activeMetadataStore = dependencies.metadataStore || metadataStore;

  const timingRun = ++startupTimingRun;
  const { debugEnabled, timingStep } = createTimingTracker(
    activeLogger,
    timingRun,
    msg?.requestId,
  );
  activeLogger.info(
    `[TIMING:P4] StartupService.startupService(msg) execution started | t = ${performance.now().toFixed(2)}ms | requestId = ${msg?.requestId}`,
  );

  const user = initializeStartupSession(msg, {
    City: activeCity,
    renderLiveCityStats,
    state,
    helper,
    clearArmyUnits,
    blueGalaxyState: activeBlueGalaxyState,
    applyBoostsToCity,
    lastBoostsMsg,
    DEV: typeof DEV !== 'undefined' ? DEV : false,
    logger: activeLogger,
  });
  if (!user) return;

  lastStartupMsg = msg;
  buildingsReady = [];
  fpBuildings = [];
  goodsBuildings = [];
  clanGoodsBuildings = [];
  tooltipHTML.goods = [];
  timingStep('P4a', 'startup reset and user preparation complete');

  const entityResult = coordinateStartupEntities({
    msg,
    user,
    City: activeCity,
    Galaxy,
    tooltipHTML,
    timingStep,
    updateCombatTotals,
    lastBoostsMsg,
    boostServiceAllBoosts,
    renderBuildingCollectionTimes,
    buildClanGoodsData,
    logger: activeLogger,
    debugEnabled,
    state,
    helper,
    ResourceDefs,
    DEV: typeof DEV !== 'undefined' ? DEV : false,
    blueGalaxyState: activeBlueGalaxyState,
    metadataStore: activeMetadataStore,
  });

  ({ buildingsReady, fpBuildings, goodsBuildings, clanGoodsBuildings } =
    entityResult);

  const citystats = ensureCitystatsContainer();

  lastStartupContext = createStartupContext({
    user,
    entityResult,
    state,
    collapse,
    fpBuildings,
    goodsBuildings,
    tooltipHTML,
  });
  timingStep('P4k', 'render preparation complete; entering metadata gate');

  const finishRender = () => {
    renderLiveCityStats();
    if (!collapse.collapseStats) {
      if (typeof document !== 'undefined') {
        document
          .getElementById('citystatsCopyID')
          ?.addEventListener('click', copy.fCityStatsCopy);
      }
    }
    if (typeof document !== 'undefined' && document.body) {
      translateContainer(document.body);
    }
  };

  scheduleStartupRender({
    timingRun,
    msg,
    citystats,
    renderLiveCityStats: finishRender,
    resolveMissingCityEntities,
    onResolved: () => {
      timingStep(
        'P4r',
        'metadata gate callback; recomputing existing lastStartupMsg',
      );
      if (lastStartupMsg) startupService(lastStartupMsg, dependencies);
      else finishRender();
    },
    getCityEntityDef: (cid) => helper.getCityEntityDef?.(cid),
    logger: activeLogger,
    loadingText: t('loading-metadata') || 'Loading metadata...',
    translateContainer,
  });
  timingStep('P4z', 'startup synchronous invocation complete');
}

function buildClanGoodsData() {
  return buildClanGoodsDataImpl(
    clanGoodsBuildings,
    City.guildGoodsProductionBoost,
    tooltipHTML,
  );
}

// export function renderLiveCityStats(ctx) {
function renderLiveCityStats(ctx) {
  if (isDebugEnabled()) {
    logger.info(
      `[TIMING:P6s] renderLiveCityStats wrapper entered | t = ${performance.now().toFixed(2)}ms | run = ${startupTimingRun} | caller = ${new Error().stack?.split('\n').slice(2, 4).join(' <- ')}`,
    );
  }
  const startupContext = ctx?.lastStartupContext || lastStartupContext;
  if (!startupContext && !ctx?.force && !lastStartupMsg) {
    return;
  }
  return renderWhenStartupReady(() =>
    startupRenderState.setCityStatsContext(
      ctx || {
        lastStartupContext,
        tooltipHTML,
        fpBuildings,
        goodsBuildings,
        clanGoodsBuildings,
      },
    ),
  );
}

function updateCombatTotals(targetCity = City) {
  updateCombatTotalsState(targetCity);
}

function boostService(_msg) {}

function boostServiceAllBoosts(msg) {
  lastBoostsMsg = msg;
  handleBoostServiceAllBoosts({
    msg,
    City,
    updateCombatTotals,
    tooltipHTML,
    clanGoodsBuildings,
    buildClanGoodsData,
    lastStartupContext,
    renderLiveCityStats,
  });
}

subscribeBoostUpdates(boostServiceAllBoosts);

// export function renderBuildingCollectionTimes(
function renderBuildingCollectionTimes(options = {}) {
  return startupRenderState.setBuildingCollectionOptions({
    buildingsReady: options.buildingsReady || buildingsReady,
    epocTime: options.epocTime ?? state.EpocTime,
    showOptions,
    helper,
    element,
    collapse,
    formatDateTime,
    ...options,
  });
}

subscribeMetadataRenders({
  metadataStore,
  isDebugEnabled,
  logger,
  getTimingRun: () => startupTimingRun,
  onRenderBuildingCollectionTimes: renderBuildingCollectionTimes,
  onRenderGalaxy: () => blueGalaxyState.notify(),
  onRenderLiveCityStats: renderLiveCityStats,
});

function createStartupService({
  startupRenderState: injectedStartupRenderState = startupRenderState,
  metadataStore: injectedMetadataStore = metadataStore,
  blueGalaxyState: injectedBlueGalaxyState = blueGalaxyState,
  city: injectedCity = City,
  logger: injectedLogger = logger,
} = {}) {
  return {
    startupService: (msg, opts = {}) =>
      startupService(msg, {
        startupRenderState: injectedStartupRenderState,
        metadataStore: injectedMetadataStore,
        blueGalaxyState: injectedBlueGalaxyState,
        city: injectedCity,
        logger: injectedLogger,
        ...opts,
      }),
    renderLiveCityStats: (ctx) => renderLiveCityStats(ctx),
    renderBuildingCollectionTimes: (options = {}) =>
      renderBuildingCollectionTimes(options),
    updateCombatTotals: (targetCity) =>
      updateCombatTotals(targetCity || injectedCity),
    buildClanGoodsData: () => buildClanGoodsData(),
    boostServiceAllBoosts,
    startupRenderState: injectedStartupRenderState,
    metadataStore: injectedMetadataStore,
    blueGalaxyState: injectedBlueGalaxyState,
    city: injectedCity,
    logger: injectedLogger,
  };
}

module.exports = {
  SPECIAL_GOODS,
  City,
  Galaxy,
  startupService,
  buildClanGoodsData,
  renderLiveCityStats,
  updateCombatTotals,
  emissaryService,
  boostService,
  boostServiceAllBoosts,
  renderBuildingCollectionTimes,
  createStartupService,
  get lastStartupMsg() {
    return lastStartupMsg;
  },
  get lastBoostsMsg() {
    return lastBoostsMsg;
  },
};
module.exports.default = module.exports;
