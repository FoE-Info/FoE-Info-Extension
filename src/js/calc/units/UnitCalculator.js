/**
 * UnitCalculator.js
 *
 * Military unit production (daily rewards and Alcatraz) and Great Building landmark bonuses.
 */

const BigNumber = require('bignumber.js');
const { toBigNumber } = require('../utils/bignumberUtils.js');

let logger = null;
try {
  const { createLogger } = require('../../utils/logger.js');
  logger = createLogger('UnitCalc');
} catch {}

function createUnitsAccumulator() {
  return {
    dailyUnits: new BigNumber(0),
    trazUnits: new BigNumber(0),
    buildings: [],
  };
}

function processEntityUnits({ entity, meta, prodResources, accum }) {
  const entityId = entity?.cityentity_id;
  const level = entity?.level ?? 0;
  const buildingName = meta?.name || entityId;

  if (entity?.state?.current_product?.name === 'penal_unit') {
    const amt = toBigNumber(entity.state.current_product.amount);
    accum.trazUnits = accum.trazUnits.plus(amt);
    accum.dailyUnits = accum.dailyUnits.plus(amt);
    if (accum.buildings && amt.isGreaterThan(0)) {
      accum.buildings.push({
        name: buildingName,
        amount: amt.toNumber(),
      });
    }
  } else if (
    entityId === 'X_ProgressiveEra_Landmark1' ||
    entityId === 'X_LateMiddleAge_Landmark1'
  ) {
    const bonusVal =
      entity?.bonus?.value || meta?.entity_levels?.[level]?.bonuses?.[0]?.value;
    if (bonusVal != null) {
      const trazAmount = toBigNumber(bonusVal);
      accum.trazUnits = accum.trazUnits.plus(trazAmount);
      accum.dailyUnits = accum.dailyUnits.plus(trazAmount);
      if (accum.buildings && trazAmount.isGreaterThan(0)) {
        accum.buildings.push({
          name: buildingName,
          amount: trazAmount.toNumber(),
        });
      }
    }
  }

  if (prodResources?.units) {
    const uAmt = toBigNumber(prodResources.units);
    accum.dailyUnits = accum.dailyUnits.plus(uAmt);
    if (accum.buildings && uAmt.isGreaterThan(0)) {
      accum.buildings.push({
        name: buildingName,
        amount: uAmt.toNumber(),
      });
    }
  }

  logger?.debug('Processed entity units', {
    entityId,
    buildingName,
    dailyUnits: accum.dailyUnits?.toString?.(),
    trazUnits: accum.trazUnits?.toString?.(),
  });
}

function extractSpecialBonuses({ entity, meta, level }) {
  const entityId = entity?.cityentity_id || entity?.city_entity_id;
  if (!entityId) return {};
  const res = {};

  if (entityId === 'X_FutureEra_Landmark1') {
    // The Arc
    const bonusVal =
      entity.bonus?.value ?? meta?.entity_levels?.[level]?.bonuses?.[0]?.value;
    if (bonusVal != null) res.arcBonusPercent = toBigNumber(bonusVal);
  } else if (entityId === 'X_ProgressiveEra_Landmark2') {
    // Château Frontenac
    const bonusVal =
      entity.bonus?.value ?? meta?.entity_levels?.[level]?.bonuses?.[0]?.value;
    if (bonusVal != null) res.chatBonusPercent = toBigNumber(bonusVal);
  } else if (entityId === 'X_ArcticFuture_Landmark2') {
    // Arctic Orangery
    const bonusVal =
      entity.bonus?.value ?? meta?.entity_levels?.[level]?.bonuses?.[0]?.value;
    if (bonusVal != null) res.aoCritPercent = toBigNumber(bonusVal);
  } else if (entityId === 'X_SpaceAgeSpaceHub_Landmark2') {
    // Cosmic Catalyst
    const bonusVal =
      entity.bonus?.value ?? meta?.entity_levels?.[level]?.bonuses?.[0]?.value;
    if (bonusVal != null) res.ccCritPercent = toBigNumber(bonusVal);
  }

  return res;
}

function computeChateauGoods(chatBonusPercent) {
  return chatBonusPercent
    .dividedBy(20)
    .plus(5)
    .integerValue(BigNumber.ROUND_FLOOR);
}

module.exports = {
  createUnitsAccumulator,
  processEntityUnits,
  extractSpecialBonuses,
  computeChateauGoods,
};
module.exports.default = module.exports;
