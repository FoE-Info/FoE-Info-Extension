import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import BigNumber from 'bignumber.js';

const require = createRequire(import.meta.url);
const {
  applyBoost,
  recordUnaided,
  finalizeUnaidedList,
  recalculateAidStatsBoosts,
} = require('../../src/js/calc/prod/aidStatsBoostCalculator.js');

test('aidStatsBoostCalculator suite', async (t) => {
  await t.test(
    'applyBoost correctly handles percentage boosts and rounding',
    () => {
      const base = new BigNumber(100);
      // Zero or negative boost
      assert.equal(applyBoost(base, new BigNumber(0)).toNumber(), 100);
      assert.equal(applyBoost(base, new BigNumber(-10)).toNumber(), 100);

      // 50% boost -> 150
      assert.equal(applyBoost(base, new BigNumber(50)).toNumber(), 150);

      // Half-up rounding vs floor rounding
      // 33 * 1.05 = 34.65 -> half-up: 35, floor: 34
      const smallBase = new BigNumber(33);
      assert.equal(
        applyBoost(smallBase, new BigNumber(5), false).toNumber(),
        35,
      );
      assert.equal(
        applyBoost(smallBase, new BigNumber(5), true).toNumber(),
        34,
      );
    },
  );

  await t.test(
    'recordUnaided and finalizeUnaidedList aggregate and sort differences',
    () => {
      const map = new Map();
      recordUnaided(map, 'Building A', new BigNumber(10));
      recordUnaided(map, 'Building A', new BigNumber(5));
      recordUnaided(map, 'Building B', new BigNumber(25));
      // Zero/negative ignored
      recordUnaided(map, 'Building C', new BigNumber(0));

      const list = finalizeUnaidedList(map);
      assert.equal(list.length, 2);
      // Sorted descending by diff: B (25) then A (15)
      assert.equal(list[0].name, 'Building B');
      assert.equal(list[0].diff, 25);
      assert.equal(list[0].count, 1);

      assert.equal(list[1].name, 'Building A');
      assert.equal(list[1].diff, 15);
      assert.equal(list[1].count, 2);
    },
  );

  await t.test(
    'recalculateAidStatsBoosts applies boosts across FP, Goods, Clan Goods, and calculates diffs',
    () => {
      const aidStats = {
        max: {
          baseBoostableFp: new BigNumber(100),
          baseUnboostableFp: new BigNumber(20),
          baseGoods: new BigNumber(50),
          baseBoostableGoods: new BigNumber(50),
          baseUnboostableGoods: new BigNumber(0),
          baseClanGoods: new BigNumber(25),
          baseBoostableClanGoods: new BigNumber(25),
          baseUnboostableClanGoods: new BigNumber(0),
          baseCoins: new BigNumber(1000),
          baseSupplies: new BigNumber(500),
          units: new BigNumber(8),
        },
        current: {
          baseBoostableFp: new BigNumber(50),
          baseUnboostableFp: new BigNumber(20),
          baseGoods: new BigNumber(25),
          baseBoostableGoods: new BigNumber(25),
          baseUnboostableGoods: new BigNumber(0),
          baseClanGoods: new BigNumber(10),
          baseBoostableClanGoods: new BigNumber(10),
          baseUnboostableClanGoods: new BigNumber(0),
          baseCoins: new BigNumber(500),
          baseSupplies: new BigNumber(250),
          units: new BigNumber(4),
        },
        diff: {},
      };

      const boosts = {
        fp: 10, // 10%
        goods: 20, // 20%
        guildGoods: 40, // 40%
        coin: 50, // 50%
        supply: 100, // 100%
      };

      const result = recalculateAidStatsBoosts(aidStats, boosts);

      // Max FP: 20 (unboostable) + 100 (boostable) + 10 (boost 10%) = 130
      assert.equal(result.max.fp.toNumber(), 130);
      // Current FP: 20 (unboostable) + 50 (boostable) + 5 (boost 10%) = 75
      assert.equal(result.current.fp.toNumber(), 75);
      // FP Diff: 130 - 75 = 55
      assert.equal(result.diff.fp.toNumber(), 55);

      // Max Goods: 0 + 50 + 10 (20% of 50) = 60
      assert.equal(result.max.goods.toNumber(), 60);
      // Current Goods: 0 + 25 + 5 (20% of 25) = 30
      assert.equal(result.current.goods.toNumber(), 30);
      // Goods Diff: 60 - 30 = 30
      assert.equal(result.diff.goods.toNumber(), 30);

      // Clan Goods: 25 / 5 = 5 sets of 5 -> 5 * 40% = 2 sets boosted = 10 boosted -> 25 + 10 = 35
      assert.equal(result.max.clanGoods.toNumber(), 35);

      // Coins: 1000 + 50% = 1500
      assert.equal(result.max.coins.toNumber(), 1500);
      // Supplies: 500 + 100% = 1000
      assert.equal(result.max.supplies.toNumber(), 1000);
    },
  );
});
