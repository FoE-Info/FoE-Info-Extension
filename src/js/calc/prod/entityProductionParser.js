/**
 * entityProductionParser.js
 *
 * Extracts raw production data (FP, goods, clan goods, units, coins, supplies)
 * for a single city entity or Great Building under aided or unaided conditions.
 *
 * Adheres to:
 * - BigNumber precision rule (no native floats in arithmetic).
 * - Modular architecture rule (< 600 lines, 0 DOM references).
 */

const BigNumber = require('bignumber.js');
const { toBigNumber } = require('../utils/bignumberUtils.js');
const {
  getBuildingEra,
  getPreviousEra,
  getNextEra,
} = require('../utils/eraUtils.js');
const { createLogger } = require('../../utils/logger.js');
const {
  isEntityMotivatable,
  isEntityAided,
} = require('../entities/entityMotivation.js');
const {
  addPlayerResources,
  addGuildResources,
} = require('./productionResourceAccumulator.js');
const {
  parseEntityMetadataProduction,
} = require('./entityMetadataProductionParser.js');

const logger = createLogger('entityProductionParser');

function extractEntityProductionData(
  entity,
  meta,
  targetEra,
  {
    forceAided = false,
    helper = null,
    ResourceDefs = [],
    resourceDefMap = null,
  } = {},
) {
  const isGB =
    entity?.type === 'greatbuilding' ||
    meta?.type === 'greatbuilding' ||
    String(entity?.cityentity_id || '').startsWith('X_');

  let rMap = resourceDefMap;
  if (!rMap && Array.isArray(ResourceDefs) && ResourceDefs.length > 0) {
    rMap = new Map();
    for (const r of ResourceDefs) {
      if (r && r.id) rMap.set(r.id, r);
    }
  }

  const bEra = getBuildingEra(entity, targetEra);
  const prevEra = getPreviousEra(bEra) || getPreviousEra(targetEra);
  const nextEra = getNextEra(bEra) || getNextEra(targetEra);

  const result = {
    fp: new BigNumber(0),
    goods: new BigNumber(0),
    clanGoods: new BigNumber(0),
    units: new BigNumber(0),
    coins: new BigNumber(0),
    supplies: new BigNumber(0),
    isBoostable: !isGB,
    goodsMap: {},
    goodsByEra: {},
  };

  const isMotivatable = !isGB && isEntityMotivatable(entity, meta);
  const isAided = isGB || isEntityAided(entity, meta);
  const effectiveAided = forceAided || isAided;

  // 1. Great Buildings
  if (isGB) {
    const curProduct = entity?.state?.current_product;
    if (curProduct) {
      const res = curProduct.product?.resources;
      if (res) {
        addPlayerResources(
          res,
          result,
          1,
          effectiveAided,
          false,
          bEra,
          prevEra,
          nextEra,
          rMap,
        );
      }
      addGuildResources(curProduct.guildProduct?.resources, result);
      if (curProduct.name === 'clan_goods' || curProduct.goods) {
        const gList =
          Array.isArray(curProduct.goods) ? curProduct.goods
          : curProduct.goods ? [curProduct.goods]
          : [];
        for (const g of gList) {
          if (g?.value) {
            result.clanGoods = result.clanGoods.plus(toBigNumber(g.value));
          }
        }
        if (typeof curProduct.amount === 'number') {
          result.clanGoods = result.clanGoods.plus(
            toBigNumber(curProduct.amount),
          );
        }
      }
      if (
        curProduct.name === 'penal_unit' ||
        curProduct.asset_name === 'penal_unit'
      ) {
        result.units = result.units.plus(toBigNumber(curProduct.amount || 0));
      }
    }

    if (
      entity?.bonus?.type === 'strategy_points' &&
      entity.bonus.value != null
    ) {
      result.fp = result.fp.plus(toBigNumber(entity.bonus.value));
    }
    return result;
  }

  // 2. Generic and Special City Entities
  if (meta) {
    parseEntityMetadataProduction({
      entity,
      meta,
      result,
      bEra,
      targetEra,
      prevEra,
      nextEra,
      effectiveAided,
      isMotivatable,
      rMap,
    });
  } else {
    // Fallback if no meta
    const curProduct = entity?.state?.current_product;
    const prodOption = entity?.state?.productionOption;
    if (curProduct?.product?.resources) {
      addPlayerResources(
        curProduct.product.resources,
        result,
        1,
        false,
        false,
        bEra,
        prevEra,
        nextEra,
        rMap,
      );
    }
    if (prodOption?.products) {
      const pList =
        Array.isArray(prodOption.products) ? prodOption.products : [];
      for (const p of pList) {
        if (p.playerResources?.resources) {
          addPlayerResources(
            p.playerResources.resources,
            result,
            1,
            false,
            false,
            bEra,
            prevEra,
            nextEra,
            rMap,
          );
        }
      }
    }
  }

  logger.debug('extractEntityProductionData completed', {
    entityId: entity?.cityentity_id,
    isGB,
    effectiveAided,
    fp: result.fp.toString(),
    goods: result.goods.toString(),
    clanGoods: result.clanGoods.toString(),
    units: result.units.toString(),
  });

  return result;
}

module.exports = {
  isEntityMotivatable,
  isEntityAided,
  extractEntityProductionData,
  addPlayerResources,
  addGuildResources,
};
module.exports.default = module.exports;
