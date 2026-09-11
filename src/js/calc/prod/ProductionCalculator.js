/**
 * ProductionCalculator.js
 *
 * Daily resource production extraction and boost calculations for Forge of Empires.
 * Computes Coins, Supplies, Strategy Points (FP), and clan power yields.
 */

const BigNumber = require('bignumber.js');
const { toBigNumber } = require('../utils/bignumberUtils.js');

function extractEntityProduction(
  entity,
  meta,
  targetEra,
  is100PercentAided = false,
) {
  const res = {};

  // 1. From active state (own city only)
  if (!is100PercentAided) {
    const currentProduct = entity.state?.current_product;
    if (currentProduct) {
      if (currentProduct.product?.resources) {
        Object.assign(res, currentProduct.product.resources);
      }
      if (currentProduct.guildProduct?.resources) {
        for (const [k, v] of Object.entries(
          currentProduct.guildProduct.resources,
        )) {
          res[k] = (res[k] || 0) + v;
        }
      }
      if (currentProduct.goods?.name === 'clan_goods') {
        res.clan_goods =
          (res.clan_goods || 0) + (currentProduct.goods.value || 0);
      }
    }

    const prodOption = entity.state?.productionOption;
    if (prodOption?.products) {
      const pList =
        Array.isArray(prodOption.products) ?
          prodOption.products
        : prodOption.products.array || [];
      for (const p of pList) {
        if (p.playerResources?.resources) {
          for (const [k, v] of Object.entries(p.playerResources.resources)) {
            res[k] = (res[k] || 0) + v;
          }
        }
        const guildRes =
          p.guildResources?.resources ||
          p.guildProduct?.resources ||
          (p.type === 'guildResources' ? p.resources : null);
        if (guildRes) {
          for (const [k, v] of Object.entries(guildRes)) {
            if (k === 'clan_power') {
              res.clan_power = (res.clan_power || 0) + v;
            } else if (k === 'all_goods_of_age') {
              res.clan_goods = (res.clan_goods || 0) + v * 5;
            } else if (typeof v === 'number') {
              res.clan_goods = (res.clan_goods || 0) + v;
            }
          }
        }
      }
    }
  }

  // 2. Fallback / 100% aided yield from metadata
  if (Object.keys(res).length === 0 && meta) {
    const eraComp = meta.components?.[targetEra] || meta.components?.AllAge;
    const lookup =
      meta.components?.[targetEra]?.lookup?.rewards ||
      meta.components?.AllAge?.lookup?.rewards ||
      {};

    if (eraComp?.production?.options?.[0]?.products) {
      const pList = eraComp.production.options[0].products;
      for (const p of pList) {
        if (p.playerResources?.resources) {
          for (const [k, v] of Object.entries(p.playerResources.resources)) {
            res[k] = (res[k] || 0) + v;
          }
        }
        const guildRes =
          p.guildResources?.resources ||
          p.guildProduct?.resources ||
          (p.type === 'guildResources' ? p.resources : null);
        if (guildRes) {
          for (const [k, v] of Object.entries(guildRes)) {
            if (k === 'clan_power') {
              res.clan_power = (res.clan_power || 0) + v;
            } else if (k === 'all_goods_of_age') {
              res.clan_goods = (res.clan_goods || 0) + v * 5;
            } else if (typeof v === 'number') {
              res.clan_goods = (res.clan_goods || 0) + v;
            }
          }
        }
        if (p.type === 'unit') {
          res.units = (res.units || 0) + (p.unit?.amount || p.amount || 1);
        } else if (p.type === 'genericReward') {
          const reward = lookup[p.reward?.id];
          if (reward?.type === 'unit') {
            res.units = (res.units || 0) + (reward.amount || 1);
          } else if (reward?.subType === 'strategy_points') {
            res.strategy_points =
              (res.strategy_points || 0) + (reward.amount || 0);
          } else if (reward?.type === 'goods') {
            res.random_good_of_age =
              (res.random_good_of_age || 0) + (reward.amount || 0);
          }
        } else if (p.type === 'random') {
          for (const randP of p.products || []) {
            const prod = randP.product;
            const chance = randP.dropChance || 1;
            if (prod?.type === 'genericReward') {
              const reward = lookup[prod.reward?.id];
              if (reward?.type === 'unit') {
                res.units =
                  (res.units || 0) + Math.round((reward.amount || 1) * chance);
              } else if (reward?.subType === 'strategy_points') {
                res.strategy_points =
                  (res.strategy_points || 0) +
                  Math.round((reward.amount || 0) * chance);
              } else if (reward?.type === 'goods') {
                res.random_good_of_age =
                  (res.random_good_of_age || 0) +
                  Math.round((reward.amount || 0) * chance);
              }
            } else if (
              prod?.type === 'resources' &&
              prod.playerResources?.resources
            ) {
              for (const [k, v] of Object.entries(
                prod.playerResources.resources,
              )) {
                res[k] = (res[k] || 0) + Math.round(v * chance);
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
            res[pv.type] = (res[pv.type] || 0) + pv.value;
          }
        }
      }
    }

    if (Array.isArray(meta.abilities)) {
      for (const a of meta.abilities) {
        if (a.additionalResources) {
          const addRes =
            a.additionalResources[targetEra]?.resources ||
            a.additionalResources.AllAge?.resources;
          if (addRes) {
            for (const [k, v] of Object.entries(addRes)) {
              res[k] = (res[k] || 0) + v;
            }
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

  const fpBoostAmount = baseBoostableFP
    .multipliedBy(fpBoostPercent)
    .dividedBy(100)
    .integerValue(BigNumber.ROUND_HALF_UP);
  const totalDailyFP = baseUnboostableFP
    .plus(baseBoostableFP)
    .plus(fpBoostAmount);

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
