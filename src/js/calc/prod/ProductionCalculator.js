/**
 * ProductionCalculator.js
 *
 * Daily resource production extraction and boost calculations for Forge of Empires.
 * Computes Coins, Supplies, Strategy Points (FP), and clan power yields.
 */

const BigNumber = require('bignumber.js');
const {
  toBigNumber,
  boostedForgePoints,
} = require('../utils/bignumberUtils.js');
const UNIT_MULTIPLIER = new BigNumber(1);

function addResource(res, k, v) {
  if (v == null) return;
  res[k] = toBigNumber(res[k]).plus(toBigNumber(v)).toNumber();
}

function addGuildResources(res, guildRes) {
  if (!guildRes) return;
  for (const [k, v] of Object.entries(guildRes)) {
    if (k === 'clan_power') addResource(res, 'clan_power', v);
    else if (k === 'all_goods_of_age') addResource(res, 'clan_goods', v);
    else if (typeof v === 'number' || v instanceof BigNumber)
      addResource(res, 'clan_goods', v);
  }
}

function applyGenericReward(reward, res, multiplier = UNIT_MULTIPLIER) {
  if (!reward) return;
  const mult = (v) =>
    toBigNumber(v)
      .multipliedBy(multiplier)
      .integerValue(BigNumber.ROUND_HALF_UP)
      .toNumber();
  if (reward.type === 'unit') {
    addResource(res, 'units', mult(reward.amount || 1));
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
      addResource(res, 'units', mult(chestUnits));
    }
  } else if (reward.subType === 'strategy_points') {
    addResource(res, 'strategy_points', mult(reward.amount || 0));
  } else if (reward.type === 'goods') {
    addResource(res, 'random_good_of_age', mult(reward.amount || 0));
  }
}

