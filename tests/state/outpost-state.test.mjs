import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/OutpostState.js';

const { OutpostState, outpostState } = statePkg;

test('OutpostState - reactive publish/subscribe', async (t) => {
  await t.test('stores the cultural payload and notifies the channel', () => {
    const state = new OutpostState();
    const channels = [];
    state.subscribe((snapshot, channel) => channels.push(channel));

    const payload = {
      activeSettlement: { name: 'Vikings' },
      advancements: [{ id: 'a1' }],
      remainingCosts: { axes: 55 },
    };
    state.setCulturalPanel(payload);

    assert.deepEqual(channels, ['cultural']);
    assert.equal(state.getCulturalPanel(), payload);
  });

  await t.test('defaults missing payload to null', () => {
    const state = new OutpostState();
    state.setCulturalPanel(undefined);
    assert.equal(state.getCulturalPanel(), null);
  });

  await t.test('isolates and logs a throwing subscriber', () => {
    const errors = [];
    const state = new OutpostState({
      logger: { error: (...args) => errors.push(args) },
    });
    let reached = false;
    state.subscribe(() => {
      throw new Error('render boom');
    });
    state.subscribe(() => {
      reached = true;
    });

    assert.doesNotThrow(() => state.setCulturalPanel({ advancements: [] }));
    assert.equal(reached, true);
    assert.deepEqual(errors[0][1], {
      channel: 'cultural',
      error: 'render boom',
    });
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(outpostState instanceof OutpostState);
    assert.equal(typeof outpostState.subscribe, 'function');
  });
});
