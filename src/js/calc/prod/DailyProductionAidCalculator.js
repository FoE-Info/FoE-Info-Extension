/**
 * DailyProductionAidCalculator.js
 *
 * Evaluates city map entities for:
 * 1. Maximum potential production yields (assuming all motivatable buildings are aided).
 * 2. Current production yields (taking into account current motivation/polivation state).
 * 3. Detailed unaided building tallies per resource category (FP, goods, guild goods, units, coins, supplies)
 *    to remind players to Mass Self-Aid before collecting.
 *
 * Adheres strictly to:
 * - BigNumber precision rule (no native floats in arithmetic, half-up rounding for boosts).
 * - Modular architecture rule (< 600 lines, 0 DOM references).
 * - Debuggability by Design (createLogger).
 */

const BigNumber = require('bignumber.js');
const { toBigNumber } = require('../utils/bignumberUtils.js');
const { createLogger } = require('../../utils/logger.js');
const {
  isEntityMotivatable,
  isEntityAided,
  extractEntityProductionData,
} = require('./entityProductionParser.js');

const logger = createLogger('DailyProductionAidCalc');

function applyBoost(base, boostPercent, isFloor = false) {
  if (!boostPercent || boostPercent.lte(0)) return base;
  const mult = new BigNumber(1).plus(boostPercent.dividedBy(100));
  const rounding = isFloor ? BigNumber.ROUND_FLOOR : BigNumber.ROUND_HALF_UP;
  return base.multipliedBy(mult).integerValue(rounding);
}