function extractEntityProduction(
  entity,
  meta,
  targetEra,
  is100PercentAided = false,
  adjCount = 0,
) {
  const res = {};
  const currentProduct = entity?.state?.current_product;

  // 1. From active state current_product (if present)
  if (currentProduct) {
    if (currentProduct.product?.resources) {
      for (const [k, v] of Object.entries(currentProduct.product.resources)) {
        addResource(res, k, v);
      }
    }
    if (currentProduct.guildProduct?.resources) {
      for (const [k, v] of Object.entries(
        currentProduct.guildProduct.resources,
      )) {
        addResource(res, k, v);
      }
    }
    if (currentProduct.name === 'clan_goods') {
      if (Array.isArray(currentProduct.goods)) {
        for (const g of currentProduct.goods) {
          addResource(res, 'clan_goods', g.value || 0);
        }
      } else if (currentProduct.goods?.value) {
        addResource(res, 'clan_goods', currentProduct.goods.value);
      }
    }
  }

  // Active productionOption for own city if !currentProduct and !is100PercentAided
  if (!currentProduct && !is100PercentAided) {
    const prodOption = entity?.state?.productionOption;
    if (prodOption?.products) {
      const pList =
        Array.isArray(prodOption.products) ?
          prodOption.products
        : prodOption.products.array || [];
      for (const p of pList) {
        if (p.playerResources?.resources) {
          for (const [k, v] of Object.entries(p.playerResources.resources)) {
            addResource(res, k, v);
          }
        }
        addGuildResources(
          res,
          p.guildResources?.resources ||
            p.guildProduct?.resources ||
            (p.type === 'guildResources' ? p.resources : null),
        );
      }
    }
  }

  // 2. Only read meta.components production options if !currentProduct
  if (!currentProduct && meta) {
    const prodComp =
      meta.components?.[targetEra]?.production ||
      meta.components?.AllAge?.production;
    const lookup =
      meta.components?.[targetEra]?.lookup?.rewards ||
      meta.components?.AllAge?.lookup?.rewards ||
      {};

    if (prodComp?.options?.[0]?.products) {
      const pList = prodComp.options[0].products;
      for (const p of pList) {
        if (p.playerResources?.resources) {
          for (const [k, v] of Object.entries(p.playerResources.resources)) {
            addResource(res, k, v);
          }
        }
        addGuildResources(
          res,
          p.guildResources?.resources ||
            p.guildProduct?.resources ||
            (p.type === 'guildResources' ? p.resources : null),
        );
        if (p.type === 'unit') {
          addResource(res, 'units', p.unit?.amount || p.amount || 1);
        } else if (p.type === 'genericReward') {
          const reward = lookup[p.reward?.id];
          applyGenericReward(reward, res);
        } else if (p.type === 'random') {
          for (const randP of p.products || []) {
            const prod = randP.product;
            const chanceBn = toBigNumber(randP.dropChance || 1);
            const rw = (v) =>
              toBigNumber(v)
                .multipliedBy(chanceBn)
                .integerValue(BigNumber.ROUND_HALF_UP)
                .toNumber();
            if (prod?.type === 'genericReward') {
              const reward = lookup[prod.reward?.id];
              applyGenericReward(reward, res, chanceBn);
            } else if (
              prod?.type === 'resources' &&
              prod.playerResources?.resources
            ) {
              for (const [k, v] of Object.entries(
                prod.playerResources.resources,
              )) {
                addResource(res, k, rw(v));
              }
            }
          }
        }
      }
    } else if (Array.isArray(meta.entity_levels)) {
      const lvlObj =
        meta.entity_levels[entity.level ?? 0] || meta.entity_levels[0];
      if (lvlObj?.production_values) {
        for (const pv of lvlObj.production_values) {
          if (pv.type && pv.value != null) {
            addResource(res, pv.type, pv.value);
          }
        }
      }
    }
  }

  // 3. ALWAYS read motivated / ability additional resources
  const isAidedOrMotivated =
    is100PercentAided || entity?.state?.is_motivated === true || !entity?.state;
  if (isAidedOrMotivated && Array.isArray(meta?.abilities)) {
    for (const a of meta.abilities) {
      if (a.additionalResources) {
        const resObjects = [];
        if (a.additionalResources.AllAge?.resources) {
          resObjects.push(a.additionalResources.AllAge.resources);
        }
        if (
          targetEra !== 'AllAge' &&
          a.additionalResources[targetEra]?.resources
        ) {
          resObjects.push(a.additionalResources[targetEra].resources);
        }
        const isTreasuryAbility =
          a.__class__ === 'AddResourcesToGuildTreasuryAbility';
        for (const resObj of resObjects) {
          for (const [k, v] of Object.entries(resObj)) {
            if (isTreasuryAbility) {
              if (k === 'clan_power') addResource(res, 'clan_power', v);
              else if (k === 'all_goods_of_age' || typeof v === 'number') {
                addResource(res, 'clan_goods', v);
              }
            } else {
              addResource(res, k, v);
            }
          }
        }
      }
      if (
        a.__class__ === 'BonusOnSetAdjacencyAbility' &&
        Array.isArray(a.bonuses) &&
        adjCount > 0
      ) {
        for (let i = 0; i < Math.min(adjCount, a.bonuses.length); i++) {
          const rev =
            a.bonuses[i].revenue?.[targetEra]?.resources ||
            a.bonuses[i].revenue?.AllAge?.resources;
          if (rev) {
            for (const [k, v] of Object.entries(rev)) addResource(res, k, v);
          }
        }
      }
      if (a.__class__ === 'ChainLinkAbility' && Array.isArray(a.bonuses)) {
        for (const b of a.bonuses) {
          const rev =
            b.revenue?.[targetEra]?.resources || b.revenue?.AllAge?.resources;
          if (rev) {
            for (const [k, v] of Object.entries(rev)) addResource(res, k, v);
          }
        }
      }
    }
  }

  return res;
}

function applyProductionBoosts({
  baseCoins = new BigNumber(0),
  baseSupplies = new BigNumber(0),
  baseBoostableFP = new BigNumber(0),
  baseUnboostableFP = new BigNumber(0),
  coinBoostPercent = new BigNumber(0),
  supplyBoostPercent = new BigNumber(0),
  fpBoostPercent = new BigNumber(0),
} = {}) {
  const coinMultiplier = new BigNumber(1).plus(coinBoostPercent.dividedBy(100));
  const totalCoins = baseCoins
    .multipliedBy(coinMultiplier)
    .integerValue(BigNumber.ROUND_FLOOR);
  const supplyMultiplier = new BigNumber(1).plus(
    supplyBoostPercent.dividedBy(100),
  );
  const totalSupplies = baseSupplies
    .multipliedBy(supplyMultiplier)
    .integerValue(BigNumber.ROUND_FLOOR);

  const { boostAmount: fpBoostAmount, total: totalDailyFP } =
    boostedForgePoints(baseBoostableFP, baseUnboostableFP, fpBoostPercent);

  return {
    coins: {
      base: baseCoins,
      boostPercent: coinBoostPercent,
      total: totalCoins,
    },
    supplies: {
      base: baseSupplies,
      boostPercent: supplyBoostPercent,
      total: totalSupplies,
    },
    fp: {
      boostable: baseBoostableFP,
      unboostable: baseUnboostableFP,
      boostPercent: fpBoostPercent,
      boostAmount: fpBoostAmount,
      total: totalDailyFP,
    },
  };
}

module.exports = {
  extractEntityProduction,
  applyProductionBoosts,
};
module.exports.default = module.exports;
