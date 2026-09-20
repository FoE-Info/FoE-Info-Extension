/**
 * StartupEntityCoordinator.js
 *
 * Coordinates processing of city map entities, bonus aggregation,
 * combat totals, and city stats tooltips during startup.
 * Extracted from StartupService.js to maintain modular size budgets.
 */

let createLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});
try {
  ({ createLogger } = require('../utils/logger.js'));
} catch {}

let processCityMapEntities = () => ({
  buildingsReady: [],
  fpBuildings: [],
  goodsBuildings: [],
  clanGoodsBuildings: [],
  goodsList: {},
  clanPower: 0,
  clanGoods: 0,
  totalGoods: 0,
  timing: { galaxyEntityMs: 0, entityProductionMs: 0, entityAbilityMs: 0 },
  unknownBonusTypes: new Map(),
  aidStats: {},
});
try {
  ({ processCityMapEntities } = require('../calc/CityMapEntityProcessor.js'));
} catch {}

let SPECIAL_GOODS = new Set();
try {
  ({ SPECIAL_GOODS } = require('../calc/goods/goodsClassification.js'));
} catch {}

let fGoodsHTML = () => '';
try {
  ({ fGoodsHTML } = require('../calc/goodsTooltipFormatter.js'));
} catch {}

let formatLiveName = (name) => name;
try {
  ({ formatLiveName } = require('../fn/liveNameResolver.js'));
} catch {}

let metadataStore = {};
try {
  ({ metadataStore } = require('../state/MetadataStore.js'));
} catch {}

let blueGalaxyState = { notify: () => {} };
try {
  ({ blueGalaxyState } = require('../state/BlueGalaxyState.js'));
} catch {}

let aggregateCityStats = () => ({});
try {
  ({ aggregateCityStats } = require('./StartupCityStatsAggregator.js'));
} catch {}

const logger = createLogger('StartupEntityCoordinator');

function fEntityName(entity, helperObj) {
  const def = helperObj?.getCityEntityDef?.(entity);
  return def && def.name ? def.name : entity;
}

/**
 * Coordinates processing of city map entities and post-processing steps.
 *
 * @param {Object} options
 * @returns {Object} Extracted building collections and aggregated stats
 */
