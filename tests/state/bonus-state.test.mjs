import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/BonusState.js';

const { BonusState, bonusState } = statePkg;

test('BonusState - reactive publish/subscribe', async (t) => {
  await t.test('stores summary fields and notifies the bonus channel', () => {
    const state = new BonusState();
    const channels = [];
    state.subscribe((snapshot, channel) => channels.push(channel));

    state.setSummary({
      bonusHTML: 'Spoils',
      aid: 1,
      spoils: 2,
      diplomatic: 3,
      strike: 4,
      dailyForgePoints: 12,
    });

    assert.deepEqual(channels, ['bonus']);
    assert.equal(state.getBonusHTML(), 'Spoils');
    assert.deepEqual(state.getSummary(), {
      aid: 1,
      spoils: 2,
      diplomatic: 3,
      strike: 4,
    });
    assert.equal(state.getDailyForgePoints(), 12);
  });

  await t.test('defaults missing fields safely', () => {
    const state = new BonusState();
    state.setSummary();

    assert.equal(state.getBonusHTML(), '');
    assert.equal(state.getAid(), 0);
    assert.equal(state.getSpoils(), 0);
    assert.equal(state.getDiplomatic(), 0);
    assert.equal(state.getStrike(), 0);
    assert.equal(state.getDailyForgePoints(), null);
  });

  await t.test('isolates and logs a throwing subscriber', () => {
    const errors = [];
    const state = new BonusState({
      logger: { error: (...args) => errors.push(args) },
    });
    let reached = false;
    state.subscribe(() => {
      throw new Error('render boom');
    });
    state.subscribe(() => {
      reached = true;
    });

    assert.doesNotThrow(() => state.setSummary({ spoils: 1 }));
    assert.equal(reached, true);
    assert.equal(errors.length, 1);
    assert.deepEqual(errors[0][1], {
      channel: 'bonus',
      error: 'render boom',
    });
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(bonusState instanceof BonusState);
    assert.equal(typeof bonusState.subscribe, 'function');
  });
});
