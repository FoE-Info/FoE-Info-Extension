/**
 * MilitaryBoostCalculator.js
 *
 * Military boost aggregator for Forge of Empires.
 * Computes Red (Attacking) and Blue (Defending) boost matrices across
 * Base, GBG, GE, and QI contexts with authentic, unblurred precision.
 */

const BigNumber = require('bignumber.js');
const { toBigNumber } = require('../utils/bignumberUtils.js');

function createRawBoosts() {
  return {
    att_attacker_all: new BigNumber(0),
    def_attacker_all: new BigNumber(0),
    att_attacker_gbg: new BigNumber(0),
    def_attacker_gbg: new BigNumber(0),
    att_attacker_ge: new BigNumber(0),
    def_attacker_ge: new BigNumber(0),
    att_attacker_qi: new BigNumber(0),
    def_attacker_qi: new BigNumber(0),

    // Blue Defending Boosts (STRICTLY AUTHENTIC & UNBLURRED)
    att_defender_all: new BigNumber(0),
    def_defender_all: new BigNumber(0),
    att_defender_gbg: new BigNumber(0),
    def_defender_gbg: new BigNumber(0),
    att_defender_ge: new BigNumber(0),
    def_defender_ge: new BigNumber(0),
    att_defender_qi: new BigNumber(0),
    def_defender_qi: new BigNumber(0),
  };
}

function createQiBoosts() {
  return {
    coins: new BigNumber(0),
    supplies: new BigNumber(0),
    goods: new BigNumber(0),
    actions: new BigNumber(0),
  };
}

function createProdBoosts() {
  return {
    coin: new BigNumber(0),
    supply: new BigNumber(0),
    fp: new BigNumber(0),
    goods: new BigNumber(0),
    guildGoods: new BigNumber(0),
  };
}

