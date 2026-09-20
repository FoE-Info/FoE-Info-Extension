/**
 * entityMetadataProductionParser.js
 *
 * Extracts production values from entity metadata definitions:
 * - Production options and products (resources, generic rewards, units, drop chances)
 * - Entity level production values (coins, supplies, strategy points)
 * - Building abilities (treasury goods, random units, additional resources)
 *
 * Adheres strictly to:
 * - BigNumber precision rule (no native floats in arithmetic).
 * - Modular architecture rule (<= 250 lines, 0 DOM references).
 * - Debuggability by Design (createLogger).
 */

const { toBigNumber } = require('../utils/bignumberUtils.js');
const { createLogger } = require('../../utils/logger.js');
const {
  addPlayerResources,
  addGuildResources,
  applyGenericRewardToResult,
} = require('./productionResourceAccumulator.js');

const logger = createLogger('entityMetaProdParser');

function parseEntityMetadataProduction({
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
}) {
  if (!meta) return;

  const eraComp =
    meta.components?.[bEra] ||
    meta.components?.[targetEra] ||
    meta.components?.AllAge ||
    null;
  const allAgeComp = meta.components?.AllAge || null;
  const prodComp = eraComp?.production || allAgeComp?.production || null;
  const lookup = eraComp?.lookup?.rewards || allAgeComp?.lookup?.rewards || {};

  // 1. Production component options
  if (
    prodComp &&
    Array.isArray(prodComp.options) &&
    prodComp.options.length > 0
  ) {
    const pList =
      prodComp.options[0].products || prodComp.options[0].array || [];
    for (const p of pList) {
      if (!p || (p.onlyWhenMotivated === true && !effectiveAided)) continue;

      if (p.type === 'resources' && p.playerResources?.resources) {
        addPlayerResources(
          p.playerResources.resources,
          result,
          1,
          effectiveAided,
          isMotivatable,
          bEra,
          prevEra,
          nextEra,
          rMap,
        );
      } else if (p.type === 'guildResources') {
        addGuildResources(
          p.guildResources?.resources ||
            p.guildProduct?.resources ||
            p.resources,
          result,
        );
      } else if (p.type === 'unit') {
        result.units = result.units.plus(
          toBigNumber(p.amount || p.unit?.amount || 1),
        );
      } else if (p.type === 'genericReward') {
        applyGenericRewardToResult(
          lookup[p.reward?.id],
          result,
          1,
          bEra,
          prevEra,
          nextEra,
          rMap,
        );
      } else if (p.type === 'random') {
        for (const randP of p.products || []) {
          const chanceBn = toBigNumber(randP.dropChance || 1);
          const prod = randP.product || randP;
          if (prod?.type === 'genericReward') {
            applyGenericRewardToResult(
              lookup[prod.reward?.id],
              result,
              chanceBn,
              bEra,
              prevEra,
              nextEra,
              rMap,
            );
          } else if (
            prod?.type === 'resources' &&
            prod.playerResources?.resources
          ) {
            addPlayerResources(
              prod.playerResources.resources,
              result,
              chanceBn,
              effectiveAided,
              isMotivatable,
              bEra,
              prevEra,
              nextEra,
              rMap,
            );
          }
        }
      }
    }
  } else if (Array.isArray(meta.entity_levels)) {
    const lvl = meta.entity_levels[entity?.level ?? 0] || meta.entity_levels[0];
    for (const pv of lvl?.production_values || []) {
      if (!pv?.type || pv.value == null) continue;
      const val = toBigNumber(pv.value);
      if (pv.type === 'strategy_points') {
        result.fp = result.fp.plus(val);
      } else if (pv.type === 'money') {
        const doubled = effectiveAided && isMotivatable ? 2 : 1;
        result.coins = result.coins.plus(val.multipliedBy(doubled));
      } else if (pv.type === 'supplies') {
        const doubled = effectiveAided && isMotivatable ? 2 : 1;
        result.supplies = result.supplies.plus(val.multipliedBy(doubled));
      }
    }
    if (lvl?.produced_money) {
      const val = toBigNumber(lvl.produced_money);
      const doubled = effectiveAided && isMotivatable ? 2 : 1;
      result.coins = result.coins.plus(val.multipliedBy(doubled));
    }
  }

  // 2. Abilities (only when effectiveAided)
  if (effectiveAided && Array.isArray(meta.abilities)) {
    for (const a of meta.abilities) {
      if (!a) continue;
      if (a.__class__ === 'RandomUnitOfAgeWhenMotivatedAbility' && a.amount) {
        result.units = result.units.plus(toBigNumber(a.amount));
      }
      if (
        a.__class__ === 'AddResourcesToGuildTreasuryAbility' &&
        a.additionalResources
      ) {
        const eraKey = bEra || targetEra;
        const erasToScan = ['AllAge'];
        if (eraKey && eraKey !== 'AllAge') {
          erasToScan.push(eraKey);
        } else if (targetEra && targetEra !== 'AllAge') {
          erasToScan.push(targetEra);
        }
        for (const k of erasToScan) {
          if (a.additionalResources[k]?.resources) {
            addGuildResources(a.additionalResources[k].resources, result);
          }
        }
      } else if (a.additionalResources) {
        const eraKey = bEra || targetEra;
        const erasToScan = ['AllAge'];
        if (eraKey && eraKey !== 'AllAge') {
          erasToScan.push(eraKey);
        } else if (targetEra && targetEra !== 'AllAge') {
          erasToScan.push(targetEra);
        }
        for (const k of erasToScan) {
          if (a.additionalResources[k]?.resources) {
            addPlayerResources(
              a.additionalResources[k].resources,
              result,
              1,
              effectiveAided,
              isMotivatable,
              bEra,
              prevEra,
              nextEra,
              rMap,
            );
          }
        }
      }
    }
  }

  logger.debug('parseEntityMetadataProduction finished', {
    entityId: entity?.cityentity_id,
    fp: result.fp.toString(),
    goods: result.goods.toString(),
    clanGoods: result.clanGoods.toString(),
    units: result.units.toString(),
  });
}

module.exports = {
  parseEntityMetadataProduction,
};
