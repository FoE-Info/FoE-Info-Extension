/**
 * CityMapEntityProcessor.js
 *
 * Lean orchestration engine for the Forge of Empires city map. Iterates city
 * entities, delegates per-entity harvest evaluation to
 * CityEntityHarvestCalculator, and applies metadata abilities and Great
 * Building bonuses. Decoupled from StartupService.js orchestrator.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('CityMapEntityProcessor');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

const {
  createHarvestAccumulator,
  evaluateEntityHarvest,
  SPECIAL_GOODS,
} = require('./entities/CityEntityHarvestCalculator.js');

function buildResult(accum, timing) {
  return {
    buildingsReady: accum.buildingsReady,
    fpBuildings: accum.fpBuildings,
    goodsBuildings: accum.goodsBuildings,
    clanGoodsBuildings: accum.clanGoodsBuildings,
    goodsList: accum.goodsList,
    diamonds: accum.diamonds,
    clanPower: accum.clanPower,
    clanGoods: accum.clanGoods,
    totalGoods: accum.totalGoods,
    unknownBonusTypes: accum.unknownBonusTypes,
    timing,
  };
}

/**
 * Processes city_map entities from StartupService payload.
 *
 * @param {Array} mapEntities - Array of city map entity objects.
 * @param {Object} options - Configuration and dependency providers.
 * @returns {Object} Extracted production totals, ready buildings, and diagnostics.
 */
