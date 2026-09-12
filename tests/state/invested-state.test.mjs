import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/InvestedState.js';

const { InvestedState, investedState } = statePkg;

test('InvestedState - reactive publish/subscribe', async (t) => {
  await t.test(
    'stores the contributions payload and notifies the channel',
    () => {
      const state = new InvestedState();
      const channels = [];
      state.subscribe((snapshot, channel) => channels.push(channel));

      const payload = { list: [{ rank: 1 }], arcBonusPercent: 90 };
      state.setContributions(payload);

      assert.deepEqual(channels, ['contributions']);
      assert.equal(state.getContributions(), payload);
    },
  );

  await t.test('defaults missing payload to null', () => {
    const state = new InvestedState();
    state.setContributions(undefined);
    assert.equal(state.getContributions(), null);
  });

  await t.test('isolates and logs a throwing subscriber', () => {
    const errors = [];
    const state = new InvestedState({
      logger: { error: (...args) => errors.push(args) },
    });
    let reached = false;
    state.subscribe(() => {
      throw new Error('render boom');
    });
    state.subscribe(() => {
      reached = true;
    });

    assert.doesNotThrow(() => state.setContributions({ list: [] }));
    assert.equal(reached, true);
    assert.deepEqual(errors[0][1], {
      channel: 'contributions',
      error: 'render boom',
    });
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(investedState instanceof InvestedState);
    assert.equal(typeof investedState.subscribe, 'function');
  });
});
