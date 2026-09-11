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
import {
  applyProductionBoosts,
  extractEntityProduction,
} from '../../src/js/calc/prod/ProductionCalculator.js';
import {
  computeChateauGoods,
  createUnitsAccumulator,
  extractSpecialBonuses,
  processEntityUnits,
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
import {
  areBuildingsAdjacent,
  computeChainLinkAdjacencies,
  computeSetAdjacencies,
} from '../../src/js/calc/utils/spatialUtils.js';
import { MetadataStore } from '../../src/js/state/MetadataStore.js';

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

  // 5 * 1.1 = 5.5 -> 6
  assert.equal(finalized.currentEra.toNumber(), 6);
  // 2 * 1.1 = 2.2 -> 2
  assert.equal(finalized.previousEra.toNumber(), 2);
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

test('Modular Calculators - GoodsCalculator GB treasury vs Event treasury', (t) => {
  const accum = createGoodsAccumulator();
  processEntityGoods({
    prodResources: {
      clan_goods: 100,
      all_goods_of_age: 10,
    },
    accum,
    playerEra: 'SpaceAgeTitan',
    isGB: true,
  });

  processEntityGoods({
    prodResources: {
      clan_goods: 50,
    },
    accum,
    playerEra: 'SpaceAgeTitan',
    isGB: false,
  });

  const finalized = finalizeGoods({
    accum,
    goodsBoostPercent: new BigNumber(10),
    guildGoodsBoostPercent: new BigNumber(20),
  });

  assert.equal(finalized.treasury.toNumber(), 170);
  assert.equal(finalized.gbTreasury.toNumber(), 110);
  assert.equal(finalized.eventTreasury.toNumber(), 60);
  assert.equal(finalized.currentEra.toNumber(), 0);
});

test('Modular Calculators - UnitCalculator penal_unit single-counting', (t) => {
  const accum = createUnitsAccumulator();
  processEntityUnits({
    entity: {
      cityentity_id: 'X_ProgressiveEra_Landmark1',
      state: { current_product: { name: 'penal_unit', amount: 80 } },
    },
    prodResources: { units: 5 },
    accum,
  });

  assert.equal(accum.trazUnits.toNumber(), 80);
  assert.equal(accum.dailyUnits.toNumber(), 85);
});

test('Modular Calculators - GoodsCalculator ignores units', (t) => {
  const accum = createGoodsAccumulator();
  processEntityGoods({
    prodResources: {
      money: 1000,
      supplies: 500,
      units: 10,
      all_goods_of_age: 25,
    },
    accum,
    playerEra: 'SpaceAgeTitan',
  });

  const finalized = finalizeGoods({
    accum,
    goodsBoostPercent: new BigNumber(0),
    guildGoodsBoostPercent: new BigNumber(0),
  });

  assert.equal(finalized.currentEra.toNumber(), 25);
  assert.equal(finalized.otherEras.toNumber(), 0);
  assert.equal(accum.otherGoods.toNumber(), 0);
});

test('Modular Calculators - ProductionCalculator excludes penal_unit from res.units', (t) => {
  const entity = {
    cityentity_id: 'X_ProgressiveEra_Landmark1',
    state: { current_product: { name: 'penal_unit', amount: 80 } },
  };
  const res = extractEntityProduction(entity, {}, 'ProgressiveEra', false);
  assert.equal(res.units, undefined);
});

test('Modular Calculators - ProductionCalculator handles genericReward unit chests', (t) => {
  const meta = {
    components: {
      SpaceAgeSpaceHub: {
        production: {
          options: [
            {
              products: [
                {
                  type: 'genericReward',
                  reward: { id: 'rw_chest_solara' },
                },
              ],
            },
          ],
        },
        lookup: {
          rewards: {
            rw_chest_solara: {
              type: 'chest',
              id: 'genb_random_unit_chest60',
              possible_rewards: [
                {
                  reward: {
                    type: 'unit',
                    amount: 60,
                  },
                },
              ],
            },
          },
        },
      },
    },
  };
  const entity = {
    id: 101,
    cityentity_id: 'W_MultiAge_NeoSolara',
    state: {},
  };
  const res = extractEntityProduction(entity, meta, 'SpaceAgeSpaceHub', true);
  assert.equal(res.units, 60);
});

test('Modular Calculators - spatialUtils set and chain link adjacencies', (t) => {
  const store = new MetadataStore();
  store.registerBuildingSets([
    {
      id: 'cherry_garden',
      buildings: ['cherry_sakura', 'cherry_rock'],
    },
  ]);
  store.registerBuildingChains([
    {
      id: 'train_chain',
      buildings: ['train_engine', 'train_car'],
    },
  ]);

  store.registerEntity({
    id: 'cherry_sakura',
    width: 3,
    length: 3,
  });
  store.registerEntity({
    id: 'cherry_rock',
    width: 2,
    length: 2,
  });
  store.registerEntity({
    id: 'train_engine',
    width: 3,
    length: 3,
    abilities: [{ __class__: 'ChainStartAbility', chainId: 'train_chain' }],
  });
  store.registerEntity({
    id: 'train_car',
    width: 2,
    length: 3,
    abilities: [{ __class__: 'ChainLinkAbility', chainId: 'train_chain' }],
  });

  const entities = [
    { id: 1, cityentity_id: 'cherry_sakura', x: 0, y: 0, width: 3, length: 3 },
    { id: 2, cityentity_id: 'cherry_rock', x: 3, y: 0, width: 2, length: 2 },
    { id: 3, cityentity_id: 'cherry_rock', x: 10, y: 10, width: 2, length: 2 }, // Disconnected
    { id: 4, cityentity_id: 'train_engine', x: 20, y: 20, width: 3, length: 3 },
    { id: 5, cityentity_id: 'train_car', x: 23, y: 20, width: 2, length: 3 }, // Adjacent to engine
    { id: 6, cityentity_id: 'train_car', x: 40, y: 40, width: 2, length: 3 }, // Disconnected chain link
  ];

  const setAdj = computeSetAdjacencies(entities, store);
  assert.equal(setAdj.get(1), 1);
  assert.equal(setAdj.get(2), 1);
  assert.equal(setAdj.get(3), 0);

  const chainAdj = computeChainLinkAdjacencies(entities, store);
  assert.equal(chainAdj.has(5), true, 'Adjacent car must be connected');
  assert.equal(
    chainAdj.has(6),
    false,
    'Disconnected car must not be connected',
  );
});
