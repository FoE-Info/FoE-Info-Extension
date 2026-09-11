import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import { calculateInvestments } from '../../src/js/calc/InvestedCalculator.js';

test('InvestedCalculator Test Suite', async (t) => {
  const sampleData = [
    {
      // Safe spot: 631 >= 2860 - 2662 (198 remaining) -> Safe!
      entity_id: 101,
      city_entity_id: 'X_LateMiddleAge_Landmark3',
      name: 'Castel del Monte',
      player: { player_id: 1001, name: 'Red Ginge' },
      forge_points: 631,
      current_progress: 2662,
      max_progress: 2860,
      reward: { strategy_point_amount: 365, blueprints: 10, medals: 1000 },
      rank: 2,
    },
    {
      // Unsafe spot: 100 < 1000 - 200 (800 remaining) -> Unsafe!
      entity_id: 102,
      city_entity_id: 'X_SpaceAgeTitan_Landmark1',
      name: 'Saturn VI Gate',
      player: { player_id: 1002, name: 'Mighty King Don' },
      forge_points: 100,
      current_progress: 200,
      max_progress: 1000,
      reward: { strategy_point_amount: 100 },
      rank: 1,
    },
    {
      // Another safe spot: 200 >= 500 - 400 (100 remaining) -> Safe!
      entity_id: 103,
      city_entity_id: 'X_Future_Landmark1',
      name: 'The Arc',
      player: { player_id: 1003, name: 'Alice' },
      forge_points: 200,
      current_progress: 400,
      max_progress: 500,
      reward: { strategy_point_amount: 150 },
      rank: 1,
    },
  ];

  await t.test(
    'calculates standard totals with 100% Arc bonus (no hidden, all profit)',
    () => {
      // Arc 100% -> Multiplier = 2.0
      // Item 1: 365 * 2 = 730 return -> Profit: 730 - 631 = +99
      // Item 2: 100 * 2 = 200 return -> Profit: 200 - 100 = +100
      // Item 3: 150 * 2 = 300 return -> Profit: 300 - 200 = +100
      // Total Invested = 631 + 100 + 200 = 931
      // Total Return = 730 + 200 + 300 = 1230
      // Net Profit = 99 + 100 + 100 = 299
      const res = calculateInvestments(sampleData, 100, [], {
        showHiddenGb: false,
        calculateOnlySafeProfit: false,
      });

      assert.equal(res.totalInvested, 931);
      assert.equal(res.totalReturn, 1230);
      assert.equal(res.netProfitLoss, 299);
      assert.equal(res.results.length, 3);
      assert.equal(res.results[0].is_safe, true);
      assert.equal(res.results[1].is_safe, false);
      assert.equal(res.results[2].is_safe, true);
    },
  );

  await t.test(
    'excludes unsafe profit when calculateOnlySafeProfit is true',
    () => {
      // With calculateOnlySafeProfit = true:
      // Item 2 is unsafe: profit counts as 0 (return counts as invested 100)
      // Item 1 profit: +99
      // Item 2 profit: 0 (unsafe excluded)
      // Item 3 profit: +100
      // Total Invested = 931
      // Total Return = 730 + 100 + 300 = 1130
      // Net Profit = 99 + 0 + 100 = 199
      const res = calculateInvestments(sampleData, 100, [], {
        showHiddenGb: false,
        calculateOnlySafeProfit: true,
      });

      assert.equal(res.totalInvested, 931);
      assert.equal(res.totalReturn, 1130);
      assert.equal(res.netProfitLoss, 199);
      assert.equal(res.results[1].effectiveProfit.toNumber(), 0);
    },
  );

  await t.test('hides GB from list and calculation when hidden', () => {
    // Hide Item 2 (Mighty King Don: key '1002_X_SpaceAgeTitan_Landmark1')
    const hiddenKeys = ['1002_X_SpaceAgeTitan_Landmark1'];

    // When showHiddenGb is false:
    const res = calculateInvestments(sampleData, 100, hiddenKeys, {
      showHiddenGb: false,
      calculateOnlySafeProfit: false,
    });

    // Item 2 completely omitted from results and totals
    assert.equal(res.results.length, 2);
    assert.equal(res.totalInvested, 831); // 631 + 200
    assert.equal(res.totalReturn, 1030); // 730 + 300
    assert.equal(res.netProfitLoss, 199); // 99 + 100
    assert.equal(res.hiddenCount, 1);
  });

  await t.test(
    'includes hidden GB in results with is_hidden flag when showHiddenGb is true',
    () => {
      const hiddenKeys = ['1002_X_SpaceAgeTitan_Landmark1'];

      // When showHiddenGb is true:
      const res = calculateInvestments(sampleData, 100, hiddenKeys, {
        showHiddenGb: true,
        calculateOnlySafeProfit: false,
      });

      // All 3 items in results, but Item 2 has is_hidden = true and is excluded from totals
      assert.equal(res.results.length, 3);
      assert.equal(res.results[1].is_hidden, true);
      assert.equal(res.totalInvested, 831); // Still excluded from calculation!
      assert.equal(res.totalReturn, 1030);
      assert.equal(res.netProfitLoss, 199);
    },
  );
});
