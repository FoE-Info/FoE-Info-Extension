/**
 * VisitedCityStatsCalculator.js
 *
 * Lean calculation orchestrator for visited player cities.
 * Assumes 100% aided daily yield (theoretical max layout potential)
 * with strict isolation from player's active city state.
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

class VisitedCityStatsCalculator {
  constructor(store = defaultMetadataStore) {
    this.metadataStore = store;
  }

  calculateVisitedCityStats({
    entities = [],
    playerEra = 'SpaceAgeTitan',
    metadataStore = this.metadataStore,
  } = {}) {
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
    let krakenCritPercent = new BigNumber(0);

    let clanPower = new BigNumber(0);
    let clanSOHcount = 0;
    let clanHOFcount = 0;

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

      if (entityId.startsWith('R_MultiAge_Battlegrounds')) {
        clanSOHcount++;
      } else if (entityId.startsWith('Z_MultiAge_CupBonus')) {
        clanHOFcount++;
      }

      if (isGB) {
        const special = extractSpecialBonuses({ entity, meta, level });
        if (special.arcBonusPercent) arcBonusPercent = special.arcBonusPercent;
        if (special.chatBonusPercent)
          chatBonusPercent = special.chatBonusPercent;
        if (special.aoCritPercent) aoCritPercent = special.aoCritPercent;
        if (special.krakenCritPercent)
          krakenCritPercent = special.krakenCritPercent;

        if (entity.bonus?.type && entity.bonus.value != null) {
          tallySingleBoost(entity.bonus, rawBoosts, qiBoosts, prodBoosts);
        }
      }

      const prodResources = extractEntityProduction(entity, meta, bEra, true);

      if (prodResources.money)
        baseCoins = baseCoins.plus(toBigNumber(prodResources.money));
      if (prodResources.supplies)
        baseSupplies = baseSupplies.plus(toBigNumber(prodResources.supplies));
      if (prodResources.strategy_points) {
        const fpAmount = toBigNumber(prodResources.strategy_points);
        if (isGB) baseUnboostableFP = baseUnboostableFP.plus(fpAmount);
        else baseBoostableFP = baseBoostableFP.plus(fpAmount);
      }
      if (prodResources.clan_power) {
        clanPower = clanPower.plus(toBigNumber(prodResources.clan_power));
      }

      processEntityGoods({
        prodResources,
        accum: goodsAccum,
        playerEra,
        prevEra,
        nextEra,
        store,
      });
      processEntityUnits({ entity, meta, prodResources, accum: unitsAccum });
      extractEntityBoosts(entity, meta, rawBoosts, qiBoosts, prodBoosts, bEra);
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
    const dailyRemainder = unitsAccum.dailyUnits.minus(unitsAccum.trazUnits);

    return Object.freeze({
      coins: prodResult.coins,
      supplies: prodResult.supplies,
      fp: prodResult.fp,
      goods: goodsResult,
      units: {
        daily:
          dailyRemainder.isGreaterThan(0) ? dailyRemainder : new BigNumber(0),
        traz: unitsAccum.trazUnits,
        total: unitsAccum.dailyUnits,
      },
      military,
      special: {
        arcPercent: arcBonusPercent,
        chatBonus: chatBonusPercent,
        goodsPerQuest,
        qiBoosts,
        aoCriticalStrike: aoCritPercent,
        krakenCriticalStrike: krakenCritPercent,
      },
      clan: {
        power: clanPower,
        sohCount: clanSOHcount,
        hofCount: clanHOFcount,
      },
    });
  }
}

const visitedCityStatsCalculator = new VisitedCityStatsCalculator();

module.exports = {
  VisitedCityStatsCalculator,
  visitedCityStatsCalculator,
  calculateVisitedCityStats:
    visitedCityStatsCalculator.calculateVisitedCityStats.bind(
      visitedCityStatsCalculator,
    ),
};
module.exports.default = visitedCityStatsCalculator;
