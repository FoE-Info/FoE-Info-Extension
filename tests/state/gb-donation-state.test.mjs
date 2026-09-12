import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/GbDonationState.js';

const { GbDonationState, gbDonationState } = statePkg;

test('GbDonationState - reactive publish/subscribe', async (t) => {
  await t.test(
    'stores the donation payload and notifies the donation channel',
    () => {
      const state = new GbDonationState();
      const channels = [];
      state.subscribe((snapshot, channel) => channels.push(channel));

      const payload = {
        containers: { donation2DIV: {} },
        gbData: { name: 'The Arc' },
        rankings: [],
        showOptions: {},
      };
      state.setDonationPanel(payload);

      assert.deepEqual(channels, ['donation']);
      assert.equal(state.getDonationPanel(), payload);
    },
  );

  await t.test(
    'stores the reward payload and notifies the reward channel',
    () => {
      const state = new GbDonationState();
      const channels = [];
      state.subscribe((snapshot, channel) => channels.push(channel));

      const payload = {
        mode: 'unified',
        container: {},
        amount: 2,
        formattedName: 'The Arc',
        args: { name: 'The Arc', amount: 2 },
      };
      state.setReward(payload);

      assert.deepEqual(channels, ['reward']);
      assert.equal(state.getReward(), payload);
    },
  );

  await t.test('defaults missing payloads to null', () => {
    const state = new GbDonationState();
    state.setDonationPanel(undefined);
    state.setReward(undefined);
    assert.equal(state.getDonationPanel(), null);
    assert.equal(state.getReward(), null);
  });

  await t.test('isolates and logs a throwing subscriber', () => {
    const errors = [];
    const state = new GbDonationState({
      logger: { error: (...args) => errors.push(args) },
    });
    let reached = false;
    state.subscribe(() => {
      throw new Error('render boom');
    });
    state.subscribe(() => {
      reached = true;
    });

    assert.doesNotThrow(() => state.setReward({ amount: 1 }));
    assert.equal(reached, true);
    assert.deepEqual(errors[0][1], { channel: 'reward', error: 'render boom' });
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(gbDonationState instanceof GbDonationState);
    assert.equal(typeof gbDonationState.subscribe, 'function');
  });
});