function calculateDailyProductionAid({
  entities = [],
  metadataStore = null,
  CityEntityDefs = {},
  playerEra = 'SpaceAgeTitan',
  boosts = {},
  helper = null,
  ResourceDefs = [],
} = {}) {
  let maxBoostableFp = new BigNumber(0);
  let maxUnboostableFp = new BigNumber(0);
  let currentBoostableFp = new BigNumber(0);
  let currentUnboostableFp = new BigNumber(0);

  let maxBaseGoods = new BigNumber(0);
  let currentBaseGoods = new BigNumber(0);
  let maxBoostableGoods = new BigNumber(0);
  let maxUnboostableGoods = new BigNumber(0);
  let currentBoostableGoods = new BigNumber(0);
  let currentUnboostableGoods = new BigNumber(0);

  const maxBaseGoodsByEra = {};
  const maxBaseBoostableGoodsByEra = {};
  const currentBaseGoodsByEra = {};

  let maxBaseClanGoods = new BigNumber(0);
  let currentBaseClanGoods = new BigNumber(0);
  let maxBoostableClanGoods = new BigNumber(0);
  let currentBoostableClanGoods = new BigNumber(0);
  let maxUnboostableClanGoods = new BigNumber(0);
  let currentUnboostableClanGoods = new BigNumber(0);

  let maxUnits = new BigNumber(0);
  let currentUnits = new BigNumber(0);

  let maxCoins = new BigNumber(0);
  let currentCoins = new BigNumber(0);

  let maxSupplies = new BigNumber(0);
  let currentSupplies = new BigNumber(0);

  const maxFpBuildings = [];
  const maxGoodsList = {};
  const maxGoodsBuildings = [];
  const maxClanGoodsBuildings = [];

  const rawUnaidedMap = {
    fp: new Map(),
    goods: new Map(),
    clanGoods: new Map(),
    units: new Map(),
    coins: new Map(),
    supplies: new Map(),
  };

  const unaidedBuildingsList = [];

  const resourceDefMap = new Map();
  if (Array.isArray(ResourceDefs)) {
    for (const r of ResourceDefs) {
      if (r && r.id) resourceDefMap.set(r.id, r);
    }
  }

  for (const entity of entities) {
    if (!entity) continue;
    const eid = entity.cityentity_id || entity.id;
    if (!eid) continue;

    const meta =
      CityEntityDefs[eid] ||
      (metadataStore && typeof metadataStore.getEntity === 'function' ?
        metadataStore.getEntity(eid)
      : null);

    const bName =
      helper?.fEntityNameTrim ? helper.fEntityNameTrim(eid) : meta?.name || eid;

    const isMotivatable = isEntityMotivatable(entity, meta);
    const isAided = isEntityAided(entity, meta);

    const maxProd = extractEntityProductionData(entity, meta, playerEra, {
      forceAided: true,
      helper,
      ResourceDefs,
      resourceDefMap,
    });

    const curProd = extractEntityProductionData(entity, meta, playerEra, {
      forceAided: false,
      helper,
      ResourceDefs,
      resourceDefMap,
    });

    if (maxProd.isBoostable) {
      maxBoostableFp = maxBoostableFp.plus(maxProd.fp);
      currentBoostableFp = currentBoostableFp.plus(curProd.fp);
      maxBoostableGoods = maxBoostableGoods.plus(maxProd.goods);
      currentBoostableGoods = currentBoostableGoods.plus(curProd.goods);
      maxBoostableClanGoods = maxBoostableClanGoods.plus(maxProd.clanGoods);
      currentBoostableClanGoods = currentBoostableClanGoods.plus(
        curProd.clanGoods,
      );
    } else {
      maxUnboostableFp = maxUnboostableFp.plus(maxProd.fp);
      currentUnboostableFp = currentUnboostableFp.plus(curProd.fp);
      maxUnboostableGoods = maxUnboostableGoods.plus(maxProd.goods);
      currentUnboostableGoods = currentUnboostableGoods.plus(curProd.goods);
      maxUnboostableClanGoods = maxUnboostableClanGoods.plus(maxProd.clanGoods);
      currentUnboostableClanGoods = currentUnboostableClanGoods.plus(
        curProd.clanGoods,
      );
    }

    if (maxProd.goodsByEra) {
      for (const [eraKey, amtBn] of Object.entries(maxProd.goodsByEra)) {
        maxBaseGoodsByEra[eraKey] = (
          maxBaseGoodsByEra[eraKey] || new BigNumber(0)
        ).plus(amtBn);
        if (maxProd.isBoostable) {
          maxBaseBoostableGoodsByEra[eraKey] = (
            maxBaseBoostableGoodsByEra[eraKey] || new BigNumber(0)
          ).plus(amtBn);
        }
      }
    }

    if (curProd.goodsByEra) {
      for (const [eraKey, amtBn] of Object.entries(curProd.goodsByEra)) {
        currentBaseGoodsByEra[eraKey] = (
          currentBaseGoodsByEra[eraKey] || new BigNumber(0)
        ).plus(amtBn);
      }
    }

    if (maxProd.fp.gt(0)) {
      maxFpBuildings.push({
        id: eid,
        name: bName,
        fp: maxProd.fp.toNumber(),
        isBoostable: maxProd.isBoostable,
      });
    }

    maxBaseGoods = maxBaseGoods.plus(maxProd.goods);
    currentBaseGoods = currentBaseGoods.plus(curProd.goods);
    if (maxProd.goods.gt(0)) {
      maxGoodsBuildings.push({
        id: eid,
        name: bName,
        goods: maxProd.goods.toNumber(),
      });
      for (const [gKey, gAmt] of Object.entries(maxProd.goodsMap)) {
        maxGoodsList[gKey] = (maxGoodsList[gKey] || 0) + gAmt;
      }
    }

    maxBaseClanGoods = maxBaseClanGoods.plus(maxProd.clanGoods);
    currentBaseClanGoods = currentBaseClanGoods.plus(curProd.clanGoods);
    if (maxProd.clanGoods.gt(0)) {
      maxClanGoodsBuildings.push({
        id: eid,
        name: bName,
        goods: maxProd.clanGoods.toNumber(),
        baseGoods: maxProd.clanGoods.toNumber(),
        isBoostable: maxProd.isBoostable,
      });
    }

    maxUnits = maxUnits.plus(maxProd.units);
    currentUnits = currentUnits.plus(curProd.units);

    maxCoins = maxCoins.plus(maxProd.coins);
    currentCoins = currentCoins.plus(curProd.coins);

    maxSupplies = maxSupplies.plus(maxProd.supplies);
    currentSupplies = currentSupplies.plus(curProd.supplies);

    if (isMotivatable && !isAided) {
      const diffs = {
        fp: maxProd.fp.minus(curProd.fp),
        goods: maxProd.goods.minus(curProd.goods),
        clanGoods: maxProd.clanGoods.minus(curProd.clanGoods),
        units: maxProd.units.minus(curProd.units),
        coins: maxProd.coins.minus(curProd.coins),
        supplies: maxProd.supplies.minus(curProd.supplies),
      };

      if (Object.values(diffs).some((d) => d.gt(0))) {
        unaidedBuildingsList.push({
          id: eid,
          name: bName,
          diffFp: diffs.fp.toNumber(),
          diffGoods: diffs.goods.toNumber(),
          diffClanGoods: diffs.clanGoods.toNumber(),
          diffUnits: diffs.units.toNumber(),
          diffCoins: diffs.coins.toNumber(),
          diffSupplies: diffs.supplies.toNumber(),
        });

        for (const [resKey, diffVal] of Object.entries(diffs)) {
          recordUnaided(rawUnaidedMap[resKey], bName, diffVal);
        }
      }
    }
  }

  const resKeys = ['fp', 'goods', 'clanGoods', 'units', 'coins', 'supplies'];
  const diff = {};
  const unaided = {};
  for (const k of resKeys) {
    diff[k] = new BigNumber(0);
    unaided[k] = finalizeUnaidedList(rawUnaidedMap[k]);
  }

  const aidStats = {
    max: {
      fp: new BigNumber(0),
      baseBoostableFp: maxBoostableFp,
      baseUnboostableFp: maxUnboostableFp,
      fpBoostAmount: new BigNumber(0),
      goods: new BigNumber(0),
      baseGoods: maxBaseGoods,
      baseBoostableGoods: maxBoostableGoods,
      baseUnboostableGoods: maxUnboostableGoods,
      goodsByEra: {},
      baseGoodsByEra: maxBaseGoodsByEra,
      baseBoostableGoodsByEra: maxBaseBoostableGoodsByEra,
      clanGoods: new BigNumber(0),
      baseClanGoods: maxBaseClanGoods,
      baseBoostableClanGoods: maxBoostableClanGoods,
      baseUnboostableClanGoods: maxUnboostableClanGoods,
      clanGoodsBoostAmount: new BigNumber(0),
      units: maxUnits,
      coins: new BigNumber(0),
      baseCoins: maxCoins,
      supplies: new BigNumber(0),
      baseSupplies: maxSupplies,
    },
    current: {
      fp: new BigNumber(0),
      baseBoostableFp: currentBoostableFp,
      baseUnboostableFp: currentUnboostableFp,
      fpBoostAmount: new BigNumber(0),
      goods: new BigNumber(0),
      baseGoods: currentBaseGoods,
      baseBoostableGoods: currentBoostableGoods,
      baseUnboostableGoods: currentUnboostableGoods,
      goodsByEra: {},
      baseGoodsByEra: currentBaseGoodsByEra,
      clanGoods: new BigNumber(0),
      baseClanGoods: currentBaseClanGoods,
      baseBoostableClanGoods: currentBoostableClanGoods,
      baseUnboostableClanGoods: currentUnboostableClanGoods,
      clanGoodsBoostAmount: new BigNumber(0),
      units: currentUnits,
      coins: new BigNumber(0),
      baseCoins: currentCoins,
      supplies: new BigNumber(0),
      baseSupplies: currentSupplies,
    },
    diff,
    unaided,
    unaidedBuildings: unaidedBuildingsList,
    maxFpBuildings,
    maxGoodsList,
    maxGoodsBuildings,
    maxClanGoodsBuildings,
  };

  return recalculateAidStatsBoosts(aidStats, boosts);
}