function tallySingleBoost(b, rawBoosts, qiBoosts = null, prodBoosts = null) {
  if (!b || !b.type || b.value == null) return;
  const type = b.type;
  const feat = b.targetedFeature || b.feature || 'all';
  const val = toBigNumber(b.value);

  if (val.isZero()) return;

  // Production boosts
  if (prodBoosts) {
    if (type === 'forge_points_production') {
      prodBoosts.fp = prodBoosts.fp.plus(val);
    } else if (type === 'goods_production') {
      prodBoosts.goods = prodBoosts.goods.plus(val);
    } else if (type === 'guild_goods_production') {
      prodBoosts.guildGoods = prodBoosts.guildGoods.plus(val);
    } else if (type === 'coin_production' || type === 'money_boost') {
      prodBoosts.coin = prodBoosts.coin.plus(val);
    } else if (type === 'supply_production' || type === 'supplies_boost') {
      prodBoosts.supply = prodBoosts.supply.plus(val);
    }
  }

  // Great Building unified military boosts
  if (type === 'military_boost') {
    rawBoosts.att_attacker_all = rawBoosts.att_attacker_all.plus(val);
    rawBoosts.def_attacker_all = rawBoosts.def_attacker_all.plus(val);
    return;
  }
  if (type === 'fierce_resistance') {
    rawBoosts.att_defender_all = rawBoosts.att_defender_all.plus(val);
    rawBoosts.def_defender_all = rawBoosts.def_defender_all.plus(val);
    return;
  }
  if (type === 'advanced_tactics') {
    rawBoosts.att_attacker_all = rawBoosts.att_attacker_all.plus(val);
    rawBoosts.def_attacker_all = rawBoosts.def_attacker_all.plus(val);
    rawBoosts.att_defender_all = rawBoosts.att_defender_all.plus(val);
    rawBoosts.def_defender_all = rawBoosts.def_defender_all.plus(val);
    return;
  }

  // Attacking Army (Red)
  if (type === 'att_boost_attacker') {
    if (feat === 'all')
      rawBoosts.att_attacker_all = rawBoosts.att_attacker_all.plus(val);
    else if (feat === 'battleground')
      rawBoosts.att_attacker_gbg = rawBoosts.att_attacker_gbg.plus(val);
    else if (feat === 'guild_expedition')
      rawBoosts.att_attacker_ge = rawBoosts.att_attacker_ge.plus(val);
    else if (feat === 'guild_raids')
      rawBoosts.att_attacker_qi = rawBoosts.att_attacker_qi.plus(val);
  } else if (type === 'def_boost_attacker') {
    if (feat === 'all')
      rawBoosts.def_attacker_all = rawBoosts.def_attacker_all.plus(val);
    else if (feat === 'battleground')
      rawBoosts.def_attacker_gbg = rawBoosts.def_attacker_gbg.plus(val);
    else if (feat === 'guild_expedition')
      rawBoosts.def_attacker_ge = rawBoosts.def_attacker_ge.plus(val);
    else if (feat === 'guild_raids')
      rawBoosts.def_attacker_qi = rawBoosts.def_attacker_qi.plus(val);
  } else if (type === 'att_def_boost_attacker' || type === 'att_def_boost') {
    if (feat === 'all') {
      rawBoosts.att_attacker_all = rawBoosts.att_attacker_all.plus(val);
      rawBoosts.def_attacker_all = rawBoosts.def_attacker_all.plus(val);
    } else if (feat === 'battleground') {
      rawBoosts.att_attacker_gbg = rawBoosts.att_attacker_gbg.plus(val);
      rawBoosts.def_attacker_gbg = rawBoosts.def_attacker_gbg.plus(val);
    } else if (feat === 'guild_expedition') {
      rawBoosts.att_attacker_ge = rawBoosts.att_attacker_ge.plus(val);
      rawBoosts.def_attacker_ge = rawBoosts.def_attacker_ge.plus(val);
    } else if (feat === 'guild_raids') {
      rawBoosts.att_attacker_qi = rawBoosts.att_attacker_qi.plus(val);
      rawBoosts.def_attacker_qi = rawBoosts.def_attacker_qi.plus(val);
    }
  }

  // Defending Army (Blue) — STRICTLY AUTHENTIC & UNBLURRED
  else if (type === 'att_boost_defender') {
    if (feat === 'all')
      rawBoosts.att_defender_all = rawBoosts.att_defender_all.plus(val);
    else if (feat === 'battleground')
      rawBoosts.att_defender_gbg = rawBoosts.att_defender_gbg.plus(val);
    else if (feat === 'guild_expedition')
      rawBoosts.att_defender_ge = rawBoosts.att_defender_ge.plus(val);
    else if (feat === 'guild_raids')
      rawBoosts.att_defender_qi = rawBoosts.att_defender_qi.plus(val);
  } else if (type === 'def_boost_defender') {
    if (feat === 'all')
      rawBoosts.def_defender_all = rawBoosts.def_defender_all.plus(val);
    else if (feat === 'battleground')
      rawBoosts.def_defender_gbg = rawBoosts.def_defender_gbg.plus(val);
    else if (feat === 'guild_expedition')
      rawBoosts.def_defender_ge = rawBoosts.def_defender_ge.plus(val);
    else if (feat === 'guild_raids')
      rawBoosts.def_defender_qi = rawBoosts.def_defender_qi.plus(val);
  } else if (type === 'att_def_boost_defender') {
    if (feat === 'all') {
      rawBoosts.att_defender_all = rawBoosts.att_defender_all.plus(val);
      rawBoosts.def_defender_all = rawBoosts.def_defender_all.plus(val);
    } else if (feat === 'battleground') {
      rawBoosts.att_defender_gbg = rawBoosts.att_defender_gbg.plus(val);
      rawBoosts.def_defender_gbg = rawBoosts.def_defender_gbg.plus(val);
    } else if (feat === 'guild_expedition') {
      rawBoosts.att_defender_ge = rawBoosts.att_defender_ge.plus(val);
      rawBoosts.def_defender_ge = rawBoosts.def_defender_ge.plus(val);
    } else if (feat === 'guild_raids') {
      rawBoosts.att_defender_qi = rawBoosts.att_defender_qi.plus(val);
      rawBoosts.def_defender_qi = rawBoosts.def_defender_qi.plus(val);
    }
  } else if (type === 'att_def_boost_attacker_defender') {
    if (feat === 'all') {
      rawBoosts.att_attacker_all = rawBoosts.att_attacker_all.plus(val);
      rawBoosts.def_attacker_all = rawBoosts.def_attacker_all.plus(val);
      rawBoosts.att_defender_all = rawBoosts.att_defender_all.plus(val);
      rawBoosts.def_defender_all = rawBoosts.def_defender_all.plus(val);
    }
  }

  // QI specific economy boosts
  else if (qiBoosts) {
    if (type === 'guild_raids_coin_boost')
      qiBoosts.coins = qiBoosts.coins.plus(val);
    else if (type === 'guild_raids_supply_boost')
      qiBoosts.supplies = qiBoosts.supplies.plus(val);
    else if (type === 'guild_raids_goods_boost')
      qiBoosts.goods = qiBoosts.goods.plus(val);
    else if (type === 'guild_raids_action_points_boost')
      qiBoosts.actions = qiBoosts.actions.plus(val);
  }
}

