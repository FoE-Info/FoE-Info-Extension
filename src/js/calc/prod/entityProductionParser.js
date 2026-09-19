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

const NON_GOODS_KEYS = new Set([
  'money',
  'supplies',
  'medals',
  'strategy_points',
  'clan_power',
  'population',
  'happiness',
  'units',
  'premium',
]);

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

function isEntityMotivatable(entity, meta) {
  if (!meta) return false;
  const eid = String(entity?.cityentity_id || entity?.id || '');
  if (
    entity?.type === 'greatbuilding' ||
    meta?.type === 'greatbuilding' ||
    eid.startsWith('X_')
  ) {
    return false;
  }
  if (meta.__class__ === 'GenericCityEntity') {
    if (meta.components?.AllAge?.socialInteraction !== undefined) return true;
  }
  if (Array.isArray(meta.abilities)) {
    for (const a of meta.abilities) {
      if (
        a &&
        (a.__class__ === 'MotivatableAbility' ||
          a.__class__ === 'PolishableAbility' ||
          a.__class__ === 'RandomUnitOfAgeWhenMotivatedAbility')
      ) {
        return true;
      }
    }
  }
  return false;
}

function isEntityAided(entity, meta) {
  if (!entity?.state) return true;
  const s = entity.state;
  if (s.boosted === true || s.is_motivated === true) return true;
  if (s.socialInteractionStartedAt > 0) {
    if (s.socialInteractionId === 'motivate') return true;
    if (s.socialInteractionId === 'polish') {
      const now = Math.floor(Date.now() / 1000);
      if (s.socialInteractionStartedAt + 43200 > now) return true;
    }
  }
  if (
    s.next_state_transition_in &&
    Array.isArray(meta?.abilities) &&
    meta.abilities.some((a) => a && a.__class__ === 'PolishableAbility')
  ) {
    return true;
  }
  return false;
}

function addPlayerResources(
  resObj,
  result,
  multBn = 1,
  effectiveAided = true,
  isMotivatable = false,
) {
  if (!resObj) return;
  const mult = toBigNumber(multBn);
  for (const [k, v] of Object.entries(resObj)) {
    const bnVal = toBigNumber(v).multipliedBy(mult);
    if (k === 'strategy_points') {
      result.fp = result.fp.plus(bnVal);
    } else if (k === 'money') {
      const doubled = effectiveAided && isMotivatable ? 2 : 1;
      result.coins = result.coins.plus(bnVal.multipliedBy(doubled));
    } else if (k === 'supplies') {
      const doubled = effectiveAided && isMotivatable ? 2 : 1;
      result.supplies = result.supplies.plus(bnVal.multipliedBy(doubled));
    } else if (!NON_GOODS_KEYS.has(k) && !SPECIAL_GOODS.has(k)) {
      const goodsAmt = k === 'all_goods_of_age' ? bnVal.multipliedBy(5) : bnVal;
      result.goods = result.goods.plus(goodsAmt);
      result.goodsMap[k] = (result.goodsMap[k] || 0) + goodsAmt.toNumber();
    }
  }
}

function addGuildResources(guildRes, result) {
  if (!guildRes) return;
  for (const [k, v] of Object.entries(guildRes)) {
    if (k !== 'clan_power' && typeof v === 'number') {
      const cgAmt =
        k === 'all_goods_of_age' ?
          toBigNumber(v).multipliedBy(5)
        : toBigNumber(v);
      result.clanGoods = result.clanGoods.plus(cgAmt);
    }
  }
}

