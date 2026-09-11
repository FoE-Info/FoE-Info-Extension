import assert from 'node:assert/strict';
import test from 'node:test';
import investedPkg from '../../src/js/msg/InvestedService.js';

const { getContributions } = investedPkg.default || investedPkg;

test('InvestedService Suite', async (t) => {
  await t.test('handles direct array payload with 90% Arc override', () => {
    const data = [
      {
        rank: 1,
        player: { name: 'Player1', player_id: 100 },
        forge_points: 500,
        reward: { strategy_point_amount: 300 },
        name: 'Castel del Monte',
      },
    ];

    const result = getContributions(data, 90);
    assert.equal(result.success, true);
    assert.equal(result.totalInvested, 500);
    // 300 * 1.9 = 570 FP
    assert.equal(result.totalReturn, 570);
    assert.equal(result.netProfitLoss, 70);
    assert.equal(result.contributions.length, 1);
  });

  await t.test('handles responseData.contributions envelope', () => {
    const envelope = {
      __class__: 'ServerRequest',
      requestClass: 'GreatBuildingsService',
      requestMethod: 'getContributions',
      responseData: {
        contributions: [
          {
            rank: 2,
            player: { name: 'Player2', player_id: 101 },
            forge_points: 200,
            reward: { strategy_points: 100 },
            name: 'The Arc',
          },
        ],
      },
    };

    const result = getContributions(envelope, 80);
    assert.equal(result.success, true);
    assert.equal(result.totalInvested, 200);
    // 100 * 1.8 = 180 FP
    assert.equal(result.totalReturn, 180);
    assert.equal(result.netProfitLoss, -20);
    assert.equal(result.contributions.length, 1);
  });

  await t.test('handles empty or null contributions defensively', () => {
    const result = getContributions([], 90);
    assert.equal(result.success, true);
    assert.equal(result.totalInvested, 0);
    assert.equal(result.totalReturn, 0);
    assert.equal(result.netProfitLoss, 0);
    assert.equal(result.contributions.length, 0);
  });
});
