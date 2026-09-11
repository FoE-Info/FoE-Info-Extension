/**
 * UnitCalculator.js
 *
 * Military unit production (daily rewards and Alcatraz) and Great Building landmark bonuses.
 */

const BigNumber = require('bignumber.js');
const { toBigNumber } = require('../utils/bignumberUtils.js');

function createUnitsAccumulator() {
  return {
    dailyUnits: new BigNumber(0),
    trazUnits: new BigNumber(0),
  };
}

function processEntityUnits({ entity, meta, prodResources, accum }) {
  const entityId = entity.cityentity_id;
  const level = entity.level ?? 0;

  // Alcatraz
  if (
    entityId === 'X_ProgressiveEra_Landmark1' ||
    entityId === 'X_LateMiddleAge_Landmark1'
  ) {
    const bonusVal =
      (entity.state?.current_product?.name === 'penal_unit' &&
        entity.state.current_product.amount) ||
      entity.bonus?.value ||
      meta?.entity_levels?.[level]?.bonuses?.[0]?.value;
    if (bonusVal != null) {
      accum.trazUnits = toBigNumber(bonusVal);
      accum.dailyUnits = accum.dailyUnits.plus(accum.trazUnits);
    }
  }

  // Units from production
  if (prodResources?.units) {
    accum.dailyUnits = accum.dailyUnits.plus(toBigNumber(prodResources.units));
  }
  if (entity.state?.current_product?.name === 'penal_unit') {
    accum.dailyUnits = accum.dailyUnits.plus(
      toBigNumber(entity.state.current_product.amount),
    );
  }
}

function extractSpecialBonuses({ entity, meta, level }) {
  const entityId = entity.cityentity_id;
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
  } else if (entityId === 'X_OceanicFuture_Landmark1') {
    // The Kraken
    const bonusVal =
      entity.bonus?.value ?? meta?.entity_levels?.[level]?.bonuses?.[0]?.value;
    if (bonusVal != null) res.krakenCritPercent = toBigNumber(bonusVal);
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