function applyGenericRewardToResult(reward, result, multiplier = 1) {
  if (!reward) return;
  const multBn = toBigNumber(multiplier);

  if (reward.type === 'unit') {
    result.units = result.units.plus(
      toBigNumber(reward.amount || 1).multipliedBy(multBn),
    );
  } else if (reward.type === 'chest') {
    let chestUnits = 0;
    if (Array.isArray(reward.possible_rewards)) {
      for (const pr of reward.possible_rewards) {
        if (pr.reward?.type === 'unit') {
          chestUnits = pr.reward.amount || 1;
          break;
        }
      }
    }
    if (
      !chestUnits &&
      (reward.id?.includes('unit_chest') ||
        reward.name?.toLowerCase().includes('unit'))
    ) {
      const match = reward.id?.match(/\d+$/);
      if (match) chestUnits = parseInt(match[0], 10);
    }
    if (chestUnits > 0) {
      result.units = result.units.plus(
        toBigNumber(chestUnits).multipliedBy(multBn),
      );
    }
  } else if (reward.subType === 'strategy_points') {
    result.fp = result.fp.plus(
      toBigNumber(reward.amount || 0).multipliedBy(multBn),
    );
  } else if (reward.type === 'goods') {
    const amt = toBigNumber(reward.amount || 0).multipliedBy(multBn);
    result.goods = result.goods.plus(amt);
    const goodKey = reward.id || 'random_good_of_age';
    result.goodsMap[goodKey] = (result.goodsMap[goodKey] || 0) + amt.toNumber();
  }
}

function extractEntityProductionData(
  entity,
  meta,
  targetEra,
  { forceAided = false } = {},
) {
  const isGB =
    entity?.type === 'greatbuilding' ||
    meta?.type === 'greatbuilding' ||
    String(entity?.cityentity_id || '').startsWith('X_');

  const result = {
    fp: new BigNumber(0),
    goods: new BigNumber(0),
    clanGoods: new BigNumber(0),
    units: new BigNumber(0),
    coins: new BigNumber(0),
    supplies: new BigNumber(0),
    isBoostable: !isGB,
    goodsMap: {},
  };

  const isMotivatable = !isGB && isEntityMotivatable(entity, meta);
  const isAided = isGB || isEntityAided(entity, meta);
  const effectiveAided = forceAided || isAided;

  // 1. Great Buildings
  if (isGB) {
    const curProduct = entity?.state?.current_product;
    if (curProduct) {
      const res = curProduct.product?.resources;
      if (res?.strategy_points) {
        result.fp = result.fp.plus(toBigNumber(res.strategy_points));
      }
      if (res?.money) {
        result.coins = result.coins.plus(toBigNumber(res.money));
      }
      if (res?.supplies) {
        result.supplies = result.supplies.plus(toBigNumber(res.supplies));
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
    const eraComp =
      meta.components?.[targetEra] || meta.components?.AllAge || null;
    const allAgeComp = meta.components?.AllAge || null;
    const prodComp = eraComp?.production || allAgeComp?.production || null;
    const lookup =
      eraComp?.lookup?.rewards || allAgeComp?.lookup?.rewards || {};

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
          applyGenericRewardToResult(lookup[p.reward?.id], result, 1);
        } else if (p.type === 'random') {
          for (const randP of p.products || []) {
            const chanceBn = toBigNumber(randP.dropChance || 1);
            const prod = randP.product || randP;
            if (prod?.type === 'genericReward') {
              applyGenericRewardToResult(
                lookup[prod.reward?.id],
                result,
                chanceBn,
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
              );
            }
          }
        }
      }
    } else if (Array.isArray(meta.entity_levels)) {
      const lvl =
        meta.entity_levels[entity?.level ?? 0] || meta.entity_levels[0];
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

    // 3. Abilities (only when effectiveAided)
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
          const resObj =
            a.additionalResources.AllAge?.resources ||
            a.additionalResources[targetEra]?.resources;
          addGuildResources(resObj, result);
        }
        if (a.additionalResources) {
          for (const k of ['AllAge', targetEra]) {
            if (k === 'AllAge' || targetEra !== 'AllAge') {
              addPlayerResources(
                a.additionalResources[k]?.resources,
                result,
                1,
                effectiveAided,
                isMotivatable,
              );
            }
          }
        }
      }
    }
  } else {
    // Fallback if no meta
    const curProduct = entity?.state?.current_product;
    const prodOption = entity?.state?.productionOption;
    if (curProduct?.product?.resources) {
      addPlayerResources(curProduct.product.resources, result, 1, false, false);
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
          );
        }
      }
    }
  }

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
