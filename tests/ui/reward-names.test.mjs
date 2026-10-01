import assert from 'node:assert/strict';
import test from 'node:test';
import { addToBucket } from '../../src/js/ui/rewardCategories.js';
import names from '../../src/js/ui/rewardNames.js';

test('reward quantities use one x prefix and accumulate independently of payload labels', () => {
  const buckets = { rewardsGeneric: {}, rewardsCity: {}, rewardsArmy: {} };
  for (const name of ['8x Gravity Gunner', 'Gravity Gunner']) {
    addToBucket(buckets, 'expedition', names.normalizeRewardName(name), 8);
  }
  assert.deepEqual(buckets.rewardsGeneric, { 'Gravity Gunner': 16 });
  assert.equal(
    names.formatRewardLine(16, 'Gravity Gunner'),
    '16x Gravity Gunner',
  );
  assert.equal(
    names.formatRewardLine(115, 'Upcycled Hydrocarbons'),
    '115x Upcycled Hydrocarbons',
  );
  assert.equal(
    names.formatRewardLine(3, 'random Blueprints'),
    '3x random Blueprints',
  );
  assert.equal(
    names.formatRewardLine(8, '8× Dream Dust Blaster'),
    '8x Dream Dust Blaster',
  );
  assert.equal(
    names.formatRewardLine(10, 'Fragments of One Up Kit'),
    '10x Fragments of One Up Kit',
  );
});

test('new rewards preserve saved height and localized blueprint names', async () => {
  const { showReward } = await import('../../src/js/ui/RewardRenderer.mjs');
  const { rewardsGeneric } = await import('../../src/js/state/state.mjs');
  const { toolOptions } = await import('../../src/js/fn/globals.mjs');
  const previousMode = toolOptions.rewardSizeMode;
  const previousDocument = globalThis.document;
  const previousSize = toolOptions.rewardSize;
  const previousRewards = { ...rewardsGeneric };
  const container = { innerHTML: '', querySelectorAll: () => [] };
  globalThis.document = {
    getElementById: (id) => (id === 'cityrewards' ? container : null),
  };
  toolOptions.rewardSize = 137;
  toolOptions.rewardSizeMode = 'fixed';
  try {
    for (const key of Object.keys(rewardsGeneric)) delete rewardsGeneric[key];
    showReward('expedition', {
      type: 'blueprint',
      subType: 'X_AllAge_Expedition',
      name: 'Double Temple of Relics Blueprint',
      amount: 2,
    });
    assert.match(container.innerHTML, /height: 137px/);
    assert.match(container.innerHTML, /2x Double Temple of Relics Blueprint/);
    assert.doesNotMatch(container.innerHTML, /X_AllAge/);
    showReward('expedition', {
      type: 'unit',
      name: '8x Gravity Gunner',
      amount: 8,
    });
    assert.match(container.innerHTML, /height: 137px/);
    assert.match(container.innerHTML, /8x Gravity Gunner/);
    assert.doesNotMatch(container.innerHTML, /8x 8x/);
  } finally {
    globalThis.document = previousDocument;
    toolOptions.rewardSize = previousSize;
    toolOptions.rewardSizeMode = previousMode;
    for (const key of Object.keys(rewardsGeneric)) delete rewardsGeneric[key];
    Object.assign(rewardsGeneric, previousRewards);
  }
});

test('automatic reward height follows the current rendered content', async () => {
  const { measureRewardContentHeight } =
    await import('../../src/js/ui/RewardRenderer.mjs');
  const element = {
    classList: { contains: () => true },
    scrollHeight: 68,
  };

  assert.equal(measureRewardContentHeight(element), 68);
  element.scrollHeight = 112;
  assert.equal(measureRewardContentHeight(element), 112);
});

test('legacy reward sizes distinguish the old default from custom sizes', async () => {
  const globals = await import('../../src/js/fn/globals.mjs');
  const { setToolOptions } = globals;
  const getToolOptions = () => globals.toolOptions;
  const previousSize = getToolOptions().rewardSize;
  const previousMode = getToolOptions().rewardSizeMode;

  try {
    setToolOptions({ rewardSize: 200 });
    assert.equal(getToolOptions().rewardSizeMode, 'auto');
    setToolOptions({ rewardSize: 137 });
    assert.equal(getToolOptions().rewardSizeMode, 'fixed');
    setToolOptions({ rewardSize: 200, rewardSizeMode: 'fixed' });
    assert.equal(getToolOptions().rewardSizeMode, 'fixed');
  } finally {
    setToolOptions({
      rewardSize: previousSize,
      rewardSizeMode: previousMode,
    });
  }
});

test('reward income omits building activation state', () => {
  assert.equal(
    names.formatRewardLine(10, 'Fragments of Forgotten Temple - Active'),
    '10x Fragments of Forgotten Temple',
  );
  assert.equal(
    names.formatRewardLine(6, 'Fragments of Ancient Temple - Active'),
    '6x Fragments of Ancient Temple',
  );
});

test('identical rewards from GE and PvP retain separate source totals', async () => {
  const { showReward } = await import('../../src/js/ui/RewardRenderer.mjs');
  const { rewardsBySource, clearRewardsState } =
    await import('../../src/js/state/state.mjs');
  clearRewardsState();
  showReward('expedition', {
    type: 'resource',
    subType: 'strategy_points',
    name: 'Forge Points',
    amount: 10,
  });
  showReward('pvpArena', {
    type: 'resource',
    subType: 'strategy_points',
    name: 'Forge Points',
    amount: 5,
  });
  assert.deepEqual(Object.values(rewardsBySource.expedition), [10]);
  assert.deepEqual(Object.values(rewardsBySource.pvpArena), [5]);
  clearRewardsState();
  assert.deepEqual(rewardsBySource, {});
});

test('per-good bundles use totalAmount while unit bundles retain their quantity', () => {
  assert.equal(
    names.getRewardQuantity({ type: 'good', amount: 50, totalAmount: 250 }),
    250,
  );
  assert.equal(names.getRewardQuantity({ type: 'unit', amount: 5 }), 5);
  assert.equal(names.getRewardQuantity({ type: 'resource', amount: 50 }), 50);
});
