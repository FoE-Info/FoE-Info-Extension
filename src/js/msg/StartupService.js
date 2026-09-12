/** Startup data RPC service orchestrating initial city and player ingestion. */
import { processCityMapEntities } from '../calc/CityMapEntityProcessor.js';
import { fArcname, fCFname } from '../calc/gbNaming.js';
import * as element from '../fn/AddElement';
import * as collapse from '../fn/collapse.js';
import * as copy from '../fn/copy.js';
import * as helper from '../fn/helper.js';
import { t, translateContainer } from '../fn/i18n.js';
import { formatLiveName } from '../fn/liveNameResolver.js';
import { parseUserAccount } from '../parsers/accountParser.js';
import { blueGalaxyState } from '../state/BlueGalaxyState.js';
import { City } from '../state/CityState.js';
import { metadataStore } from '../state/MetadataStore.js';
import { resolvePlayerScore } from '../state/playerScoreResolver.js';
import { startupRenderState } from '../state/StartupRenderState.js';
import { showTooltips } from '../ui/cityStatsTooltips.js';
import { buildTotalGoodsTooltipHTML } from '../ui/components/cityStatsTooltipBuilder.js';
import {
  formatPlayerLabel,
  getScoreDBOrigin,
  getUserTooltipHTML,
  updateIgnoreListUI,
} from '../ui/playerTooltip.js';
import {
  renderGalaxyPanel,
  showGalaxy,
  updateGalaxy,
} from '../ui/renderGalaxyPanel.js';
import {
  buildClanGoodsData as buildClanGoodsDataImpl,
  fGoodsHTML,
  fGoodsText,
} from '../ui/renderLiveCityStats.js';
import { formatDate, formatDateTime } from '../utils/date.js';
import { createLogger, isDebugEnabled } from '../utils/logger.js';
import { showOptions } from '../vars/showOptions.js';
import * as state from '../vars/state.js';
import {
  availablePacksFP,
  checkDebug,
  CityEntityDefs,
  debug,
  EpocTime,
  Goods,
  ignoredPlayers,
  language,
  MyInfo,
  playerNameCache,
  removeDebug,
  setIgnoredPlayers,
  setMyInfo,
  setMyScore,
  updatePlayerNameCache,
} from '../vars/state.js';
import { clearArmyUnits } from './ArmyUnitManagementService.js';
import { resolveMissingCityEntities } from './MetadataService.js';
import { availableFP, ResourceDefs } from './ResourceService.js';
import {
  handleBoostServiceAllBoosts,
  subscribeBoostUpdates,
} from './StartupBoostCoordinator.js';
import { aggregateCityStats } from './StartupCityStatsAggregator.js';
import {
  renderWhenStartupReady,
  scheduleStartupRender,
  subscribeMetadataRenders,
} from './StartupRenderOrchestrator.js';

const logger = createLogger('StartupService');

export const SPECIAL_GOODS = new Set([
  'promethium',
  'orichalcum',
  'mars_ore',
  'asteroid_ice',
  'venus_carbon',
  'unknown_dna',
  'crystallized_hydrocarbons',
  'dark_matter',
  'stellar_void_shard',
  'stel_void_shard',
]);

export { City } from '../state/CityState.js';

var tooltipHTML = {
  goods: [],
  totalGoods: [],
  fp: [],
  clanGoods: [],
  clanPower: [],
  SoH: [],
  tGE: [],
};

export var Galaxy = blueGalaxyState.getLegacyShim();
blueGalaxyState.setRenderCallback(() => showGalaxy());

var buildingsReady = [];
var fpBuildings = [];
var goodsBuildings = [];
var clanGoodsBuildings = [];
let lastStartupContext = null;
export let lastStartupMsg = null;
export let lastBoostsMsg = null;
let startupTimingRun = 0;

export {
  formatPlayerLabel,
  getScoreDBOrigin,
  getUserTooltipHTML,
  updateIgnoreListUI,
} from '../ui/playerTooltip.js';

