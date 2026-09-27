/**
 * StartupService.js
 *
 * Unified Startup RPC service orchestrating initial city and player ingestion,
 * city map entity processing, bonus aggregation, live boost coordination,
 * and deferred metadata-gated rendering.
 */

const {
  addResourceTotal,
  boostedForgePoints,
  toBigNumber,
} = require('../calc/utils/bignumberUtils.js');
const { SPECIAL_GOODS } = require('../calc/goods/goodsClassification.js');
const {
  buildClanGoodsData: buildClanGoodsDataImpl,
  fGoodsHTML,
} = require('../calc/goodsTooltipFormatter.js');
const { processCityMapEntities } = require('../calc/CityMapEntityProcessor.js');

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
let formatLiveName = (name) => name;
try {
  ({ formatLiveName } = require('../fn/liveNameResolver.js'));
} catch {}

let Popover = null;
try {
  const bootstrap = require('bootstrap');
  Popover = bootstrap.Popover;
} catch {}

let updateActivePopoverContent = null;
try {
  ({
    updateActivePopoverContent,
  } = require('../ui/components/PopoverManager.js'));
} catch {}

let recalculateAidStatsBoosts = null;
try {
  ({
    recalculateAidStatsBoosts,
  } = require('../calc/prod/DailyProductionAidCalculator.js'));
} catch {}

let parseUserAccount = (u) => u || {};
try {
  ({ parseUserAccount } = require('../parsers/accountParser.js'));
} catch {}

let resolvePlayerScore = () => {};
try {
  ({ resolvePlayerScore } = require('../state/playerScoreResolver.js'));
} catch {}

let yieldToMain = async () => {};
try {
  const scheduler = require('../utils/scheduler.js');
  if (typeof scheduler.yieldToMain === 'function') {
    yieldToMain = scheduler.yieldToMain;
  }
} catch {}

const { blueGalaxyState } = require('../state/CityDomainState.js');
const { City } = require('../state/CityDomainState.js');
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
const { emissaryService } = require('./EmissaryService.js');

let resetDailyBonusAccumulator = () => {};
try {
  ({ resetDailyBonusAccumulator } = require('./BonusService.js'));
} catch {}
const logger = createLogger('StartupService');

// --- Module-Level State ---

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

// --- Render Barrier State ---
let activeRenderRun = 0;
let renderPending = false;
let activeRenderTimer = null;

// ============================================================================
// 1. STATE INITIALIZATION & TIMING
// ============================================================================

/**
 * Parses user account data and initializes player state upon startup.
 */
function initStartupUser(msg, options = {}) {
  const user = msg?.responseData ? msg.responseData.user_data : null;
  const log = options.logger || logger;
  if (!user) {
    log.error('startupService received payload without user_data', msg);
    return null;
  }

  const parsedUser = parseUserAccount(user);
  const stateObj = options.state;
  const setScoreFn = options.setMyScore || stateObj?.setMyScore;
  const renderStatsFn = options.renderLiveCityStats;
  const setInfoFn = options.setMyInfo || stateObj?.setMyInfo;
  const setIgnoredFn = options.setIgnoredPlayers || stateObj?.setIgnoredPlayers;
  const helperObj = options.helper;
  const galaxyState = options.blueGalaxyState || blueGalaxyState;
  const clearUnitsFn = options.clearArmyUnits;

  resolvePlayerScore(parsedUser, user, {
    setMyScore: setScoreFn,
    renderLiveCityStats: () => renderStatsFn?.(),
  });
  user.score = parsedUser.score;

  if (typeof setInfoFn === 'function') {
    setInfoFn(
      parsedUser.name,
      parsedUser.id,
      parsedUser.clan,
      parsedUser.clanId,
      parsedUser.createdAt,
      parsedUser.era,
      parsedUser.score,
    );
  }

  const ignoredBy =
    msg.responseData?.ignoredByPlayerIds ||
    user?.ignoredByPlayerIds ||
    msg.responseData?.ignored_by_player_ids;
  const ignoring =
    msg.responseData?.ignoredPlayerIds ||
    user?.ignoredPlayerIds ||
    msg.responseData?.ignored_player_ids;
  if ((ignoredBy || ignoring) && typeof setIgnoredFn === 'function') {
    setIgnoredFn(ignoredBy, ignoring);
  }

  helperObj?.setMyGuildPermissions?.(user.clan_permissions);
  clearUnitsFn?.();
  galaxyState?.reset?.();

  return user;
}

