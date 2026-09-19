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

  const maxFpBoostAmount =
    fpBoostPercent.gt(0) ?
      maxBoostableFp
        .multipliedBy(fpBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
    : new BigNumber(0);
  const maxTotalFp = maxUnboostableFp
    .plus(maxBoostableFp)
    .plus(maxFpBoostAmount);

  const curFpBoostAmount =
    fpBoostPercent.gt(0) ?
      currentBoostableFp
        .multipliedBy(fpBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
    : new BigNumber(0);
  const curTotalFp = currentUnboostableFp
    .plus(currentBoostableFp)
    .plus(curFpBoostAmount);

  const maxBoostedGoodsAmount =
    goodsBoostPercent.gt(0) ?
      maxBoostableGoods
        .multipliedBy(goodsBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
    : new BigNumber(0);
  const maxTotalGoods = maxUnboostableGoods
    .plus(maxBoostableGoods)
    .plus(maxBoostedGoodsAmount);

  const curBoostedGoodsAmount =
    goodsBoostPercent.gt(0) ?
      currentBoostableGoods
        .multipliedBy(goodsBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
    : new BigNumber(0);
  const curTotalGoods = currentUnboostableGoods
    .plus(currentBoostableGoods)
    .plus(curBoostedGoodsAmount);

  const maxGoodsByEra = {};
  for (const [eraKey, baseAmt] of Object.entries(maxBaseGoodsByEra)) {
    const boostablePart =
      maxBaseBoostableGoodsByEra[eraKey] || new BigNumber(0);
    const unboostablePart = baseAmt.minus(boostablePart);
    const boostAmt =
      goodsBoostPercent.gt(0) ?
        boostablePart
          .multipliedBy(goodsBoostPercent)
          .dividedBy(100)
          .integerValue(BigNumber.ROUND_HALF_UP)
      : new BigNumber(0);
    maxGoodsByEra[eraKey] = unboostablePart.plus(boostablePart).plus(boostAmt);
  }

  const currentGoodsByEra = {};
  for (const [eraKey, baseAmt] of Object.entries(currentBaseGoodsByEra)) {
    currentGoodsByEra[eraKey] = applyBoost(baseAmt, goodsBoostPercent);
  }

  const maxClanGoodsBoostAmount =
    guildGoodsBoostPercent.gt(0) ?
      maxBoostableClanGoods
        .dividedBy(5)
        .multipliedBy(guildGoodsBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
        .multipliedBy(5)
    : new BigNumber(0);
  const maxTotalClanGoods = maxUnboostableClanGoods
    .plus(maxBoostableClanGoods)
    .plus(maxClanGoodsBoostAmount);

  const curClanGoodsBoostAmount =
    guildGoodsBoostPercent.gt(0) ?
      currentBoostableClanGoods
        .dividedBy(5)
        .multipliedBy(guildGoodsBoostPercent)
        .dividedBy(100)
        .integerValue(BigNumber.ROUND_HALF_UP)
        .multipliedBy(5)
    : new BigNumber(0);
  const curTotalClanGoods = currentUnboostableClanGoods
    .plus(currentBoostableClanGoods)
    .plus(curClanGoodsBoostAmount);

  const maxTotalCoins = applyBoost(maxCoins, coinBoostPercent, true);
  const curTotalCoins = applyBoost(currentCoins, coinBoostPercent, true);

  const maxTotalSupplies = applyBoost(maxSupplies, supplyBoostPercent, true);
  const curTotalSupplies = applyBoost(
    currentSupplies,
    supplyBoostPercent,
    true,
  );

  const max = {
    fp: maxTotalFp,
    baseBoostableFp: maxBoostableFp,
    baseUnboostableFp: maxUnboostableFp,
    fpBoostAmount: maxFpBoostAmount,
    goods: maxTotalGoods,
    baseGoods: maxBaseGoods,
    goodsByEra: maxGoodsByEra,
    baseGoodsByEra: maxBaseGoodsByEra,
    clanGoods: maxTotalClanGoods,
    baseClanGoods: maxBaseClanGoods,
    baseBoostableClanGoods: maxBoostableClanGoods,
    baseUnboostableClanGoods: maxUnboostableClanGoods,
    clanGoodsBoostAmount: maxClanGoodsBoostAmount,
    units: maxUnits,
    coins: maxTotalCoins,
    supplies: maxTotalSupplies,
  };

  const current = {
    fp: curTotalFp,
    baseBoostableFp: currentBoostableFp,
    baseUnboostableFp: currentUnboostableFp,
    fpBoostAmount: curFpBoostAmount,
    goods: curTotalGoods,
    baseGoods: currentBaseGoods,
    goodsByEra: currentGoodsByEra,
    baseGoodsByEra: currentBaseGoodsByEra,
    clanGoods: curTotalClanGoods,
    baseClanGoods: currentBaseClanGoods,
    baseBoostableClanGoods: currentBoostableClanGoods,
    baseUnboostableClanGoods: currentUnboostableClanGoods,
    clanGoodsBoostAmount: curClanGoodsBoostAmount,
    units: currentUnits,
    coins: curTotalCoins,
    supplies: curTotalSupplies,
  };

  const resKeys = ['fp', 'goods', 'clanGoods', 'units', 'coins', 'supplies'];
  const diff = {};
  const unaided = {};
  for (const k of resKeys) {
    diff[k] = max[k].minus(current[k]);
    unaided[k] = finalizeUnaidedList(rawUnaidedMap[k]);
  }

  return {
    max,
    current,
    diff,
    unaided,
    unaidedBuildings: unaidedBuildingsList,
    maxFpBuildings,
    maxGoodsList,
    maxGoodsBuildings,
    maxClanGoodsBuildings,
  };
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
};
module.exports.default = module.exports;
