/**
 * CityStatsCalculator.js
 *
 * Lean calculation orchestrator for player's own city.
 * Delegates to modular sub-calculators (boosts, prod, goods, units, utils)
 * while preserving 100% calculation and schema parity with BigNumber precision.
 */

const BigNumber = require('bignumber.js');
const metadataStorePkg = require('../state/MetadataStore.js');
const {
  getPreviousEra,
  getNextEra,
  getBuildingEra,
} = require('./utils/eraUtils.js');
const { toBigNumber } = require('./utils/bignumberUtils.js');
const { computeSetAdjacencies } = require('./utils/spatialUtils.js');
const {
  createRawBoosts,
  createQiBoosts,
  createProdBoosts,
  extractEntityBoosts,
  formatMilitaryBoosts,
  tallySingleBoost,
} = require('./boosts/MilitaryBoostCalculator.js');
const {
  extractEntityProduction,
  applyProductionBoosts,
} = require('./prod/ProductionCalculator.js');
const {
  createGoodsAccumulator,
  processEntityGoods,
  finalizeGoods,
} = require('./goods/GoodsCalculator.js');
const {
  createUnitsAccumulator,
  processEntityUnits,
  extractSpecialBonuses,
  computeChateauGoods,
} = require('./units/UnitCalculator.js');

const defaultMetadataStore = metadataStorePkg.metadataStore;

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('CityStatsCalc');
} catch {}

class CityStatsCalculator {
  constructor(store = defaultMetadataStore) {
    this.metadataStore = store;
  }

  calculateCityStats({
    entities = [],
    playerEra = 'SpaceAgeTitan',
    boosts = null,
    metadataStore = this.metadataStore,
  } = {}) {
    logger?.debug('Starting city stats calculation', {
      entityCount: entities?.length,
      playerEra,
    });
    const store = metadataStore || defaultMetadataStore;
    const prevEra = getPreviousEra(playerEra);
    const nextEra = getNextEra(playerEra);

    let baseCoins = new BigNumber(0);
    let baseSupplies = new BigNumber(0);
    let baseBoostableFP = new BigNumber(0);
    let baseUnboostableFP = new BigNumber(0);

    let arcBonusPercent = new BigNumber(0);
    let chatBonusPercent = new BigNumber(0);
    let aoCritPercent = new BigNumber(0);
    let ccCritPercent = new BigNumber(0);

    const rawBoosts = createRawBoosts();
    const qiBoosts = createQiBoosts();
    const prodBoosts = createProdBoosts();
    const goodsAccum = createGoodsAccumulator();
    const unitsAccum = createUnitsAccumulator();

    computeSetAdjacencies(entities, store);

    for (const entity of entities) {
      if (!entity || !entity.cityentity_id) continue;
      const entityId = entity.cityentity_id;
      const meta = store.getEntity(entityId);
      const isGB =
        entity.type === 'greatbuilding' ||
        meta?.type === 'greatbuilding' ||
        entityId.startsWith('X_');
      const level = entity.level ?? 0;
      const bEra = getBuildingEra(entity, playerEra);

      if (isGB) {
        const special = extractSpecialBonuses({ entity, meta, level });
        if (special.arcBonusPercent) arcBonusPercent = special.arcBonusPercent;
        if (special.chatBonusPercent)
          chatBonusPercent = special.chatBonusPercent;
        if (special.aoCritPercent) aoCritPercent = special.aoCritPercent;
        if (special.ccCritPercent) ccCritPercent = special.ccCritPercent;

        if (entity.bonus?.type && entity.bonus.value != null) {
          tallySingleBoost(entity.bonus, rawBoosts, qiBoosts);
        }
      }

      const prodResources = extractEntityProduction(entity, meta, bEra, false);

      if (prodResources.money)
        baseCoins = baseCoins.plus(toBigNumber(prodResources.money));
      if (prodResources.supplies)
        baseSupplies = baseSupplies.plus(toBigNumber(prodResources.supplies));
      if (prodResources.strategy_points) {
        const fpAmount = toBigNumber(prodResources.strategy_points);
        if (isGB) baseUnboostableFP = baseUnboostableFP.plus(fpAmount);
        else baseBoostableFP = baseBoostableFP.plus(fpAmount);
      }

      processEntityGoods({
        prodResources,
        accum: goodsAccum,
        playerEra,
        buildingEra: bEra,
        prevEra,
        nextEra,
        store,
        isGB,
      });
      processEntityUnits({ entity, meta, prodResources, accum: unitsAccum });
      extractEntityBoosts(entity, meta, rawBoosts, qiBoosts, prodBoosts, bEra);
    }

    if (boosts) {
      if (boosts.production) {
        if (boosts.production.coin)
          prodBoosts.coin = prodBoosts.coin.plus(
            toBigNumber(boosts.production.coin),
          );
        if (boosts.production.supply)
          prodBoosts.supply = prodBoosts.supply.plus(
            toBigNumber(boosts.production.supply),
          );
        if (boosts.production.forgePoints)
          prodBoosts.fp = prodBoosts.fp.plus(
            toBigNumber(boosts.production.forgePoints),
          );
      }
      const bList = Array.isArray(boosts) ? boosts : boosts.boosts || [];
      for (const b of bList) {
        tallySingleBoost(b, rawBoosts, qiBoosts, prodBoosts);
      }
    }

    const prodResult = applyProductionBoosts({
      baseCoins,
      baseSupplies,
      baseBoostableFP,
      baseUnboostableFP,
      coinBoostPercent: prodBoosts.coin,
      supplyBoostPercent: prodBoosts.supply,
      fpBoostPercent: prodBoosts.fp,
    });

    const goodsResult = finalizeGoods({
      accum: goodsAccum,
      goodsBoostPercent: prodBoosts.goods,
      guildGoodsBoostPercent: prodBoosts.guildGoods,
    });

    const military = formatMilitaryBoosts(rawBoosts);
    const goodsPerQuest = computeChateauGoods(chatBonusPercent);

    logger?.debug('City stats calculation completed', {
      fp: prodResult.fp?.total?.toString?.() || prodResult.fp?.total,
      dailyGoods:
        goodsResult?.totalDailyGoods?.toString?.() ||
        goodsResult?.totalDailyGoods,
      arcPercent: arcBonusPercent?.toString?.(),
    });

    return {
      coins: prodResult.coins,
      supplies: prodResult.supplies,
      fp: prodResult.fp,
      goods: goodsResult,
      units: {
        daily: unitsAccum.dailyUnits,
        traz: unitsAccum.trazUnits,
        buildings: unitsAccum.buildings,
      },
      military,
      special: {
        arcPercent: arcBonusPercent,
        chatBonus: chatBonusPercent,
        goodsPerQuest,
        qiBoosts,
        aoCriticalStrike: aoCritPercent,
        ccCriticalStrike: ccCritPercent,
      },
    };
  }
}

const cityStatsCalculator = new CityStatsCalculator();

module.exports = {
  CityStatsCalculator,
  cityStatsCalculator,
  calculateCityStats:
    cityStatsCalculator.calculateCityStats.bind(cityStatsCalculator),
};
module.exports.default = cityStatsCalculator;