function coordinateStartupEntities({
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
  logger: customLogger,
  debugEnabled = false,
  DEV: isDev,
  state: stateObj,
  CityEntityDefs: entityDefsOpt,
  ResourceDefs: resDefsOpt,
  Goods: goodsObjOpt,
  MyInfo: myInfoOpt,
  debugEl: debugElOpt,
  checkDebug: checkDebugOpt,
  helper: helperObj,
  blueGalaxyState: galaxyStateParam,
  metadataStore: metadataStoreParam,
}) {
  const log = customLogger || logger;
  const devMode =
    isDev !== undefined ? isDev
    : typeof DEV !== 'undefined' ? DEV
    : false;
  const entityDefs = entityDefsOpt || stateObj?.CityEntityDefs;
  const resDefs = resDefsOpt || stateObj?.ResourceDefs;
  const goodsObj = goodsObjOpt || stateObj?.Goods;
  const myInfo = myInfoOpt || stateObj?.MyInfo;
  const debugEl =
    debugElOpt !== undefined ? debugElOpt : stateObj?.debug || null;
  const checkDebugFn = checkDebugOpt || stateObj?.checkDebug;
  const helperInstance = helperObj || {};
  const galaxyState = galaxyStateParam || blueGalaxyState;
  const metadataStoreObj = metadataStoreParam || metadataStore;
  const unknownBonusTypes = new Map();

  const entityResult = processCityMapEntities(
    msg?.responseData?.city_map?.entities,
    {
      City,
      CityEntityDefs: entityDefs,
      metadataStore: metadataStoreObj,
      user,
      MyInfo: myInfo,
      ResourceDefs: resDefs,
      blueGalaxyState: galaxyState,
      Galaxy,
      helper: helperInstance,
      formatLiveName,
      checkDebug: checkDebugFn,
      debugEnabled,
      DEV: devMode,
      debugEl,
      fEntityName: (entity) => fEntityName(entity, helperInstance),
    },
  );

  const galaxyEntityMs = entityResult.timing?.galaxyEntityMs || 0;
  const entityProductionMs = entityResult.timing?.entityProductionMs || 0;
  const entityAbilityMs = entityResult.timing?.entityAbilityMs || 0;

  if (entityResult.unknownBonusTypes) {
    for (const [k, v] of entityResult.unknownBonusTypes.entries()) {
      unknownBonusTypes.set(k, v);
    }
  }

  timingStep?.(
    'P4b',
    `city entity loop complete; entities = ${msg?.responseData?.city_map?.entities?.length || 0}; blueGalaxy.addEntityMs = ${galaxyEntityMs.toFixed(2)}; productionAndNamesMs = ${entityProductionMs.toFixed(2)}; metadataAndAbilitiesMs = ${entityAbilityMs.toFixed(2)}`,
  );

  if (debugEnabled && unknownBonusTypes.size) {
    log.debug?.(
      'Startup entity batch: unhandled bonus type counts',
      Object.fromEntries(unknownBonusTypes),
    );
  }

  City.baseUnits = City.TrazUnits;
  City.TrazUnits = (City.baseUnits || 0) + (City.emissaryUnits || 0);

  if (typeof updateCombatTotals === 'function') {
    updateCombatTotals(City);
  }

  if (lastBoostsMsg && typeof boostServiceAllBoosts === 'function') {
    timingStep?.(
      'P4c',
      'cached boosts begin; includes early renderLiveCityStats',
    );
    boostServiceAllBoosts(lastBoostsMsg);
  }
  timingStep?.('P4d', 'combat totals and cached boosts complete');

  galaxyState?.notify?.();
  timingStep?.('P4e', 'blueGalaxy notify complete');

  if (typeof renderBuildingCollectionTimes === 'function') {
    renderBuildingCollectionTimes();
  }
  timingStep?.('P4g', 'building collection render complete');

  aggregateCityStats({
    City,
    fpBuildings: entityResult.fpBuildings,
    goodsList: entityResult.goodsList,
    ResourceDefs: resDefs,
    Goods: goodsObj,
    specialGoods: SPECIAL_GOODS,
    helper: helperInstance,
    tooltipHTML,
    fGoodsHTML,
  });

  timingStep?.('P4h', 'goods and FP tooltip grouping complete');
  const clanGoods =
    typeof buildClanGoodsData === 'function' ? buildClanGoodsData() : 0;
  timingStep?.('P4i', 'clan goods aggregation complete');
  timingStep?.('P4j', 'goods era tally and HTML complete');

  return {
    buildingsReady: entityResult.buildingsReady || [],
    fpBuildings: entityResult.fpBuildings || [],
    goodsBuildings: entityResult.goodsBuildings || [],
    clanGoodsBuildings: entityResult.clanGoodsBuildings || [],
    goodsList: entityResult.goodsList || {},
    clanPower: entityResult.clanPower || 0,
    clanGoods,
    totalGoods: entityResult.totalGoods || 0,
    aidStats: entityResult.aidStats,
  };
}

function ensureCitystatsContainer() {
  let el =
    typeof document !== 'undefined' ?
      document.getElementById('citystats')
    : null;
  if (!el && typeof document !== 'undefined') {
    el = document.createElement('div');
    const root =
      document.getElementById('content') ||
      document.body ||
      document.documentElement;
    if (root) root.insertBefore(el, root.childNodes[0] || null);
    el.id = 'citystats';
  }
  return el;
}

module.exports = {
  coordinateStartupEntities,
  ensureCitystatsContainer,
  fEntityName,
};
module.exports.default = module.exports;
