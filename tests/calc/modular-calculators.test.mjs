/**
 * modular-calculators.test.mjs
 *
 * Unit tests verifying modular sub-calculators in src/js/calc/.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import {
  createRawBoosts,
  formatMilitaryBoosts,
  tallySingleBoost,
} from '../../src/js/calc/boosts/MilitaryBoostCalculator.js';
import {
  createGoodsAccumulator,
  finalizeGoods,
  processEntityGoods,
} from '../../src/js/calc/goods/GoodsCalculator.js';
import { applyProductionBoosts } from '../../src/js/calc/prod/ProductionCalculator.js';
import {
  computeChateauGoods,
  extractSpecialBonuses,
} from '../../src/js/calc/units/UnitCalculator.js';
import { toBigNumber } from '../../src/js/calc/utils/bignumberUtils.js';
import {
  cleanBaseEntityId,
  ERAS,
  getBuildingEra,
  getEraIndex,
  getNextEra,
  getPreviousEra,
} from '../../src/js/calc/utils/eraUtils.js';
import { areBuildingsAdjacent } from '../../src/js/calc/utils/spatialUtils.js';

test('Modular Calculators - eraUtils', (t) => {
  assert.equal(ERAS[0], 'StoneAge');
  assert.equal(getEraIndex('StoneAge'), 0);
  assert.equal(getPreviousEra('IronAge'), 'BronzeAge');
  assert.equal(getPreviousEra('BronzeAge'), null);
  assert.equal(getNextEra('BronzeAge'), 'IronAge');
  assert.equal(
    getBuildingEra({ cityentity_id: 'W_SpaceAgeTitan_Residential1' }),
    'SpaceAgeTitan',
  );
  assert.equal(
    cleanBaseEntityId('building_entity_W_MultiAge_Tower1'),
    'Tower1',
  );
});

test('Modular Calculators - bignumberUtils', (t) => {
  assert.equal(toBigNumber(123).toNumber(), 123);
  assert.equal(toBigNumber('456.78').toNumber(), 456.78);
  assert.equal(toBigNumber(null).toNumber(), 0);
  assert.equal(toBigNumber(undefined).toNumber(), 0);
  assert.equal(toBigNumber('invalid').toNumber(), 0);
  const bn = new BigNumber(99);
  assert.strictEqual(toBigNumber(bn), bn);
});

test('Modular Calculators - spatialUtils', (t) => {
  const b1 = { x: 0, y: 0, width: 2, length: 2 };
  const b2 = { x: 2, y: 0, width: 2, length: 2 }; // Right adjacent
  const b3 = { x: 0, y: 2, width: 2, length: 2 }; // Bottom adjacent
  const b4 = { x: 5, y: 5, width: 2, length: 2 }; // Not adjacent

  assert.equal(areBuildingsAdjacent(b1, b2), true);
  assert.equal(areBuildingsAdjacent(b1, b3), true);
  assert.equal(areBuildingsAdjacent(b1, b4), false);
  assert.equal(areBuildingsAdjacent(null, b1), false);
});

test('Modular Calculators - MilitaryBoostCalculator', (t) => {
  const raw = createRawBoosts();
  tallySingleBoost(
    { type: 'att_boost_attacker', targetedFeature: 'all', value: 20 },
    raw,
  );
  tallySingleBoost(
    { type: 'att_boost_attacker', targetedFeature: 'battleground', value: 15 },
    raw,
  );
  tallySingleBoost(
    { type: 'def_boost_defender', targetedFeature: 'all', value: 30 },
    raw,
  );

  const formatted = formatMilitaryBoosts(raw);
  assert.equal(formatted.red.base.att.toNumber(), 20);
  assert.equal(formatted.red.gbg.att.toNumber(), 35);
  assert.equal(formatted.blue.base.def.toNumber(), 30);
});

test('Modular Calculators - ProductionCalculator', (t) => {
  const res = applyProductionBoosts({
    baseCoins: new BigNumber(1000),
    baseSupplies: new BigNumber(500),
    baseBoostableFP: new BigNumber(10),
    baseUnboostableFP: new BigNumber(5),
    coinBoostPercent: new BigNumber(50),
    supplyBoostPercent: new BigNumber(100),
    fpBoostPercent: new BigNumber(20),
  });

  assert.equal(res.coins.total.toNumber(), 1500);
  assert.equal(res.supplies.total.toNumber(), 1000);
  assert.equal(res.fp.boostAmount.toNumber(), 2);
  assert.equal(res.fp.total.toNumber(), 17);
});

test('Modular Calculators - GoodsCalculator', (t) => {
  const accum = createGoodsAccumulator();
  processEntityGoods({
    prodResources: {
      all_goods_of_age: 5, // 25
      all_goods_of_previous_age: 2, // 10
      clan_goods: 50,
    },
    accum,
    playerEra: 'SpaceAgeTitan',
    prevEra: 'SpaceAgeJupiterMoon',
    nextEra: 'SpaceAgeSpaceHub',
  });

  const finalized = finalizeGoods({
    accum,
    goodsBoostPercent: new BigNumber(10),
    guildGoodsBoostPercent: new BigNumber(20),
  });

  // 25 * 1.1 = 27.5 -> 28
  assert.equal(finalized.currentEra.toNumber(), 28);
  // 10 * 1.1 = 11
  assert.equal(finalized.previousEra.toNumber(), 11);
  // 50 * 1.2 = 60
  assert.equal(finalized.treasury.toNumber(), 60);
});

test('Modular Calculators - UnitCalculator', (t) => {
  assert.equal(computeChateauGoods(new BigNumber(500)).toNumber(), 30);
  assert.equal(computeChateauGoods(new BigNumber(0)).toNumber(), 5);

  const special = extractSpecialBonuses({
    entity: { cityentity_id: 'X_FutureEra_Landmark1', level: 80 },
    meta: { entity_levels: [{ bonuses: [{ value: 90 }] }] },
    level: 0,
  });
  assert.equal(special.arcBonusPercent.toNumber(), 90);
});
