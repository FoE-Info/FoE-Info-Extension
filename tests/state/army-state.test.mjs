import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/ArmyState.js';

const { ArmyState, armyState } = statePkg;

test('ArmyState - reactive publish/subscribe', async (t) => {
  await t.test('stores the panel payload and notifies the army channel', () => {
    const state = new ArmyState();
    const channels = [];
    state.subscribe((snapshot, channel) => channels.push(channel));

    const payload = { rogues: 3, allUnits: 5 };
    state.setArmyPanel(payload);

    assert.deepEqual(channels, ['army']);
    assert.equal(state.getArmyPanel(), payload);
  });

  await t.test('defaults missing payload to null', () => {
    const state = new ArmyState();
    state.setArmyPanel(undefined);
    assert.equal(state.getArmyPanel(), null);
  });

  await t.test('isolates and logs a throwing subscriber', () => {
    const errors = [];
    const state = new ArmyState({
      logger: { error: (...args) => errors.push(args) },
    });
    let reached = false;
    state.subscribe(() => {
      throw new Error('render boom');
    });
    state.subscribe(() => {
      reached = true;
    });

    assert.doesNotThrow(() => state.setArmyPanel({ rogues: 1 }));
    assert.equal(reached, true);
    assert.deepEqual(errors[0][1], { channel: 'army', error: 'render boom' });
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(armyState instanceof ArmyState);
    assert.equal(typeof armyState.subscribe, 'function');
  });
});