/**
 * Resets City calculation state and applies cached boosts.
 */
function resetCityStartupState(City, options = {}) {
  if (!City) return;
  const log = options.logger || logger;

  City.ForgePoints = City.baseBoostableFp = City.baseUnboostableFp = 0;
  City.TrazUnits = City.baseUnits = 0;
  City.gbAttack = City.gbDefense = City.gbCityAttack = City.gbCityDefense = 0;
  City.Coins = City.Supplies = City.CoinBoost = City.SupplyBoost = 0;
  City.Attack = City.Defense = City.CityAttack = City.CityDefense = 0;
  City.ArcBonus = City.ChatBonus = 0;
  City.AOCriticalStrike = City.CCCriticalStrike = City.CriticalStrike = 0;

  const resetBonus =
    options.resetDailyBonusAccumulator || resetDailyBonusAccumulator;
  if (typeof resetBonus === 'function') {
    resetBonus();
  }
  if (typeof window !== 'undefined') {
    log.debug?.('window', window);
  }

  const stateObj = options.state;
  const myInfo =
    options.MyInfo !== undefined ? options.MyInfo : stateObj?.MyInfo;
  log.debug?.('user :', myInfo);

  const lang =
    options.language !== undefined ? options.language : stateObj?.language;
  if (
    lang &&
    lang !== 'auto' &&
    typeof $ !== 'undefined' &&
    typeof $.i18n === 'function'
  ) {
    $.i18n({
      locale: lang,
    });
    log.debug?.(lang, $.i18n().locale, $.i18n.debug);
  }

  const isDev =
    options.DEV !== undefined ? options.DEV
    : typeof DEV !== 'undefined' ? DEV
    : false;
  const removeDebugFn = options.removeDebug || stateObj?.removeDebug;
  if (!isDev && typeof removeDebugFn === 'function') {
    removeDebugFn();
  }

  const applyBoostsFn = options.applyBoostsToCity;
  if (options.lastBoostsMsg && typeof applyBoostsFn === 'function') {
    applyBoostsFn(options.lastBoostsMsg, City);
  }
}

/**
 * Calculates attack and defense combat totals combining raw boosts and GB stats.
 */
function updateCombatTotals(targetCity = City) {
  if (!targetCity) return;
  targetCity.Attack =
    (targetCity.rawBoostAttack || 0) + (targetCity.gbAttack || 0);
  targetCity.Defense =
    (targetCity.rawBoostDefense || 0) + (targetCity.gbDefense || 0);
  targetCity.CityAttack =
    (targetCity.rawBoostCityAttack || 0) + (targetCity.gbCityAttack || 0);
  targetCity.CityDefense =
    (targetCity.rawBoostCityDefense || 0) + (targetCity.gbCityDefense || 0);
}

function initializeStartupSession(msg, options = {}) {
  const user = initStartupUser(msg, options);
  if (!user) return null;
  resetCityStartupState(options.City, options);
  return user;
}

function createTimingTracker(loggerInstance, timingRun, requestId) {
  const debugEnabled = isDebugEnabled();
  const timingStart = performance.now();
  let timingPrevious = timingStart;
  const timingStep = (phase, step) => {
    if (!debugEnabled) return;
    const now = performance.now();
    loggerInstance.info(
      `[TIMING:${phase}] ${step} | t = ${now.toFixed(2)}ms | run = ${timingRun} | requestId = ${requestId} | stepMs = ${(now - timingPrevious).toFixed(2)} | totalMs = ${(now - timingStart).toFixed(2)}`,
    );
    timingPrevious = now;
  };
  return { debugEnabled, timingStep };
}

