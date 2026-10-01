import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import service from '../../src/js/msg/GbDonationService.js';

const payout = JSON.parse(
  fs.readFileSync(
    new URL('../fixtures/rpc/BlueprintService.newReward.json', import.meta.url),
    'utf8',
  ),
);
test('captured GB payout publishes FP, medals, and newly found blueprints without inventory totals', () => {
  const entries = [];
  const result = service.handleNewReward(
    { responseData: payout },
    { showGBRewards: true },
    null,
    { rewardState: { setReward: (entry) => entries.push(entry) } },
  );
  assert.equal(result.success, true);
  assert.ok(entries.every((entry) => entry.source === 'greatBuilding'));
  assert.deepEqual(
    entries
      .filter(({ payload }) => payload.type === 'resource')
      .map(({ payload }) => [payload.subType, payload.amount]),
    [
      ['strategy_points', 200],
      ['medals', 430],
    ],
  );
  assert.equal(
    entries
      .filter(({ payload }) => payload.type === 'blueprint')
      .reduce((sum, { payload }) => sum + payload.amount, 0),
    14,
  );
  const disabled = [];
  service.handleNewReward(
    { responseData: payout },
    { showGBRewards: false },
    null,
    { rewardState: { setReward: (entry) => disabled.push(entry) } },
  );
  assert.deepEqual(disabled, []);
});

test('live GB level payout preserves server-awarded FP, medals, and found blueprint quantities', async () => {
  const { parseGreatBuildingReward } =
    await import('../../src/js/msg/gbRewardPayloads.js');
  const live = JSON.parse(
    fs.readFileSync(
      new URL('../fixtures/rpc/live/gb-level-payout.json', import.meta.url),
      'utf8',
    ),
  );
  const rewards = parseGreatBuildingReward(live);
  assert.deepEqual(
    rewards.filter((reward) => reward.type === 'resource'),
    [
      { type: 'resource', subType: 'strategy_points', amount: 30 },
      { type: 'resource', subType: 'medals', amount: 1956 },
    ],
  );
  assert.equal(
    rewards
      .filter((reward) => reward.type === 'blueprint')
      .reduce((sum, reward) => sum + reward.amount, 0),
    6,
  );
});
