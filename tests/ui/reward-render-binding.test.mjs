import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/RewardState.js';
import bindingPkg from '../../src/js/ui/rewardRenderBinding.js';

const { RewardState } = statePkg;
const { bindRewardPanel } = bindingPkg;

test('rewardRenderBinding - routes the published reward', async (t) => {
  await t.test('forwards source and payload to showReward', () => {
    const state = new RewardState();
    const calls = [];
    const off = bindRewardPanel(state, {
      showReward: (source, payload) => calls.push({ source, payload }),
    });

    const payload = { amount: 5 };
    state.setReward({ source: 'quest', payload });
    off();
    state.setReward({ source: 'quest', payload: { amount: 9 } });

    assert.deepEqual(calls, [{ source: 'quest', payload }]);
  });

  await t.test('ignores channels outside the reward domain', () => {
    const state = new RewardState();
    let called = 0;
    bindRewardPanel(state, {
      showReward: () => {
        called += 1;
      },
    });

    state.notify('other');
    assert.equal(called, 0);
  });

  await t.test('skips render when no entry exists', () => {
    const state = new RewardState();
    let called = false;
    bindRewardPanel(state, {
      showReward: () => {
        called = true;
      },
    });

    state.setReward(null);
    assert.equal(called, false);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindRewardPanel(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
