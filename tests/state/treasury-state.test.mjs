import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/TreasuryState.js';

const { TreasuryState, treasuryState } = statePkg;

test('TreasuryState - reactive publish/subscribe', async (t) => {
  await t.test('notifies subscribers with the changed channel', () => {
    const state = new TreasuryState();
    const channels = [];
    state.subscribe((snapshot, channel) => channels.push(channel));

    state.setReserves(new Map([['wood', 10]]));
    state.setLogs([{ action: 'donate' }], { totalLogCount: 1 });

    assert.deepEqual(channels, ['reserves', 'logs']);
  });

  await t.test('exposes latest payload via getters', () => {
    const state = new TreasuryState();
    const reserves = new Map([['wood', 10]]);
    state.setReserves(reserves);
    state.setLogs([{ action: 'donate' }], { totalLogCount: 1 });

    assert.equal(state.getReserves(), reserves);
    assert.deepEqual(state.getLogs(), [{ action: 'donate' }]);
    assert.deepEqual(state.getTotals(), { totalLogCount: 1 });
  });

  await t.test('tracks showTreasury only when provided', () => {
    const state = new TreasuryState();
    assert.equal(state.getShowTreasury(), true);

    state.setLogs([], {}, { showTreasury: false });
    assert.equal(state.getShowTreasury(), false);

    state.setLogs([], {}, {});
    assert.equal(state.getShowTreasury(), false);
  });

  await t.test('isolates and logs a throwing subscriber', () => {
    const errors = [];
    const state = new TreasuryState({
      logger: { error: (...args) => errors.push(args) },
    });
    let reached = false;
    state.subscribe(() => {
      throw new Error('render boom');
    });
    state.subscribe(() => {
      reached = true;
    });

    assert.doesNotThrow(() => state.setReserves(new Map()));
    assert.equal(reached, true);
    assert.equal(errors.length, 1);
    assert.deepEqual(errors[0][1], {
      channel: 'reserves',
      error: 'render boom',
    });
  });

  await t.test('defaults missing payloads safely', () => {
    const state = new TreasuryState();
    state.setReserves(undefined);
    state.setLogs(undefined, undefined);

    assert.equal(state.getReserves(), null);
    assert.deepEqual(state.getLogs(), []);
    assert.equal(state.getTotals(), null);
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(treasuryState instanceof TreasuryState);
    assert.equal(typeof treasuryState.subscribe, 'function');
  });
});
