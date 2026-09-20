/**
 * productionResourceAccumulator.js
 *
 * Accumulates player resources, guild goods, and generic rewards (units, chests, FP, goods)
 * into a structured production result object.
 *
 * Adheres strictly to:
 * - BigNumber precision rule (no native floats in arithmetic).
 * - Modular architecture rule (<= 250 lines, 0 DOM references).
 * - Debuggability by Design (createLogger).
 */

const BigNumber = require('bignumber.js');
const { toBigNumber } = require('../utils/bignumberUtils.js');
const {
  NON_GOODS_KEYS,
  SPECIAL_GOODS,
} = require('../goods/goodsClassification.js');
const { createLogger } = require('../../utils/logger.js');

const logger = createLogger('prodResourceAccumulator');

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

  logger.debug('addPlayerResources applied', {
    fp: result.fp.toString(),
    coins: result.coins.toString(),
    supplies: result.supplies.toString(),
    goods: result.goods.toString(),
  });
}

function addGuildResources(guildRes, result) {
  if (!guildRes) return;
  for (const [k, v] of Object.entries(guildRes)) {
    if (k !== 'clan_power' && typeof v === 'number') {
      result.clanGoods = result.clanGoods.plus(toBigNumber(v));
    }
  }
  logger.debug('addGuildResources applied', {
    clanGoods: result.clanGoods.toString(),
  });
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

  logger.debug('applyGenericRewardToResult evaluated', {
    type: reward.type,
    subType: reward.subType,
    fp: result.fp.toString(),
    goods: result.goods.toString(),
    units: result.units.toString(),
  });
}

module.exports = {
  addPlayerResources,
  addGuildResources,
  applyGenericRewardToResult,
};