function recalculateAidStatsBoosts(aidStats, boosts = {}) {
  if (!aidStats || !aidStats.max || !aidStats.current) return aidStats;

  const fpBoostPercent = toBigNumber(
    boosts.fp || boosts.fpProductionBoost || 0,
  );
  const goodsBoostPercent = toBigNumber(
    boosts.goods || boosts.goodsProductionBoost || 0,
  );
  const guildGoodsBoostPercent = toBigNumber(
    boosts.guildGoods || boosts.guildGoodsProductionBoost || 0,
  );
  const coinBoostPercent = toBigNumber(boosts.coin || boosts.CoinBoost || 0);
  const supplyBoostPercent = toBigNumber(
    boosts.supply || boosts.SupplyBoost || 0,
  );

  // FP
  const maxFpBoostAmount =
    fpBoostPercent.gt(0) && aidStats.max.baseBoostableFp ?
      aidStats.max.baseBoostableFp
        .multipliedBy(fpBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
    : new BigNumber(0);
  aidStats.max.fpBoostAmount = maxFpBoostAmount;
  aidStats.max.fp = (aidStats.max.baseUnboostableFp || new BigNumber(0))
    .plus(aidStats.max.baseBoostableFp || new BigNumber(0))
    .plus(maxFpBoostAmount);

  const curFpBoostAmount =
    fpBoostPercent.gt(0) && aidStats.current.baseBoostableFp ?
      aidStats.current.baseBoostableFp
        .multipliedBy(fpBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
    : new BigNumber(0);
  aidStats.current.fpBoostAmount = curFpBoostAmount;
  aidStats.current.fp = (aidStats.current.baseUnboostableFp || new BigNumber(0))
    .plus(aidStats.current.baseBoostableFp || new BigNumber(0))
    .plus(curFpBoostAmount);

  // Goods
  const maxBoostedGoodsAmount =
    goodsBoostPercent.gt(0) && aidStats.max.baseBoostableGoods ?
      aidStats.max.baseBoostableGoods
        .multipliedBy(goodsBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
    : new BigNumber(0);
  aidStats.max.goods = (aidStats.max.baseUnboostableGoods || new BigNumber(0))
    .plus(aidStats.max.baseBoostableGoods || new BigNumber(0))
    .plus(maxBoostedGoodsAmount);

  const curBoostedGoodsAmount =
    goodsBoostPercent.gt(0) && aidStats.current.baseBoostableGoods ?
      aidStats.current.baseBoostableGoods
        .multipliedBy(goodsBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
    : new BigNumber(0);
  aidStats.current.goods = (
    aidStats.current.baseUnboostableGoods || new BigNumber(0)
  )
    .plus(aidStats.current.baseBoostableGoods || new BigNumber(0))
    .plus(curBoostedGoodsAmount);

  if (aidStats.max.baseGoodsByEra) {
    aidStats.max.goodsByEra = {};
    for (const [eraKey, baseAmt] of Object.entries(
      aidStats.max.baseGoodsByEra,
    )) {
      const boostablePart =
        aidStats.max.baseBoostableGoodsByEra?.[eraKey] || new BigNumber(0);
      const unboostablePart = baseAmt.minus(boostablePart);
      const boostAmt =
        goodsBoostPercent.gt(0) ?
          boostablePart
            .multipliedBy(goodsBoostPercent)
            .dividedBy(100)
            .integerValue(BigNumber.ROUND_HALF_UP)
        : new BigNumber(0);
      aidStats.max.goodsByEra[eraKey] = unboostablePart
        .plus(boostablePart)
        .plus(boostAmt);
    }
  }

  if (aidStats.current.baseGoodsByEra) {
    aidStats.current.goodsByEra = {};
    for (const [eraKey, baseAmt] of Object.entries(
      aidStats.current.baseGoodsByEra,
    )) {
      aidStats.current.goodsByEra[eraKey] = applyBoost(
        baseAmt,
        goodsBoostPercent,
      );
    }
  }

  // Clan Goods
  const maxClanGoodsBoostAmount =
    guildGoodsBoostPercent.gt(0) && aidStats.max.baseBoostableClanGoods ?
      aidStats.max.baseBoostableClanGoods
        .dividedBy(5)
        .multipliedBy(guildGoodsBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
        .multipliedBy(5)
    : new BigNumber(0);
  aidStats.max.clanGoodsBoostAmount = maxClanGoodsBoostAmount;
  aidStats.max.clanGoods = (
    aidStats.max.baseUnboostableClanGoods || new BigNumber(0)
  )
    .plus(aidStats.max.baseBoostableClanGoods || new BigNumber(0))
    .plus(maxClanGoodsBoostAmount);

  const curClanGoodsBoostAmount =
    guildGoodsBoostPercent.gt(0) && aidStats.current.baseBoostableClanGoods ?
      aidStats.current.baseBoostableClanGoods
        .dividedBy(5)
        .multipliedBy(guildGoodsBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
        .multipliedBy(5)
    : new BigNumber(0);
  aidStats.current.clanGoodsBoostAmount = curClanGoodsBoostAmount;
  aidStats.current.clanGoods = (
    aidStats.current.baseUnboostableClanGoods || new BigNumber(0)
  )
    .plus(aidStats.current.baseBoostableClanGoods || new BigNumber(0))
    .plus(curClanGoodsBoostAmount);

  // Coins & Supplies
  if (aidStats.max.baseCoins) {
    aidStats.max.coins = applyBoost(
      aidStats.max.baseCoins,
      coinBoostPercent,
      true,
    );
  }
  if (aidStats.current.baseCoins) {
    aidStats.current.coins = applyBoost(
      aidStats.current.baseCoins,
      coinBoostPercent,
      true,
    );
  }
  if (aidStats.max.baseSupplies) {
    aidStats.max.supplies = applyBoost(
      aidStats.max.baseSupplies,
      supplyBoostPercent,
      true,
    );
  }
  if (aidStats.current.baseSupplies) {
    aidStats.current.supplies = applyBoost(
      aidStats.current.baseSupplies,
      supplyBoostPercent,
      true,
    );
  }

  // Diffs
  if (!aidStats.diff) aidStats.diff = {};
  for (const k of ['fp', 'goods', 'clanGoods', 'units', 'coins', 'supplies']) {
    if (aidStats.max[k] && aidStats.current[k]) {
      aidStats.diff[k] = aidStats.max[k].minus(aidStats.current[k]);
    }
  }

  return aidStats;
}

function recordUnaided(map, name, diffBn) {
  if (!diffBn || !diffBn.gt(0)) return;
  const existing = map.get(name);
  if (existing) {
    existing.count += 1;
    existing.diff = existing.diff.plus(diffBn);
  } else {
    map.set(name, {
      name,
      count: 1,
      diff: diffBn,
    });
  }
}

function finalizeUnaidedList(map) {
  const list = Array.from(map.values()).map((item) => ({
    name: item.name,
    count: item.count,
    diff: item.diff.toNumber(),
  }));
  list.sort((a, b) => b.diff - a.diff);
  return list;
}

module.exports = {
  isEntityMotivatable,
  isEntityAided,
  extractEntityProductionData,
  calculateDailyProductionAid,
  recalculateAidStatsBoosts,
};
module.exports.default = module.exports;
