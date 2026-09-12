/**
 * CityEntityHarvestCalculator.js
 *
 * Pure per-entity harvest evaluation for Forge of Empires city map entities.
 * Resolves Blue Galaxy contributions, readiness/collection timestamps, guild
 * treasury goods, player resource production, and special-goods extraction for
 * a single city entity. Contains zero DOM references.
 */

let logger = null;
try {
  const { createLogger } = require('../../utils/logger.js');
  logger = createLogger('CityEntityHarvestCalculator');
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
 * Create a fresh mutable accumulator for a single city harvest batch.
 *
 * @returns {Object} Accumulator collections and scalar totals.
 */
function createHarvestAccumulator() {
  return {
    buildingsReady: [],
    fpBuildings: [],
    goodsBuildings: [],
    clanGoodsBuildings: [],
    goodsList: {},
    diamonds: 0,
    clanPower: 0,
    clanGoods: 0,
    totalGoods: 0,
  };
}

function accumulatePlayerGoods({ resources, cid, accum, helper }) {
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
        accum.goodsList[entry] = (accum.goodsList[entry] || 0) + entryGoods;
      }
    }
  });
  if (goods > 0) {
    accum.goodsBuildings.push({
      id: cid,
      name: helper.fEntityNameTrim(cid),
      goods: goods,
    });
    accum.totalGoods += goods;
  }
}

function parseCurrentProduct({
  curProduct,
  cid,
  mapID,
  MyInfo,
  ResourceDefs,
  helper,
  City,
  Galaxy,
  accum,
}) {
  let forgePoints = 0;
  let found = false;

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
      accum.clanGoods += goods;
      accum.clanGoodsBuildings.push({
        id: cid,
        era: era,
        name: `${helper.fEntityNameTrim(cid)} ${helper.fGVGagesname(era)}`,
        goods: goods,
      });
    }
    if (curProduct.guildProduct.resources.clan_power) {
      accum.clanPower += curProduct.guildProduct.resources.clan_power;
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
        accum.clanGoods += goods;
        const eraName = gbEra || MyInfo.era;
        accum.clanGoodsBuildings.push({
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
    if (prodRes.premium) accum.diamonds += prodRes.premium;
    if (prodRes.strategy_points) {
      forgePoints += prodRes.strategy_points;
      if (forgePoints > 0) {
        City.ForgePoints = (City.ForgePoints || 0) + forgePoints;
        found = true;
        accum.fpBuildings.push({
          id: cid,
          name: helper.fEntityNameTrim(cid),
          fp: forgePoints,
          isBoostable: mapID.type !== 'greatbuilding',
        });
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

    accumulatePlayerGoods({
      resources: prodRes,
      cid,
      accum,
      helper,
    });
  }

  if (curProduct.clan_power) accum.clanPower += curProduct.clan_power;
  if (curProduct.asset_name === 'penal_unit') {
    City.TrazUnits = (City.TrazUnits || 0) + (curProduct.amount || 0);
  }

  return { forgePoints, found };
}

function parseProductionOption({
  prodOpt,
  cid,
  mapID,
  ResourceDefs,
  helper,
  City,
  Galaxy,
  accum,
}) {
  let forgePoints = 0;
  let found = false;

  if (prodOpt.guildProduct?.resources) {
    let goods = 0;
    Object.keys(prodOpt.guildProduct.resources).forEach((entry) => {
      if (entry !== 'clan_power') {
        goods += prodOpt.guildProduct.resources[entry] || 0;
      }
    });
    if (goods > 0) {
      accum.clanGoods += goods;
      accum.clanGoodsBuildings.push({
        id: cid,
        name: helper.fEntityNameTrim(cid),
        goods: goods,
      });
    }
    if (prodOpt.guildProduct.resources.clan_power) {
      accum.clanPower += prodOpt.guildProduct.resources.clan_power;
    }
  }

  if (prodOpt.goods) {
    if (prodOpt.name === 'clan_goods' || prodOpt.goods?.name === 'clan_goods') {
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
        accum.clanGoods += goods;
        accum.clanGoodsBuildings.push({
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
        if (resources.premium) accum.diamonds += resources.premium;
        if (resources.strategy_points) {
          forgePoints += resources.strategy_points;
        }
        if (resources.money) City.Coins = (City.Coins || 0) + resources.money;
        if (resources.supplies)
          City.Supplies = (City.Supplies || 0) + resources.supplies;

        accumulatePlayerGoods({
          resources,
          cid,
          accum,
          helper,
        });
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
            accum.clanPower += guildRes[entry] || 0;
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
          accum.clanGoods += pClanGoods;
          accum.clanGoodsBuildings.push({
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
    accum.fpBuildings.push({
      id: cid,
      name: helper.fEntityNameTrim(cid),
      fp: forgePoints,
      isBoostable: mapID.type !== 'greatbuilding',
    });
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

  if (prodOpt.clan_power) accum.clanPower += prodOpt.clan_power;
  if (prodOpt.asset_name === 'penal_unit') {
    City.TrazUnits = (City.TrazUnits || 0) + (prodOpt.amount || 0);
  }

  return { forgePoints, found };
}

/**
 * Evaluate harvest contributions for a single city map entity.
 *
 * Mutates the supplied accumulator and City object exactly as the legacy
 * monolithic loop did, then reports per-entity timing and FP discovery.
 *
 * @param {Object} mapID - City map entity.
 * @param {number} index - Entity index within the batch.
 * @param {Object} options - Harvest context (production providers + accumulator).
 * @returns {{ found: boolean, galaxyEntityMs: number, entityProductionMs: number }}
 */
function evaluateEntityHarvest(mapID, index, options = {}) {
  const City = options.City || {};
  const CityEntityDefs = options.CityEntityDefs || {};
  const metadataStore = options.metadataStore || null;
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
  const accum = options.accum || createHarvestAccumulator();

  let found = false;
  let galaxyEntityMs = 0;
  let entityProductionMs = 0;

  const cid = mapID.cityentity_id;
  if (debugEnabled) {
    logger.debug('Evaluating city entity harvest', { index, cid });
  }

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
          accum.clanGoods += goods;
          accum.clanGoodsBuildings.push({
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
    accum.buildingsReady.push({
      id: cid,
      name: helper.fEntityNameTrim(cid),
      ready: mapID.state.next_state_transition_at,
    });
  }

  // 4. Current product parsing
  if (mapID.state?.current_product) {
    const parsed = parseCurrentProduct({
      curProduct: mapID.state.current_product,
      cid,
      mapID,
      MyInfo,
      ResourceDefs,
      helper,
      City,
      Galaxy,
      accum,
    });
    found = found || parsed.found;
  }

  // 5. ProductionOption parsing (alternative payload shape)
  if (mapID.state?.productionOption) {
    const parsed = parseProductionOption({
      prodOpt: mapID.state.productionOption,
      cid,
      mapID,
      ResourceDefs,
      helper,
      City,
      Galaxy,
      accum,
    });
    found = found || parsed.found;
  }

  if (debugEnabled) {
    entityProductionMs += performance.now() - entityProductionStart;
  }

  return { found, galaxyEntityMs, entityProductionMs };
}

module.exports = {
  createHarvestAccumulator,
  evaluateEntityHarvest,
  SPECIAL_GOODS,
};
module.exports.default = module.exports;
