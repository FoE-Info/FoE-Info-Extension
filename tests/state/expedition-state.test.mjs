import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/ExpeditionState.js';

const { ExpeditionState, expeditionState } = statePkg;

test('ExpeditionState - reactive publish/subscribe', async (t) => {
  await t.test('stores international entries and notifies the channel', () => {
    const state = new ExpeditionState();
    const channels = [];
    state.subscribe((snapshot, channel) => channels.push(channel));

    const entries = [{ id: 10, name: 'Lords of War' }];
    state.setInternationalEntries(entries);

    assert.deepEqual(channels, ['international']);
    assert.equal(state.getInternationalEntries(), entries);
  });

  await t.test('stores contribution entries and notifies the channel', () => {
    const state = new ExpeditionState();
    const channels = [];
    state.subscribe((snapshot, channel) => channels.push(channel));

    const entries = [{ player: { name: 'Alpha' }, expeditionPoints: 5 }];
    state.setContributionEntries(entries);

    assert.deepEqual(channels, ['contribution']);
    assert.equal(state.getContributionEntries(), entries);
  });

  await t.test('defaults non-array payloads to empty arrays', () => {
    const state = new ExpeditionState();
    state.setInternationalEntries(undefined);
    state.setContributionEntries('nope');
    assert.deepEqual(state.getInternationalEntries(), []);
    assert.deepEqual(state.getContributionEntries(), []);
  });

  await t.test('reset clears entries without notifying', () => {
    let notified = 0;
    const state = new ExpeditionState();
    state.subscribe(() => {
      notified += 1;
    });
    state.setInternationalEntries([{ id: 1 }]);
    state.setContributionEntries([{ player: {} }]);
    state.reset();

    assert.equal(state.getInternationalEntries(), null);
    assert.equal(state.getContributionEntries(), null);
    assert.equal(notified, 2);
  });

  await t.test('isolates and logs a throwing subscriber', () => {
    const errors = [];
    const state = new ExpeditionState({
      logger: { error: (...args) => errors.push(args) },
    });
    let reached = false;
    state.subscribe(() => {
      throw new Error('render boom');
    });
    state.subscribe(() => {
      reached = true;
    });

    assert.doesNotThrow(() => state.setContributionEntries([{ player: {} }]));
    assert.equal(reached, true);
    assert.deepEqual(errors[0][1], {
      channel: 'contribution',
      error: 'render boom',
    });
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(expeditionState instanceof ExpeditionState);
    assert.equal(typeof expeditionState.subscribe, 'function');
  });
});