function extractEntityBoosts(
  entity,
  meta,
  rawBoosts,
  qiBoosts,
  prodBoosts,
  targetEra,
) {
  const boostEntries = [];

  if (Array.isArray(entity.abilities)) {
    for (const ab of entity.abilities) {
      if (ab.boost) boostEntries.push(ab.boost);
      if (Array.isArray(ab.bonuses)) {
        for (const b of ab.bonuses) {
          if (b.type && b.value != null) boostEntries.push(b);
        }
      }
    }
  }

  if (Array.isArray(meta?.abilities)) {
    for (const ab of meta.abilities) {
      if (Array.isArray(ab.boostHints)) {
        for (const bh of ab.boostHints) {
          const hintMap = bh.boostHintEraMap;
          if (hintMap) {
            const hint = hintMap[targetEra] || hintMap.AllAge;
            if (hint && hint.type && hint.value != null) {
              boostEntries.push(hint);
            }
          }
        }
      }
    }
  }

  const eraComp = meta?.components?.[targetEra] || meta?.components?.AllAge;
  if (Array.isArray(eraComp?.boosts?.boosts)) {
    boostEntries.push(...eraComp.boosts.boosts);
  }
  if (
    eraComp !== meta?.components?.AllAge &&
    Array.isArray(meta?.components?.AllAge?.boosts?.boosts)
  ) {
    boostEntries.push(...meta.components.AllAge.boosts.boosts);
  }

  if (meta?.entity_levels && entity.level != null) {
    const lvl = meta.entity_levels[entity.level];
    if (Array.isArray(lvl?.bonuses)) {
      boostEntries.push(...lvl.bonuses);
    }
  }

  for (const b of boostEntries) {
    tallySingleBoost(b, rawBoosts, qiBoosts, prodBoosts);
  }
}

function formatMilitaryBoosts(rawBoosts) {
  const redBaseAtt = rawBoosts.att_attacker_all;
  const redBaseDef = rawBoosts.def_attacker_all;
  const blueBaseAtt = rawBoosts.att_defender_all;
  const blueBaseDef = rawBoosts.def_defender_all;

  return {
    red: {
      base: { att: redBaseAtt, def: redBaseDef },
      gbg: {
        att: redBaseAtt.plus(rawBoosts.att_attacker_gbg),
        def: redBaseDef.plus(rawBoosts.def_attacker_gbg),
      },
      ge: {
        att: redBaseAtt.plus(rawBoosts.att_attacker_ge),
        def: redBaseDef.plus(rawBoosts.def_attacker_ge),
      },
      qi: { att: rawBoosts.att_attacker_qi, def: rawBoosts.def_attacker_qi },
    },
    blue: {
      base: { att: blueBaseAtt, def: blueBaseDef },
      gbg: {
        att: blueBaseAtt.plus(rawBoosts.att_defender_gbg),
        def: blueBaseDef.plus(rawBoosts.def_defender_gbg),
      },
      ge: {
        att: blueBaseAtt.plus(rawBoosts.att_defender_ge),
        def: blueBaseDef.plus(rawBoosts.def_defender_ge),
      },
      qi: { att: rawBoosts.att_defender_qi, def: rawBoosts.def_defender_qi },
    },
  };
}

module.exports = {
  createRawBoosts,
  createQiBoosts,
  createProdBoosts,
  tallySingleBoost,
  extractEntityBoosts,
  formatMilitaryBoosts,
};
module.exports.default = module.exports;
