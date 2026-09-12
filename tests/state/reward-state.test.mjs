import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/RewardState.js';

const { RewardState, rewardState } = statePkg;

test('RewardState - reactive publish/subscribe', async (t) => {
  await t.test('stores the reward entry and notifies the channel', () => {
    const state = new RewardState();
    const channels = [];
    state.subscribe((snapshot, channel) => channels.push(channel));

    const entry = { source: 'quest', payload: { amount: 5 } };
    state.setReward(entry);

    assert.deepEqual(channels, ['reward']);
    assert.equal(state.getReward(), entry);
  });

  await t.test('defaults missing entry to null', () => {
    const state = new RewardState();
    state.setReward(undefined);
    assert.equal(state.getReward(), null);
  });

  await t.test('isolates and logs a throwing subscriber', () => {
    const errors = [];
    const state = new RewardState({
      logger: { error: (...args) => errors.push(args) },
    });
    let reached = false;
    state.subscribe(() => {
      throw new Error('render boom');
    });
    state.subscribe(() => {
      reached = true;
    });

    assert.doesNotThrow(() => state.setReward({ source: 'quest' }));
    assert.equal(reached, true);
    assert.deepEqual(errors[0][1], { channel: 'reward', error: 'render boom' });
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(rewardState instanceof RewardState);
    assert.equal(typeof rewardState.subscribe, 'function');
  });
});
