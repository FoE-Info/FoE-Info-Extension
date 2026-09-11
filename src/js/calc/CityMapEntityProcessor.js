/**
 * CityMapEntityProcessor.js
 *
 * Pure calculation and entity iteration engine for Forge of Empires city map.
 * Extracts readiness timestamps, production amounts (FP, goods, coins, supplies, diamonds),
 * guild treasury contributions, unit recruitment abilities, and Great Building boosts.
 * Decoupled from StartupService.js orchestrator.
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

const SPECIAL_GOODS = new Set([
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
  const checkDebug = options.checkDebug || (() => false);
  const appendBetaText = options.appendBetaText || (() => {});
  const debugEnabled = options.debugEnabled ?? false;
  const DEV = options.DEV ?? false;
  const debugEl = options.debugEl || null;
  const fEntityName = options.fEntityName || ((id) => id);

  const buildingsReady = [];
  const fpBuildings = [];
  const goodsBuildings = [];
  const clanGoodsBuildings = [];
  const goodsList = {};
  let diamonds = 0;
  let clanPower = 0;
  let clanGoods = 0;
  let totalGoods = 0;
  let uncountedEntitiesCount = 0;
  const unknownBonusTypes = new Map();

  let galaxyEntityMs = 0;
  let entityProductionMs = 0;
  let entityAbilityMs = 0;

  if (!Array.isArray(mapEntities) || mapEntities.length === 0) {
    logger.debug('No map entities to process');
    return {
      buildingsReady,
      fpBuildings,
      goodsBuildings,
      clanGoodsBuildings,
      goodsList,
      diamonds,
      clanPower,
      clanGoods,
      totalGoods,
      unknownBonusTypes,
      timing: {
        galaxyEntityMs: 0,
        entityProductionMs: 0,
        entityAbilityMs: 0,
      },
    };
  }

  logger.debug('Processing city map entities', { count: mapEntities.length });

  for (let id = 0; id < mapEntities.length; id++) {
    const mapID = mapEntities[id];
    if (!mapID || !mapID.cityentity_id) continue;

    let forgePoints = 0;
    let found = false;

    // 1. Blue Galaxy integration
    if (blueGalaxyState && typeof blueGalaxyState.addEntity === 'function') {
      const galaxyEntityStart = debugEnabled ? performance.now() : 0;
      blueGalaxyState.addEntity(
        mapID,
        metadataStore,
        (eid) => formatLiveName(eid, helper.fEntityNameTrim(eid)),
        false,
      );
      if (debugEnabled) galaxyEntityMs += performance.now() - galaxyEntityStart;
    }

    const entityProductionStart = debugEnabled ? performance.now() : 0;

    // 2. SummerBonus20 / CulturalBuilding abilities
    const cid = mapID.cityentity_id;
    if (
      cid.startsWith('R_MultiAge_SummerBonus20') ||
      cid.startsWith('R_MultiAge_CulturalBuilding')
    ) {
      const entity =
        CityEntityDefs[cid] || (metadataStore && metadataStore.getEntity(cid));
      if (entity && Array.isArray(entity.abilities)) {
        const randomUnitAb = entity.abilities.find(
          (a) => a && a.__class__ === 'RandomUnitOfAgeWhenMotivatedAbility',
        );
        if (randomUnitAb && randomUnitAb.amount) {
          City.TrazUnits = (City.TrazUnits || 0) + randomUnitAb.amount;
        }

        const treasuryAb = entity.abilities.find(
          (a) => a && a.__class__ === 'AddResourcesToGuildTreasuryAbility',
        );
        if (treasuryAb && treasuryAb.additionalResources) {
          const res =
            treasuryAb.additionalResources['AllAge']?.resources ||
            treasuryAb.additionalResources[MyInfo?.era]?.resources;
          if (res && res.all_goods_of_age) {
            const goods = res.all_goods_of_age * 5;
            clanGoods += goods;
            clanGoodsBuildings.push({
              id: cid,
              name: helper.fEntityNameTrim(cid),
              goods: goods,
            });
          }
        }
      }
    }

    // 3. Readiness timestamps
    if (
      mapID.state &&
      Object.prototype.hasOwnProperty.call(
        mapID.state,
        'next_state_transition_at',
      ) &&
      mapID.state.next_state_transition_at > 1000000000
    ) {
      buildingsReady.push({
        id: cid,
        name: helper.fEntityNameTrim(cid),
        ready: mapID.state.next_state_transition_at,
      });
    }

    // 4. Current product parsing
    if (mapID.state?.current_product) {
      const curProduct = mapID.state.current_product;

      // 4a. Guild product
      if (curProduct.guildProduct?.resources) {
        let goods = 0;
        let era = '';
        Object.keys(curProduct.guildProduct.resources).forEach((entry) => {
          if (entry !== 'clan_power') {
            const res = ResourceDefs.find((r) => r.id === entry);
            if (res) era = res.era;
            goods += curProduct.guildProduct.resources[entry] || 0;
          }
        });
        if (goods > 0) {
          clanGoods += goods;
          clanGoodsBuildings.push({
            id: cid,
            era: era,
            name: `${helper.fEntityNameTrim(cid)} ${helper.fGVGagesname(era)}`,
            goods: goods,
          });
        }
        if (curProduct.guildProduct.resources.clan_power) {
          clanPower += curProduct.guildProduct.resources.clan_power;
        }
      }

      // 4b. Goods property (e.g. Arc / guild GBs)
      if (
        curProduct.goods ||
        curProduct.name === 'clan_goods' ||
        curProduct.goods?.name === 'clan_goods'
      ) {
        if (
          curProduct.name === 'clan_goods' ||
          curProduct.goods?.name === 'clan_goods' ||
          curProduct.goods
        ) {
          let goods = 0;
          let gbEra = '';
          if (Array.isArray(curProduct.goods)) {
            for (let good = 0; good < curProduct.goods.length; good++) {
              const gItem = curProduct.goods[good];
              goods += gItem.value || 0;
              if (!gbEra && gItem.good_id) {
                const resDef = ResourceDefs.find((r) => r.id === gItem.good_id);
                if (resDef?.era) gbEra = resDef.era;
              }
            }
          } else if (curProduct.goods?.value) {
            goods += curProduct.goods.value;
          } else if (typeof curProduct.amount === 'number') {
            goods += curProduct.amount;
          }
          if (goods > 0) {
            clanGoods += goods;
            const eraName = gbEra || MyInfo.era;
            clanGoodsBuildings.push({
              id: cid,
              era: eraName,
              name: `${helper.fEntityNameTrim(cid)} ${helper.fGVGagesname(eraName)}`,
              goods: goods,
              baseGoods: goods,
              isBoostable: false,
            });
          }
        }
      }

      // 4c. Player resources from product
      if (curProduct.product?.resources) {
        const prodRes = curProduct.product.resources;
        if (prodRes.premium) diamonds += prodRes.premium;
        if (prodRes.strategy_points) {
          forgePoints += prodRes.strategy_points;
          if (forgePoints > 0) {
            City.ForgePoints = (City.ForgePoints || 0) + forgePoints;
            found = true;
            fpBuildings.push({
              id: cid,
              name: helper.fEntityNameTrim(cid),
              fp: forgePoints,
              isBoostable: mapID.type !== 'greatbuilding',
            });
            if (DEV && checkDebug()) {
              const trimmedName = helper.fEntityNameTrim(cid);
              if (trimmedName && trimmedName !== cid) {
                appendBetaText(
                  `<br>#${id}: ${forgePoints}FP Total: ${City.ForgePoints}FP <strong>${trimmedName}</strong>`,
                );
              } else {
                appendBetaText(
                  `<br>#${id}: <span class="pending-name" data-id="${cid}">${cid}</span> ${forgePoints}FP Total: ${City.ForgePoints}FP`,
                );
              }
            }
            if (
              mapID.type !== 'greatbuilding' &&
              Galaxy &&
              Array.isArray(Galaxy.bonus) &&
              helper.fEntityNameTrim(cid)
            ) {
              Galaxy.bonus.push({
                cityentity_id: cid,
                id: mapID.id,
                name: helper.fEntityNameTrim(cid),
                fp: prodRes.strategy_points,
                state: mapID.state.__class__,
                transition:
                  mapID.state.__class__ === 'ProducingState' ?
                    mapID.state.next_state_transition_at
                  : 0,
              });
            }
          }
        }
        if (prodRes.money) City.Coins = (City.Coins || 0) + prodRes.money;
        if (prodRes.supplies)
          City.Supplies = (City.Supplies || 0) + prodRes.supplies;

        let goods = 0;
        Object.keys(prodRes).forEach((entry) => {
          if (
            entry !== 'medals' &&
            entry !== 'money' &&
            entry !== 'supplies' &&
            entry !== 'strategy_points' &&
            entry !== 'clanPower' &&
            !SPECIAL_GOODS.has(entry)
          ) {
            const entryGoods = prodRes[entry] || 0;
            goods += entryGoods;
            if (entryGoods > 0) {
              goodsList[entry] = (goodsList[entry] || 0) + entryGoods;
            }
          }
        });
        if (goods > 0) {
          goodsBuildings.push({
            id: cid,
            name: helper.fEntityNameTrim(cid),
            goods: goods,
          });
          totalGoods += goods;
        }
      }

      if (curProduct.clan_power) clanPower += curProduct.clan_power;
      if (curProduct.asset_name === 'penal_unit') {
        City.TrazUnits = (City.TrazUnits || 0) + (curProduct.amount || 0);
      }
    }

    // 5. ProductionOption parsing (alternative payload shape)
    if (mapID.state?.productionOption) {
      const prodOpt = mapID.state.productionOption;

      if (prodOpt.guildProduct?.resources) {
        let goods = 0;
        Object.keys(prodOpt.guildProduct.resources).forEach((entry) => {
          if (entry !== 'clan_power') {
            goods += prodOpt.guildProduct.resources[entry] || 0;
          }
        });
        if (goods > 0) {
          clanGoods += goods;
          clanGoodsBuildings.push({
            id: cid,
            name: helper.fEntityNameTrim(cid),
            goods: goods,
          });
        }
        if (prodOpt.guildProduct.resources.clan_power) {
          clanPower += prodOpt.guildProduct.resources.clan_power;
        }
      }

      if (prodOpt.goods) {
        if (
          prodOpt.name === 'clan_goods' ||
          prodOpt.goods?.name === 'clan_goods'
        ) {
          let goods = 0;
          if (Array.isArray(prodOpt.goods)) {
            for (let good = 0; good < prodOpt.goods.length; good++) {
              goods += prodOpt.goods[good].value || 0;
            }
          } else if (prodOpt.goods?.value) {
            goods += prodOpt.goods.value;
          } else if (typeof prodOpt.amount === 'number') {
            goods += prodOpt.amount;
          }
          if (goods > 0) {
            clanGoods += goods;
            clanGoodsBuildings.push({
              id: cid,
              name: helper.fEntityNameTrim(cid),
              goods: goods,
            });
          }
        }
      }

      if (Array.isArray(prodOpt.products) && prodOpt.products.length > 0) {
        prodOpt.products.forEach((product) => {
          if (product?.playerResources?.resources) {
            const resources = product.playerResources.resources;
            if (resources.premium) diamonds += resources.premium;
            if (resources.strategy_points) {
              forgePoints += resources.strategy_points;
            }
            if (resources.money)
              City.Coins = (City.Coins || 0) + resources.money;
            if (resources.supplies)
              City.Supplies = (City.Supplies || 0) + resources.supplies;

            let goods = 0;
            Object.keys(resources).forEach((entry) => {
              if (
                entry !== 'medals' &&
                entry !== 'money' &&
                entry !== 'supplies' &&
                entry !== 'strategy_points' &&
                entry !== 'clanPower' &&
                !SPECIAL_GOODS.has(entry)
              ) {
                const entryGoods = resources[entry] || 0;
                goods += entryGoods;
                if (entryGoods > 0) {
                  goodsList[entry] = (goodsList[entry] || 0) + entryGoods;
                }
              }
            });
            if (goods > 0) {
              goodsBuildings.push({
                id: cid,
                name: helper.fEntityNameTrim(cid),
                goods: goods,
              });
              totalGoods += goods;
            }
          }

          const guildRes =
            product.guildResources?.resources ||
            product.guildProduct?.resources ||
            (product.type === 'guildResources' ? product.resources : null);
          if (guildRes) {
            let pClanGoods = 0;
            let gEra = '';
            let isAllGoods = false;
            Object.keys(guildRes).forEach((entry) => {
              if (entry === 'clan_power') {
                clanPower += guildRes[entry] || 0;
              } else if (typeof guildRes[entry] === 'number') {
                if (entry === 'all_goods_of_age') {
                  isAllGoods = true;
                }
                pClanGoods += guildRes[entry];
                if (!gEra && entry !== 'all_goods_of_age') {
                  const resDef = ResourceDefs.find((r) => r.id === entry);
                  if (resDef?.era) gEra = resDef.era;
                }
              }
            });
            if (pClanGoods > 0) {
              clanGoods += pClanGoods;
              clanGoodsBuildings.push({
                id: cid,
                era: gEra,
                name: helper.fEntityNameTrim(cid),
                goods: pClanGoods,
                baseGoods: pClanGoods,
                isBoostable: mapID.type !== 'greatbuilding' && isAllGoods,
              });
            }
          }
        });
      }

      if (forgePoints > 0) {
        City.ForgePoints = (City.ForgePoints || 0) + forgePoints;
        found = true;
        fpBuildings.push({
          id: cid,
          name: helper.fEntityNameTrim(cid),
          fp: forgePoints,
          isBoostable: mapID.type !== 'greatbuilding',
        });
        if (DEV && checkDebug()) {
          const trimmedName = helper.fEntityNameTrim(cid);
          if (trimmedName && trimmedName !== cid) {
            appendBetaText(
              `<br>#${id}: ${forgePoints}FP Total: ${City.ForgePoints}FP <strong>${trimmedName}</strong>`,
            );
          } else {
            appendBetaText(
              `<br>#${id}: <span class="pending-name" data-id="${cid}">${cid}</span> ${forgePoints}FP Total: ${City.ForgePoints}FP`,
            );
          }
        }
        if (
          mapID.type !== 'greatbuilding' &&
          Galaxy &&
          Array.isArray(Galaxy.bonus) &&
          helper.fEntityNameTrim(cid)
        ) {
          Galaxy.bonus.push({
            cityentity_id: cid,
            id: mapID.id,
            name: helper.fEntityNameTrim(cid),
            fp: forgePoints,
            state: mapID.state.__class__,
            transition:
              mapID.state.__class__ === 'ProducingState' ?
                mapID.state.next_state_transition_at
              : 0,
          });
        }
      }

      if (prodOpt.clan_power) clanPower += prodOpt.clan_power;
      if (prodOpt.asset_name === 'penal_unit') {
        City.TrazUnits = (City.TrazUnits || 0) + (prodOpt.amount || 0);
      }
    }

    if (debugEnabled)
      entityProductionMs += performance.now() - entityProductionStart;

    // 6. Metadata abilities & components parsing
    const entityAbilityStart = debugEnabled ? performance.now() : 0;
    const entityMeta =
      CityEntityDefs[cid] || (metadataStore && metadataStore.getEntity(cid));
    if (entityMeta) {
      if (Array.isArray(entityMeta.abilities)) {
        entityMeta.abilities.forEach((ab) => {
          if (ab?.__class__ === 'RandomUnitOfAgeWhenMotivatedAbility') {
            City.TrazUnits = (City.TrazUnits || 0) + (ab.amount || 0);
          }
        });
      }
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
                const match = rId.match(/\d+$/);
                City.TrazUnits =
                  (City.TrazUnits || 0) +
                  (product.reward?.amount ||
                    product.reward?.totalAmount ||
                    (match ? parseInt(match[0], 10) : lookup?.amount || 1));
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
                    const match = rId.match(/\d+$/);
                    City.TrazUnits =
                      (City.TrazUnits || 0) +
                      Math.round(
                        (inner.reward?.amount ||
                          inner.reward?.totalAmount ||
                          (match ?
                            parseInt(match[0], 10)
                          : lookup?.amount || 1)) * dropChance,
                      );
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
        unknownBonusTypes.set(bType, (unknownBonusTypes.get(bType) || 0) + 1);
      }
    }

    if (!found) {
      uncountedEntitiesCount++;
    }
  }

  logger.debug('City map entities processed successfully', {
    readyCount: buildingsReady.length,
    fpBuildingsCount: fpBuildings.length,
    goodsBuildingsCount: goodsBuildings.length,
    clanGoodsBuildingsCount: clanGoodsBuildings.length,
    clanGoods,
    clanPower,
    diamonds,
    uncountedEntitiesCount,
  });

  return {
    buildingsReady,
    fpBuildings,
    goodsBuildings,
    clanGoodsBuildings,
    goodsList,
    diamonds,
    clanPower,
    clanGoods,
    totalGoods,
    unknownBonusTypes,
    timing: {
      galaxyEntityMs,
      entityProductionMs,
      entityAbilityMs,
    },
  };
}

module.exports = {
  processCityMapEntities,
  SPECIAL_GOODS,
};
module.exports.default = module.exports;
