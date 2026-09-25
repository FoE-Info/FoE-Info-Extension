/**
 * harvestAccumulator.js
 *
 * Accumulator management and product parsing for city entity harvest evaluation.
 * Evaluates guild products, player resources, clan power, and Blue Galaxy candidates.
 * Pure module: zero DOM references.
 */

const { SPECIAL_GOODS } = require('../goods/goodsClassification.js');

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

/**
 * Accumulates player goods into the harvest accumulator.
 *
 * @param {Object} params
 * @param {Object} params.resources - Resource map from entity product.
 * @param {string} params.cid - City entity ID.
 * @param {Object} params.accum - Mutable harvest accumulator.
 * @param {Object} params.helper - Helper functions (fEntityNameTrim).
 */
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

/**
 * Parses current_product payload on a city entity.
 *
 * @param {Object} params
 * @returns {{ forgePoints: number, found: boolean }}
 */
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

  // 1. Guild product
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

  // 2. Goods property (e.g. Arc / guild GBs)
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

  // 3. Player resources from product
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

/**
 * Parses productionOption payload on a city entity (alternative structure).
 *
 * @param {Object} params
 * @returns {{ forgePoints: number, found: boolean }}
 */
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

module.exports = {
  createHarvestAccumulator,
  accumulatePlayerGoods,
  parseCurrentProduct,
  parseProductionOption,
};
module.exports.default = module.exports;
