import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/GreatBuildingsState.js';

const { GreatBuildingsState, greatBuildingsState } = statePkg;

test('GreatBuildingsState - reactive publish/subscribe', async (t) => {
  await t.test(
    'stores the donors payload and notifies the donors channel',
    () => {
      const state = new GreatBuildingsState();
      const channels = [];
      state.subscribe((snapshot, channel) => channels.push(channel));

      const payload = { GBselected: { name: 'The Arc' }, rankings: [] };
      state.setDonors(payload);

      assert.deepEqual(channels, ['donors']);
      assert.equal(state.getDonors(), payload);
    },
  );

  await t.test('stores the info payload and notifies the info channel', () => {
    const state = new GreatBuildingsState();
    const channels = [];
    state.subscribe((snapshot, channel) => channels.push(channel));

    const payload = {
      targetEl: {},
      gbData: { name: 'The Arc' },
      playerName: 'PlayerOne',
      showOptions: { showGBInfo: true },
    };
    state.setInfo(payload);

    assert.deepEqual(channels, ['info']);
    assert.equal(state.getInfo(), payload);
  });

  await t.test(
    'stores the donation payload and notifies the donation channel',
    () => {
      const state = new GreatBuildingsState();
      const channels = [];
      state.subscribe((snapshot, channel) => channels.push(channel));

      const payload = {
        GBselected: { name: 'The Arc' },
        donationDIV: {},
        donation2DIV: {},
      };
      state.setDonation(payload);

      assert.deepEqual(channels, ['donation']);
      assert.equal(state.getDonation(), payload);
    },
  );

  await t.test('defaults missing payloads to null', () => {
    const state = new GreatBuildingsState();
    state.setDonors(undefined);
    state.setInfo(undefined);
    state.setDonation(undefined);
    assert.equal(state.getDonors(), null);
    assert.equal(state.getInfo(), null);
    assert.equal(state.getDonation(), null);
  });

  await t.test('isolates and logs a throwing subscriber', () => {
    const errors = [];
    const state = new GreatBuildingsState({
      logger: { error: (...args) => errors.push(args) },
    });
    let reached = false;
    state.subscribe(() => {
      throw new Error('render boom');
    });
    state.subscribe(() => {
      reached = true;
    });

    assert.doesNotThrow(() => state.setDonors({ rankings: [] }));
    assert.equal(reached, true);
    assert.deepEqual(errors[0][1], { channel: 'donors', error: 'render boom' });
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(greatBuildingsState instanceof GreatBuildingsState);
    assert.equal(typeof greatBuildingsState.subscribe, 'function');
  });
});
