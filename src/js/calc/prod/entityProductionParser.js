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
const {
  NON_GOODS_KEYS,
  SPECIAL_GOODS,
} = require('../goods/goodsClassification.js');
const {
  isEntityMotivatable,
  isEntityAided,
} = require('../entities/entityMotivation.js');

function addPlayerResources(
  resObj,
  result,
  multBn = 1,
  effectiveAided = true,
  isMotivatable = false,
  bEra = null,
  prevEra = null,
  nextEra = null,
  resourceDefMap = null,
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
      const goodsAmt = bnVal;
      result.goods = result.goods.plus(goodsAmt);
      result.goodsMap[k] = (result.goodsMap[k] || 0) + goodsAmt.toNumber();

      let goodEra = bEra;
      const resDef = resourceDefMap?.get(k);
      if (resDef?.era) {
        goodEra = resDef.era;
      } else if (k.includes('previous_age') || k.includes('previous')) {
        goodEra = prevEra;
      } else if (k.includes('next_age') || k.includes('next')) {
        goodEra = nextEra;
      } else {
        goodEra = bEra;
      }

      if (goodEra && result.goodsByEra) {
        result.goodsByEra[goodEra] = (
          result.goodsByEra[goodEra] || new BigNumber(0)
        ).plus(goodsAmt);
      }
    }
  }
}

function addGuildResources(guildRes, result) {
  if (!guildRes) return;
  for (const [k, v] of Object.entries(guildRes)) {
    if (k !== 'clan_power' && typeof v === 'number') {
      result.clanGoods = result.clanGoods.plus(toBigNumber(v));
    }
  }
}

function applyGenericRewardToResult(
  reward,
  result,
  multiplier = 1,
  bEra = null,
  prevEra = null,
  nextEra = null,
  resourceDefMap = null,
) {
  if (!reward) return;
  const multBn = toBigNumber(multiplier);

  if (reward.type === 'unit') {
    result.units = result.units.plus(
      toBigNumber(reward.amount || 1).multipliedBy(multBn),
    );
  } else if (reward.type === 'chest') {
    let chestUnits = 0;
    if (Array.isArray(reward.possible_rewards)) {
      const prList = reward.possible_rewards;
      for (const pr of prList) {
        if (pr.reward?.type === 'unit') {
          chestUnits = pr.reward.amount || 1;
          break;
        }
        if (
          pr.reward?.type === 'goods' ||
          pr.reward?.type === 'good' ||
          pr.reward?.subType === 'goods'
        ) {
          const chance =
            pr.dropChance ??
            pr.drop_chance ??
            (prList.length > 0 ? 1 / prList.length : 1);
          const rAmt = toBigNumber(pr.reward.amount || 1)
            .multipliedBy(multBn)
            .multipliedBy(toBigNumber(chance));
          let gEra = bEra;
          const rId = pr.reward.id || reward.id || '';
          const resDef = resourceDefMap?.get(rId);
          if (resDef?.era) gEra = resDef.era;
          else if (rId.includes('previous')) gEra = prevEra;
          else if (rId.includes('next')) gEra = nextEra;

          result.goods = result.goods.plus(rAmt);
          const gKey = rId || 'random_good_of_age';
          result.goodsMap[gKey] =
            (result.goodsMap[gKey] || 0) + rAmt.toNumber();
          if (gEra && result.goodsByEra) {
            result.goodsByEra[gEra] = (
              result.goodsByEra[gEra] || new BigNumber(0)
            ).plus(rAmt);
          }
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
  } else if (
    reward.type === 'goods' ||
    reward.type === 'good' ||
    reward.subType === 'goods' ||
    (reward.icon && /good/.test(reward.icon))
  ) {
    const amt = toBigNumber(
      reward.amount || reward.totalAmount || 0,
    ).multipliedBy(multBn);
    result.goods = result.goods.plus(amt);
    let goodEra = bEra;
    const rId = reward.id || '';
    const resDef = resourceDefMap?.get(rId);
    if (resDef?.era) {
      goodEra = resDef.era;
    } else if (rId.includes('previous') || reward.icon?.includes('previous')) {
      goodEra = prevEra;
    } else if (
      rId.includes('next') ||
      reward.icon === 'next_age_goods' ||
      reward.icon?.includes('next')
    ) {
      goodEra = nextEra;
    }
    const goodKey = rId || 'random_good_of_age';
    result.goodsMap[goodKey] = (result.goodsMap[goodKey] || 0) + amt.toNumber();
    if (goodEra && result.goodsByEra) {
      result.goodsByEra[goodEra] = (
        result.goodsByEra[goodEra] || new BigNumber(0)
      ).plus(amt);
    }
  }
}

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
    const eraComp =
      meta.components?.[bEra] ||
      meta.components?.[targetEra] ||
      meta.components?.AllAge ||
      null;
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