function processCityMapEntities(mapEntities, options = {}) {
  const City = options.City || {};
  const CityEntityDefs = options.CityEntityDefs || {};
  const metadataStore = options.metadataStore || null;
  const user = options.user || {};
  const MyInfo = options.MyInfo || {};
  const ResourceDefs = options.ResourceDefs || [];
  const blueGalaxyState = options.blueGalaxyState || null;
  const Galaxy = options.Galaxy || { bonus: [] };
  const helper = options.helper || {
    fEntityNameTrim: (id) => id,
    fGVGagesname: (era) => era,
  };
  const formatLiveName = options.formatLiveName || ((id, fallback) => fallback);
  const debugEnabled = options.debugEnabled ?? false;

  const accum = createHarvestAccumulator();
  accum.unknownBonusTypes = new Map();

  let galaxyEntityMs = 0;
  let entityProductionMs = 0;
  let entityAbilityMs = 0;

  if (!Array.isArray(mapEntities) || mapEntities.length === 0) {
    logger.debug('No map entities to process');
    return buildResult(accum, {
      galaxyEntityMs: 0,
      entityProductionMs: 0,
      entityAbilityMs: 0,
    });
  }

  logger.debug('Processing city map entities', { count: mapEntities.length });

  const harvestContext = {
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
    checkDebug: options.checkDebug,
    debugEnabled,
    DEV: options.DEV,
    accum,
  };

  for (let id = 0; id < mapEntities.length; id++) {
    const mapID = mapEntities[id];
    if (!mapID || !mapID.cityentity_id) continue;

    const cid = mapID.cityentity_id;

    const harvest = evaluateEntityHarvest(mapID, id, harvestContext);
    galaxyEntityMs += harvest.galaxyEntityMs;
    entityProductionMs += harvest.entityProductionMs;

    // 6. Metadata abilities & components parsing
    const entityAbilityStart = debugEnabled ? performance.now() : 0;
    const entityMeta =
      CityEntityDefs[cid] || (metadataStore && metadataStore.getEntity(cid));
    if (entityMeta) {
      const eraComp =
        entityMeta.components?.[user.era] || entityMeta.components?.AllAge;
      const allAgeComp = entityMeta.components?.AllAge;
      const compProd = eraComp?.production || allAgeComp?.production;
      if (compProd && Array.isArray(compProd.options)) {
        compProd.options.forEach((opt) => {
          const products = opt.products || opt.array || [];
          products.forEach((product) => {
            if (product.type === 'unit') {
              City.TrazUnits = (City.TrazUnits || 0) + (product.amount || 0);
            } else if (product.type === 'genericReward') {
              const rId = product.reward?.id || '';
              const lookup =
                eraComp?.lookup?.rewards?.[rId] ||
                allAgeComp?.lookup?.rewards?.[rId];
              const isChestUnit =
                lookup?.type === 'chest' &&
                lookup.id?.includes('genb_random_') &&
                !lookup.id?.includes('fragment');
              const isUnit =
                rId.includes('unit') ||
                lookup?.type === 'unit' ||
                lookup?.icon === 'military' ||
                isChestUnit;
              if (isUnit) {
                const amount =
                  product.reward?.amount ||
                  product.reward?.totalAmount ||
                  lookup?.amount ||
                  1;
                City.TrazUnits = (City.TrazUnits || 0) + amount;
              }
            } else if (product.type === 'random') {
              const randProducts = product.products || [];
              randProducts.forEach((rp) => {
                const dropChance = rp.dropChance || 1;
                const inner = rp.product || rp;
                if (inner.type === 'unit') {
                  City.TrazUnits =
                    (City.TrazUnits || 0) +
                    Math.round((inner.amount || 0) * dropChance);
                } else if (inner.type === 'genericReward') {
                  const rId = inner.reward?.id || '';
                  const lookup =
                    eraComp?.lookup?.rewards?.[rId] ||
                    allAgeComp?.lookup?.rewards?.[rId];
                  if (
                    rId.includes('unit') ||
                    lookup?.type === 'unit' ||
                    lookup?.icon === 'military'
                  ) {
                    const amount =
                      inner.reward?.amount ||
                      inner.reward?.totalAmount ||
                      lookup?.amount ||
                      1;
                    City.TrazUnits =
                      (City.TrazUnits || 0) + Math.round(amount * dropChance);
                  }
                }
              });
            }
          });
        });
      }
    }

    if (debugEnabled) entityAbilityMs += performance.now() - entityAbilityStart;

    // 7. Great Building bonuses
    if (mapID.bonus) {
      const bType = mapID.bonus.type;
      const bVal = mapID.bonus.value || 0;
      if (bType === 'contribution_boost') {
        City.ArcBonus = bVal;
      } else if (bType === 'money_boost') {
        City.CoinBoost = (City.CoinBoost || 0) + bVal;
      } else if (bType === 'military_boost') {
        City.gbAttack = (City.gbAttack || 0) + bVal;
        City.gbDefense = (City.gbDefense || 0) + bVal;
      } else if (bType === 'advanced_tactics') {
        City.gbAttack = (City.gbAttack || 0) + bVal;
        City.gbDefense = (City.gbDefense || 0) + bVal;
        City.gbCityAttack = (City.gbCityAttack || 0) + bVal;
        City.gbCityDefense = (City.gbCityDefense || 0) + bVal;
      } else if (bType === 'fierce_resistance') {
        City.gbCityAttack = (City.gbCityAttack || 0) + bVal;
        City.gbCityDefense = (City.gbCityDefense || 0) + bVal;
      } else if (bType === 'quest_boost') {
        City.ChatBonus = bVal;
      } else if (debugEnabled) {
        accum.unknownBonusTypes.set(
          bType,
          (accum.unknownBonusTypes.get(bType) || 0) + 1,
        );
      }
    }

    if (!harvest.found) {
      accum.uncountedEntitiesCount = (accum.uncountedEntitiesCount || 0) + 1;
    }
  }

  logger.debug('City map entities processed successfully', {
    readyCount: accum.buildingsReady.length,
    fpBuildingsCount: accum.fpBuildings.length,
    goodsBuildingsCount: accum.goodsBuildings.length,
    clanGoodsBuildingsCount: accum.clanGoodsBuildings.length,
    clanGoods: accum.clanGoods,
    clanPower: accum.clanPower,
    diamonds: accum.diamonds,
    uncountedEntitiesCount: accum.uncountedEntitiesCount,
  });

  return buildResult(accum, {
    galaxyEntityMs,
    entityProductionMs,
    entityAbilityMs,
  });
}

module.exports = {
  processCityMapEntities,
  SPECIAL_GOODS,
};
module.exports.default = module.exports;
