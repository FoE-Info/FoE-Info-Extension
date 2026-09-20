/** Startup data RPC service orchestrating initial city and player ingestion. */
import { SPECIAL_GOODS } from '../calc/goods/goodsClassification.js';
import { buildClanGoodsData as buildClanGoodsDataImpl } from '../calc/goodsTooltipFormatter.js';
import * as element from '../fn/AddElement.js';
import * as collapse from '../fn/collapse.js';
import * as copy from '../fn/copy.js';
import * as helper from '../fn/helper.js';
import { t, translateContainer } from '../fn/i18n.js';
import { blueGalaxyState } from '../state/BlueGalaxyState.js';
import { City } from '../state/CityState.js';
import { metadataStore } from '../state/MetadataStore.js';
import { startupRenderState } from '../state/StartupRenderState.js';
import { formatDateTime } from '../utils/date.js';
import { createLogger, isDebugEnabled } from '../utils/logger.js';
import { showOptions } from '../vars/showOptions.js';
import * as state from '../vars/state.js';
import { clearArmyUnits } from './ArmyUnitManagementService.js';
import { applyBoostsToCity } from './BoostService.js';
import { resolveMissingCityEntities } from './MetadataService.js';
import { ResourceDefs } from './ResourceService.js';
import {
  handleBoostServiceAllBoosts,
  subscribeBoostUpdates,
} from './StartupBoostCoordinator.js';
import {
  coordinateStartupEntities,
  ensureCitystatsContainer,
} from './StartupEntityCoordinator.js';
import {
  renderWhenStartupReady,
  scheduleStartupRender,
  subscribeMetadataRenders,
} from './StartupRenderOrchestrator.js';
import {
  createStartupContext,
  createTimingTracker,
  initializeStartupSession,
  initStartupUser,
  resetCityStartupState,
  updateCombatTotals as updateCombatTotalsState,
} from './StartupStateInitializer.js';

const logger = createLogger('StartupService');

export { SPECIAL_GOODS };
export { City } from '../state/CityState.js';

var tooltipHTML = {
  goods: [],
  fp: [],
  clanGoods: [],
  clanPower: [],
  SoH: [],
  tGE: [],
};
export var Galaxy = blueGalaxyState.getLegacyShim();

var buildingsReady = [],
  fpBuildings = [],
  goodsBuildings = [],
  clanGoodsBuildings = [];
let lastStartupContext = null,
  startupTimingRun = 0;
export let lastStartupMsg = null;
export let lastBoostsMsg = null;

export function startupService(msg) {
  const timingRun = ++startupTimingRun;
  const { debugEnabled, timingStep } = createTimingTracker(
    logger,
    timingRun,
    msg?.requestId,
  );
  logger.info(
    `[TIMING:P4] StartupService.startupService(msg) execution started | t = ${performance.now().toFixed(2)}ms | requestId = ${msg?.requestId}`,
  );

  const user = initializeStartupSession(msg, {
    City,
    renderLiveCityStats,
    state,
    helper,
    clearArmyUnits,
    blueGalaxyState,
    applyBoostsToCity,
    lastBoostsMsg,
    DEV: typeof DEV !== 'undefined' ? DEV : false,
    logger,
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
    City,
    Galaxy,
    tooltipHTML,
    timingStep,
    updateCombatTotals,
    lastBoostsMsg,
    boostServiceAllBoosts,
    renderBuildingCollectionTimes,
    buildClanGoodsData,
    logger,
    debugEnabled,
    state,
    helper,
    ResourceDefs,
    DEV: typeof DEV !== 'undefined' ? DEV : false,
    blueGalaxyState,
    metadataStore,
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
      document
        .getElementById('citystatsCopyID')
        ?.addEventListener('click', copy.fCityStatsCopy);
    }
    translateContainer(document.body);
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
      if (lastStartupMsg) startupService(lastStartupMsg);
      else finishRender();
    },
    getCityEntityDef: (cid) => helper.getCityEntityDef(cid),
    logger,
    loadingText: t('loading-metadata') || 'Loading metadata...',
    translateContainer,
  });
  timingStep('P4z', 'startup synchronous invocation complete');
}

export function buildClanGoodsData() {
  return buildClanGoodsDataImpl(
    clanGoodsBuildings,
    City.guildGoodsProductionBoost,
    tooltipHTML,
  );
}

export function renderLiveCityStats(ctx) {
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

export function updateCombatTotals(targetCity = City) {
  updateCombatTotalsState(targetCity);
}

export { emissaryService } from './EmissaryService.js';

export function boostService(_msg) {}

export function boostServiceAllBoosts(msg) {
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

export function renderBuildingCollectionTimes(options = {}) {
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