export function startupService(msg) {
  const debugEnabled = isDebugEnabled();
  const timingRun = ++startupTimingRun;
  const timingStart = performance.now();
  let timingPrevious = timingStart;
  let galaxyEntityMs = 0;
  let entityProductionMs = 0;
  let entityAbilityMs = 0;
  const unknownBonusTypes = new Map();
  const timingStep = (phase, step) => {
    if (!debugEnabled) return;
    const now = performance.now();
    logger.info(
      `[TIMING:${phase}] ${step} | t = ${now.toFixed(2)}ms | run = ${timingRun} | requestId = ${msg?.requestId} | stepMs = ${(now - timingPrevious).toFixed(2)} | totalMs = ${(now - timingStart).toFixed(2)}`,
    );
    timingPrevious = now;
  };
  logger.info(
    `[TIMING:P4] StartupService.startupService(msg) execution started | t = ${performance.now().toFixed(2)}ms | requestId = ${msg?.requestId}`,
  );
  const user = msg.responseData ? msg.responseData.user_data : null;
  if (!user) {
    console.error('startupService received payload without user_data', msg);
    return;
  }
  const parsedUser = parseUserAccount(user);
  resolvePlayerScore(parsedUser, user, {
    setMyScore,
    renderLiveCityStats: () => renderLiveCityStats(),
  });
  user.score = parsedUser.score;
  setMyInfo(
    parsedUser.name,
    parsedUser.id,
    parsedUser.clan,
    parsedUser.clanId,
    parsedUser.createdAt,
    parsedUser.era,
    parsedUser.score,
  );
  const ignoredBy =
    msg.responseData?.ignoredByPlayerIds ||
    user?.ignoredByPlayerIds ||
    msg.responseData?.ignored_by_player_ids;
  const ignoring =
    msg.responseData?.ignoredPlayerIds ||
    user?.ignoredPlayerIds ||
    msg.responseData?.ignored_player_ids;
  if (ignoredBy || ignoring) {
    setIgnoredPlayers(ignoredBy, ignoring);
  }
  helper.setMyGuildPermissions(user.clan_permissions);
  clearArmyUnits();
  blueGalaxyState.reset();
  lastStartupMsg = msg;
  buildingsReady = [];
  fpBuildings = [];
  goodsBuildings = [];
  clanGoodsBuildings = [];

  City.ForgePoints = 0;
  City.baseBoostableFp = 0;
  City.baseUnboostableFp = 0;
  City.TrazUnits = 0;
  City.baseUnits = 0;
  City.gbAttack = 0;
  City.gbDefense = 0;
  City.gbCityAttack = 0;
  City.gbCityDefense = 0;
  City.Coins = 0;
  City.Supplies = 0;
  City.CoinBoost = 0;
  City.SupplyBoost = 0;
  City.Attack = 0;
  City.Defense = 0;
  City.CityAttack = 0;
  City.CityDefense = 0;
  City.ArcBonus = 0;
  City.ChatBonus = 0;

  console.debug('window', window);

  console.debug('user :', MyInfo);
  if (language != 'auto') {
    $.i18n({
      locale: language,
    });
  }
  console.debug(language, $.i18n().locale, $.i18n.debug);

  // console.log('checkBeta:', users.checkBeta());
  if (!DEV) {
    removeDebug();
  }
  var clanPower = 0;
  var clanGoods = 0;
  var totalGoods = 0;
  var goodsList = [];
  tooltipHTML.goods = [];
  // Galaxy.html = '';
  // Galaxy.amount = 0;
  timingStep('P4a', 'startup reset and user preparation complete');

  const entityResult = processCityMapEntities(
    msg.responseData?.city_map?.entities,
    {
      City,
      CityEntityDefs,
      metadataStore,
      user,
      MyInfo,
      ResourceDefs,
      blueGalaxyState,
      Galaxy,
      helper,
      formatLiveName,
      checkDebug,
      debugEnabled,
      DEV,
      debugEl: typeof debug !== 'undefined' ? debug : null,
      fEntityName,
    },
  );

  buildingsReady = entityResult.buildingsReady;
  fpBuildings = entityResult.fpBuildings;
  goodsBuildings = entityResult.goodsBuildings;
  clanGoodsBuildings = entityResult.clanGoodsBuildings;
  goodsList = entityResult.goodsList;
  clanPower = entityResult.clanPower;
  clanGoods = entityResult.clanGoods;
  totalGoods = entityResult.totalGoods;
  galaxyEntityMs = entityResult.timing.galaxyEntityMs;
  entityProductionMs = entityResult.timing.entityProductionMs;
  entityAbilityMs = entityResult.timing.entityAbilityMs;
  for (const [k, v] of entityResult.unknownBonusTypes.entries()) {
    unknownBonusTypes.set(k, v);
  }

  timingStep(
    'P4b',
    `city entity loop complete; entities = ${msg.responseData.city_map?.entities?.length || 0}; blueGalaxy.addEntityMs = ${galaxyEntityMs.toFixed(2)}; productionAndNamesMs = ${entityProductionMs.toFixed(2)}; metadataAndAbilitiesMs = ${entityAbilityMs.toFixed(2)}`,
  );
  if (debugEnabled && unknownBonusTypes.size) {
    logger.debug(
      'Startup entity batch: unhandled bonus type counts',
      Object.fromEntries(unknownBonusTypes),
    );
  }
  City.baseUnits = City.TrazUnits;
  City.TrazUnits = (City.baseUnits || 0) + (City.emissaryUnits || 0);
  updateCombatTotals();
  if (lastBoostsMsg) {
    timingStep(
      'P4c',
      'cached boosts begin; includes early renderLiveCityStats',
    );
    boostServiceAllBoosts(lastBoostsMsg);
  }
  timingStep('P4d', 'combat totals and cached boosts complete');

  blueGalaxyState.notify();
  timingStep('P4e', 'blueGalaxy notify complete');
  // if(Galaxy.amount){
  showGalaxy();
  timingStep('P4f', 'showGalaxy complete');
  // }

  renderBuildingCollectionTimes();
  timingStep('P4g', 'building collection render complete');

  if (goodsBuildings.length > 0) {
    tooltipHTML.totalGoods = buildTotalGoodsTooltipHTML(goodsBuildings, helper);
  }

  aggregateCityStats({
    City,
    fpBuildings,
    goodsList,
    ResourceDefs,
    Goods,
    specialGoods: SPECIAL_GOODS,
    helper,
    tooltipHTML,
    fGoodsHTML,
  });

  timingStep('P4h', 'goods and FP tooltip grouping complete');
  clanGoods = buildClanGoodsData();
  timingStep('P4i', 'clan goods aggregation complete');
  timingStep('P4j', 'goods era tally and HTML complete');
  var citystats = document.getElementById('citystats');

  if (citystats == null) {
    citystats = document.createElement('div');
    var list =
      document.getElementById('content') ||
      document.body ||
      document.documentElement;
    if (list) list.insertBefore(citystats, list.childNodes[0] || null);
    citystats.id = 'citystats';
  }

  lastStartupContext = {
    user,
    clanGoods,
    clanPower,
    availablePacksFP,
    collapseStats: collapse.collapseStats,
    fpBuildings,
    goodsBuildings,
    tooltipHTML: {
      fp: tooltipHTML.fp,
      clanGoods: tooltipHTML.clanGoods,
      totalGoods: tooltipHTML.totalGoods,
      goods: tooltipHTML.goods,
    },
  };
  timingStep('P4k', 'render preparation complete; entering metadata gate');
  scheduleStartupRender({
    timingRun,
    msg,
    citystats,
    renderLiveCityStats: () => {
      renderLiveCityStats();
      if (!collapse.collapseStats) {
        document
          .getElementById('citystatsCopyID')
          ?.addEventListener('click', copy.fCityStatsCopy);
      }
      showTooltips();
      translateContainer(document.body);
    },
    resolveMissingCityEntities,
    onResolved: () => {
      timingStep(
        'P4r',
        'metadata gate callback; recomputing existing lastStartupMsg',
      );
      if (lastStartupMsg) {
        startupService(lastStartupMsg);
      } else {
        renderLiveCityStats();
        if (!collapse.collapseStats) {
          document
            .getElementById('citystatsCopyID')
            ?.addEventListener('click', copy.fCityStatsCopy);
        }
        showTooltips();
        translateContainer(document.body);
      }
    },
    getCityEntityDef: (cid) => helper.getCityEntityDef(cid),
    logger,
    loadingText: t('loading-metadata') || 'Loading metadata...',
    translateContainer,
  });
  timingStep('P4z', 'startup synchronous invocation complete');
  // console.debug('tooltipHTML:',tooltipHTML);
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
  return renderWhenStartupReady(() =>
    startupRenderState.setCityStatsContext(
      ctx || {
        lastStartupContext,
        tooltipHTML,
        fpBuildings,
        goodsBuildings,
        clanGoodsBuildings,
        getUserTooltipHTML,
        getScoreDBOrigin,
      },
    ),
  );
}

export function updateCombatTotals() {
  City.Attack = (City.rawBoostAttack || 0) + (City.gbAttack || 0);
  City.Defense = (City.rawBoostDefense || 0) + (City.gbDefense || 0);
  City.CityAttack = (City.rawBoostCityAttack || 0) + (City.gbCityAttack || 0);
  City.CityDefense =
    (City.rawBoostCityDefense || 0) + (City.gbCityDefense || 0);
}

export { emissaryService } from './EmissaryService.js';

export function boostService(msg) {}

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

export { fArcname, showGalaxy, updateGalaxy };

function fEntityName(entity) {
  const def = helper.getCityEntityDef(entity);
  return def && def.name ? def.name : entity;
}

export function renderBuildingCollectionTimes(options = {}) {
  return startupRenderState.setBuildingCollectionOptions({
    buildingsReady: options.buildingsReady || buildingsReady,
    epocTime: options.epocTime ?? EpocTime,
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
  onRenderGalaxy: showGalaxy,
  onRenderLiveCityStats: renderLiveCityStats,
});
