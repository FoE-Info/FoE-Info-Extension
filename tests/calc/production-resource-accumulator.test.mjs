import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import {
  addGuildResources,
  addPlayerResources,
  applyGenericRewardToResult,
} from '../../src/js/calc/prod/productionResourceAccumulator.js';

function createBlankResult() {
  return {
    fp: new BigNumber(0),
    goods: new BigNumber(0),
    clanGoods: new BigNumber(0),
    units: new BigNumber(0),
    coins: new BigNumber(0),
    supplies: new BigNumber(0),
    isBoostable: true,
    goodsMap: {},
    goodsByEra: {},
  };
}

test('productionResourceAccumulator - addPlayerResources accumulates FP, coins, supplies', () => {
  const result = createBlankResult();
  const resObj = {
    strategy_points: 10,
    money: 500,
    supplies: 300,
  };

  addPlayerResources(
    resObj,
    result,
    1,
    true, // effectiveAided
    true, // isMotivatable
    'ModernEra',
  );

  assert.equal(result.fp.toString(), '10');
  assert.equal(result.coins.toString(), '1000'); // doubled because aided & motivatable
  assert.equal(result.supplies.toString(), '600'); // doubled
});

test('productionResourceAccumulator - addPlayerResources unaided does not double coins/supplies', () => {
  const result = createBlankResult();
  const resObj = {
    strategy_points: 5,
    money: 500,
    supplies: 300,
  };

  addPlayerResources(
    resObj,
    result,
    1,
    false, // effectiveAided = false
    true, // isMotivatable = true
    'ModernEra',
  );

  assert.equal(result.fp.toString(), '5');
  assert.equal(result.coins.toString(), '500');
  assert.equal(result.supplies.toString(), '300');
});

test('productionResourceAccumulator - addPlayerResources handles era goods and attribution', () => {
  const result = createBlankResult();
  const resObj = {
    good_current: 25,
    good_previous_age: 15,
    good_next_age: 10,
  };

  addPlayerResources(
    resObj,
    result,
    1,
    true,
    false,
    'ModernEra',
    'ProgressiveEra',
    'PostModernEra',
  );

  assert.equal(result.goods.toString(), '50');
  assert.equal(result.goodsByEra.ModernEra.toString(), '25');
  assert.equal(result.goodsByEra.ProgressiveEra.toString(), '15');
  assert.equal(result.goodsByEra.PostModernEra.toString(), '10');
});

test('productionResourceAccumulator - addGuildResources accumulates clan goods excluding clan_power', () => {
  const result = createBlankResult();
  const guildRes = {
    clan_power: 100,
    paper: 50,
    wire: 50,
  };

  addGuildResources(guildRes, result);

  assert.equal(result.clanGoods.toString(), '100');
});

test('productionResourceAccumulator - applyGenericRewardToResult handles units, strategy points, and chests', () => {
  const result = createBlankResult();

  // Unit reward
  applyGenericRewardToResult({ type: 'unit', amount: 4 }, result);
  assert.equal(result.units.toString(), '4');

  // Strategy points reward
  applyGenericRewardToResult(
    { subType: 'strategy_points', amount: 12 },
    result,
  );
  assert.equal(result.fp.toString(), '12');

  // Goods chest with drop chance
  const goodsChestReward = {
    type: 'chest',
    possible_rewards: [
      { reward: { type: 'goods', amount: 20 }, dropChance: 0.5 },
    ],
  };

  applyGenericRewardToResult(
    goodsChestReward,
    result,
    1,
    'SpaceAgeTitan',
    'SpaceAgeJupiterMoon',
    'SpaceAgeSpaceHub',
  );

  assert.equal(result.goods.toString(), '10'); // 20 * 0.5
  assert.equal(result.goodsByEra.SpaceAgeTitan.toString(), '10');

  // Unit chest
  const unitChestReward = {
    type: 'chest',
    possible_rewards: [{ reward: { type: 'unit', amount: 2 } }],
  };

  applyGenericRewardToResult(unitChestReward, result);
  assert.equal(result.units.toString(), '6'); // 4 + 2
});