function createStartupContext({
  user,
  entityResult,
  state: stateObj,
  collapse: collapseObj,
  fpBuildings,
  goodsBuildings,
  tooltipHTML,
}) {
  return {
    user,
    clanGoods: entityResult.clanGoods,
    clanPower: entityResult.clanPower,
    availablePacksFP: stateObj?.availablePacksFP,
    collapseStats: collapseObj?.collapseStats,
    fpBuildings,
    goodsBuildings,
    aidStats: entityResult.aidStats,
    tooltipHTML: {
      fp: tooltipHTML.fp,
      clanGoods: tooltipHTML.clanGoods,
      goods: tooltipHTML.goods,
    },
  };
}

// ============================================================================
// 2. ENTITY RESOLUTION & AGGREGATION
// ============================================================================

function fEntityName(entity, helperObj) {
  const def = helperObj?.getCityEntityDef?.(entity);
  return def && def.name ? def.name : entity;
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

/**
 * Aggregates daily Forge Point and goods building tallies for the City Info tooltips.
 */
function aggregateCityStats({
  City,
  fpBuildings = [],
  goodsList = {},
  ResourceDefs: rDefs = [],
  Goods = {},
  specialGoods = new Set(),
  helper: helperInst,
  fGoodsHTML: goodsHtmlFn = fGoodsHTML,
  // Injectable so a test can assert the rendered values without depending on
  // whichever locale the dictionary happens to hold.
  tooltipHTML: tipHtml,
  t: tFn = t,
}) {
  if (fpBuildings.length > 0) {
    const groupedFp = {};
    let baseBoostableFp = 0;
    let baseUnboostableFp = 0;

    fpBuildings.forEach((entry) => {
      const name =
        helperInst?.fEntityNameTrim?.(entry.id || entry.name) ||
        entry.name ||
        'Unknown Building';
      if (!groupedFp[name]) {
        groupedFp[name] = { count: 0, totalFp: 0 };
      }
      groupedFp[name].count++;
      groupedFp[name].totalFp = addResourceTotal(
        groupedFp[name].totalFp,
        entry.fp,
      );
      if (entry.isBoostable) {
        baseBoostableFp = addResourceTotal(baseBoostableFp, entry.fp);
      } else {
        baseUnboostableFp = addResourceTotal(baseUnboostableFp, entry.fp);
      }
    });

    City.baseBoostableFp = baseBoostableFp;
    City.baseUnboostableFp = baseUnboostableFp;
    const unboostedBaseTotal = toBigNumber(baseBoostableFp)
      .plus(baseUnboostableFp)
      .toNumber();
    // This is the last write on startup: only this pass has the freshly
    // harvested fpBuildings, whereas the cached boost callback runs earlier.
    const finalTotalFp =
      City.fpProductionBoost > 0 ?
        boostedForgePoints(
          baseBoostableFp,
          baseUnboostableFp,
          City.fpProductionBoost,
        ).total.toNumber()
      : unboostedBaseTotal;
    City.ForgePoints = finalTotalFp;

    const groupedFpList = Object.keys(groupedFp).map((name) => ({
      name,
      count: groupedFp[name].count,
      totalFp: groupedFp[name].totalFp,
    }));

    groupedFpList.sort((a, b) => b.totalFp - a.totalFp);

    tipHtml.fp = ``;
    groupedFpList.forEach((item) => {
      const countStr = item.count > 1 ? ` (x${item.count})` : ``;
      tipHtml.fp += `${item.totalFp}FP <strong>${item.name}</strong>${countStr}<br>`;
    });

    if (City.fpProductionBoost > 0) {
      tipHtml.fp += `<br><strong data-fp-boost>${tFn('fp_boost_breakdown', unboostedBaseTotal, City.fpProductionBoost, finalTotalFp)}</strong>`;
    }
  }

  Object.keys(Goods).forEach((era) => {
    Goods[era] = 0;
  });

  Object.keys(goodsList).forEach((good) => {
    if (specialGoods.has(good)) return;
    let rssName;
    (rDefs || []).forEach((resource) => {
      if (resource.id === good && !specialGoods.has(resource.id)) {
        rssName = resource.name;
        helperInst?.fGoodsTally?.(resource.era, goodsList[good]);
        if (!tipHtml.goods[resource.era]) tipHtml.goods[resource.era] = '';
        tipHtml.goods[resource.era] += `${goodsList[good]} ${rssName}<br>`;
      }
    });
  });

  let goodsHTML = '';
  const numAges = helperInst?.numAges || 0;
  for (let index = 0; index < numAges; index++) {
    const age = helperInst
      ?.fGVGagesname?.(helperInst.fAgefromLevel(numAges - index))
      ?.toLowerCase();
    if (age && Goods[age]) goodsHTML += goodsHtmlFn(age, tipHtml.goods);
  }

  return { goodsHTML };
}

/**
 * Coordinates processing of city map entities, bonus aggregation,
 * combat totals, and city stats tooltips during startup.
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

// ============================================================================
// 3. BOOST COORDINATION
// ============================================================================

function subscribeBoostUpdates(onUpdate) {
  if (typeof onUpdate !== 'function') return false;
  try {
    const { boostService } = require('./BoostService.js');
    if (boostService && typeof boostService.onBoostsUpdated === 'function') {
      boostService.onBoostsUpdated(onUpdate);
      return true;
    }
  } catch (err) {
    logger.warn('failed to subscribe to live boost updates', err);
  }
  return false;
}

function handleBoostServiceAllBoosts({
  msg,
  City,
  updateCombatTotals,
  tooltipHTML,
  clanGoodsBuildings,
  buildClanGoodsData,
  lastStartupContext,
  renderLiveCityStats,
}) {
  applyBoostsToCity(msg, City);

  if (typeof updateCombatTotals === 'function') {
    updateCombatTotals();
  }

  if (City.fpProductionBoost) {
    const totalBase = toBigNumber(City.baseBoostableFp).plus(
      toBigNumber(City.baseUnboostableFp),
    );
    if (totalBase.isGreaterThan(0)) {
      City.ForgePoints = boostedForgePoints(
        City.baseBoostableFp,
        City.baseUnboostableFp,
        City.fpProductionBoost,
      ).total.toNumber();
    }
    const fpSpan =
      typeof document !== 'undefined' ? document.getElementById('fp') : null;
    if (fpSpan) {
      fpSpan.innerHTML = `<span data-i18n="daily">Daily</span>: ${City.ForgePoints}FP`;
      // The marker attribute, not the English wording: the breakdown is
      // localized, so a text search for "Boost =" would re-append it in every
      // locale whose dictionary does not contain that literal.
      if (tooltipHTML?.fp && !tooltipHTML.fp.includes('data-fp-boost')) {
        tooltipHTML.fp += `<br><strong data-fp-boost>${t('fp_boost_breakdown', totalBase.toString(), City.fpProductionBoost, City.ForgePoints)}</strong>`;
        fpSpan.setAttribute('data-bs-content', tooltipHTML.fp);
        if (typeof updateActivePopoverContent === 'function') {
          updateActivePopoverContent(fpSpan, tooltipHTML.fp);
        }
        const popover =
          Popover?.getInstance ? Popover.getInstance(fpSpan) : null;
        if (popover) {
          popover.setContent({ '.popover-body': tooltipHTML.fp });
        }
      }
    }
  }

  if (
    clanGoodsBuildings?.length > 0 &&
    typeof buildClanGoodsData === 'function'
  ) {
    const boostedClanGoods = buildClanGoodsData();
    if (lastStartupContext) {
      lastStartupContext.clanGoods = boostedClanGoods;
      if (!lastStartupContext.tooltipHTML) lastStartupContext.tooltipHTML = {};
      lastStartupContext.tooltipHTML.clanGoods = tooltipHTML?.clanGoods;
    }
    const clanSpan =
      typeof document !== 'undefined' ?
        document.getElementById('clanGoods')
      : null;
    if (clanSpan) {
      clanSpan.innerHTML = `<span data-i18n="guildgoods">Guild Goods</span>: ${boostedClanGoods}`;
      clanSpan.setAttribute('data-bs-content', tooltipHTML?.clanGoods);
    }
  }

  const currentBoosts = {
    fp: City.fpProductionBoost || 0,
    goods: City.goodsProductionBoost || 0,
    guildGoods: City.guildGoodsProductionBoost || 0,
    coin: City.CoinBoost || 0,
    supply: City.SupplyBoost || 0,
  };

  if (City.aidStats && typeof recalculateAidStatsBoosts === 'function') {
    recalculateAidStatsBoosts(City.aidStats, currentBoosts);
    if (City.aidStats.max?.coins && City.aidStats.max.coins.gt(0)) {
      City.Coins = City.aidStats.max.coins.toNumber();
    }
    if (City.aidStats.max?.supplies && City.aidStats.max.supplies.gt(0)) {
      City.Supplies = City.aidStats.max.supplies.toNumber();
    }
    if (City.aidStats.max?.fp && City.aidStats.max.fp.gt(0)) {
      City.ForgePoints = City.aidStats.max.fp.toNumber();
    }
  }

  if (
    lastStartupContext?.aidStats &&
    lastStartupContext.aidStats !== City.aidStats &&
    typeof recalculateAidStatsBoosts === 'function'
  ) {
    recalculateAidStatsBoosts(lastStartupContext.aidStats, currentBoosts);
  }

  if (typeof renderLiveCityStats === 'function') {
    renderLiveCityStats();
  }
}

// ============================================================================
// 4. RENDER ORCHESTRATION & METADATA BARRIER
// ============================================================================

function renderWhenStartupReady(render) {
  if (!renderPending) return render();
}

function detectMissingCityEntities(msg, getCityEntityDef) {
  if (
    !msg?.responseData?.city_map?.entities ||
    !Array.isArray(msg.responseData.city_map.entities) ||
    typeof getCityEntityDef !== 'function'
  ) {
    return [];
  }
  try {
    return msg.responseData.city_map.entities
      .map((e) => e && e.cityentity_id)
      .filter((cid) => cid && !getCityEntityDef(cid));
  } catch (err) {
    console.warn('Failed to detect missing city entities from map:', err);
    return [];
  }
}

function scheduleStartupRender({
  msg,
  timingRun,
  citystats,
  renderLiveCityStats,
  resolveMissingCityEntities,
  onResolved,
  getCityEntityDef,
  logger,
  loadingText = 'Loading metadata...',
  translateContainer,
  fallbackTimeoutMs = 3000,
}) {
  const run = ++activeRenderRun;
  clearTimeout(activeRenderTimer);
  renderPending = false;
  const gateStart = performance.now();
  const missing = detectMissingCityEntities(msg, getCityEntityDef);
  const traceGate = (phase, state) =>
    logger?.info?.(
      `[TIMING:${phase}] metadata gate ${state} | t = ${performance.now().toFixed(2)}ms | run = ${timingRun} | requestId = ${msg?.requestId} | missingInstances = ${missing.length} | uniqueIds = ${new Set(missing).size} | elapsedMs = ${(performance.now() - gateStart).toFixed(2)}`,
    );
  traceGate('P5g', 'scanned original startup city_map');

  if (missing.length > 0 && typeof resolveMissingCityEntities === 'function') {
    renderPending = true;
    if (citystats) {
      startupRenderState.setMetadataLoading({
        container: citystats,
        options: { loadingText, translateContainer },
      });
    }
    traceGate('P5g', 'loading placeholder installed; starting resolver');

    let resolved = false;
    let fallbackRendered = false;
    const renderFallback = () => {
      if (fallbackRendered || run !== activeRenderRun) return;
      fallbackRendered = true;
      renderPending = false;
      traceGate('P6g', 'fallback render');
      if (typeof renderLiveCityStats === 'function') renderLiveCityStats();
    };
    const fallbackTimer = (activeRenderTimer = setTimeout(() => {
      if (resolved || run !== activeRenderRun) return;
      logger?.warn('Metadata resolution timed out for entities:', missing);
      traceGate('P5g', 'resolver still pending; retaining loading placeholder');
    }, fallbackTimeoutMs));

    const handleFailure = (err) => {
      if (resolved || run !== activeRenderRun) return;
      resolved = true;
      clearTimeout(fallbackTimer);
      traceGate('P6g', 'resolver failed');
      logger?.warn('Failed to resolve missing city entities from map:', err);
      renderFallback();
    };

    try {
      const pending = resolveMissingCityEntities(missing, () => {
        if (resolved || run !== activeRenderRun) return;
        resolved = true;
        clearTimeout(fallbackTimer);
        renderPending = false;
        traceGate(
          'P6g',
          `resolver callback; fallbackRendered = ${fallbackRendered}`,
        );
        logger?.info(
          `[TIMING:P6] StartupRenderOrchestrator: metadata resolved/ready | t = ${performance.now().toFixed(2)}ms`,
        );
        if (typeof onResolved === 'function') {
          onResolved();
        } else if (typeof renderLiveCityStats === 'function') {
          renderLiveCityStats();
        }
      });
      if (pending && typeof pending.then === 'function') {
        Promise.resolve(pending).then(() => {
          if (resolved || run !== activeRenderRun) return;
          resolved = true;
          clearTimeout(fallbackTimer);
          traceGate('P6g', 'resolver settled without metadata updates');
          renderFallback();
        }, handleFailure);
      }
    } catch (err) {
      handleFailure(err);
    }
  } else {
    traceGate('P6g', 'no missing entities; direct render');
    if (typeof renderLiveCityStats === 'function') {
      renderLiveCityStats();
    }
  }
}

function subscribeMetadataRenders({
  metadataStore,
  isDebugEnabled,
  logger,
  getTimingRun,
  onRenderBuildingCollectionTimes,
  onRenderGalaxy,
  onRenderLiveCityStats,
}) {
  if (
    !metadataStore ||
    typeof metadataStore.subscribe !== 'function' ||
    typeof onRenderLiveCityStats !== 'function'
  ) {
    return null;
  }

  let metadataRenderTimer = null;
  return metadataStore.subscribe(() => {
    if (metadataRenderTimer) return;
    metadataRenderTimer = setTimeout(async () => {
      metadataRenderTimer = null;
      if (typeof isDebugEnabled === 'function' && isDebugEnabled()) {
        logger?.info(
          `[TIMING:P6s] metadata subscription render timer fired | t = ${performance.now().toFixed(2)}ms | run = ${getTimingRun?.()}`,
        );
      }
      try {
        onRenderBuildingCollectionTimes();
      } catch (err) {
        console.error(
          '[FoEInfo] Failed to re-render building collection times:',
          err,
        );
      }
      await yieldToMain();
      try {
        onRenderGalaxy();
      } catch (err) {
        console.error('[FoEInfo] Failed to re-render galaxy:', err);
      }
      await yieldToMain();
      try {
        onRenderLiveCityStats();
      } catch (err) {
        console.error('[FoEInfo] Failed to re-render city stats:', err);
      }
    }, 50);
  });
}

// ============================================================================
// 5. MAIN STARTUP SERVICE DISPATCHER & LIFECYCLE
// ============================================================================

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

// export function renderBuildingCollectionTimes
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
  // Aggregator
  aggregateCityStats,
  // Boost Coordinator
  handleBoostServiceAllBoosts,
  subscribeBoostUpdates,
  // Entity Coordinator
  coordinateStartupEntities,
  ensureCitystatsContainer,
  fEntityName,
  // Render Orchestrator
  detectMissingCityEntities,
  scheduleStartupRender,
  renderWhenStartupReady,
  subscribeMetadataRenders,
  // State Initializer
  initStartupUser,
  resetCityStartupState,
  initializeStartupSession,
  createTimingTracker,
  createStartupContext,
  get lastStartupMsg() {
    return lastStartupMsg;
  },
  get lastBoostsMsg() {
    return lastBoostsMsg;
  },
};
module.exports.default = module.exports;
