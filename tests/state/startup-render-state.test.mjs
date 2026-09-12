import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/StartupRenderState.js';

const { StartupRenderState, startupRenderState } = statePkg;

test('StartupRenderState - reactive publish/subscribe', async (t) => {
  await t.test('notifies subscribers with the changed channel', () => {
    const state = new StartupRenderState();
    const channels = [];
    state.subscribe((snapshot, channel) => {
      channels.push(channel);
    });

    state.setCityStatsContext({ tag: 'ctx' });
    state.setBuildingCollectionOptions({ tag: 'opts' });

    assert.deepEqual(channels, ['city-stats', 'building-collection']);
  });

  await t.test('exposes the latest payload via getters', () => {
    const state = new StartupRenderState();
    state.setCityStatsContext({ fp: 12 });
    state.setBuildingCollectionOptions({ buildingsReady: [1, 2] });

    assert.deepEqual(state.getCityStatsContext(), { fp: 12 });
    assert.deepEqual(state.getBuildingCollectionOptions(), {
      buildingsReady: [1, 2],
    });
  });

  await t.test('unsubscribe stops further notifications', () => {
    const state = new StartupRenderState();
    let count = 0;
    const off = state.subscribe(() => {
      count += 1;
    });

    state.setCityStatsContext({});
    off();
    state.setBuildingCollectionOptions({});

    assert.equal(count, 1);
  });

  await t.test('isolates a throwing subscriber', () => {
    const state = new StartupRenderState();
    let reached = false;
    state.subscribe(() => {
      throw new Error('boom');
    });
    state.subscribe(() => {
      reached = true;
    });

    assert.doesNotThrow(() => state.setCityStatsContext({ fp: 1 }));
    assert.equal(reached, true);
  });

  await t.test('reports subscriber failures to the logger', () => {
    const errors = [];
    const state = new StartupRenderState({
      logger: { error: (...args) => errors.push(args) },
    });
    state.subscribe(() => {
      throw new Error('render boom');
    });

    state.setCityStatsContext({ fp: 1 });

    assert.equal(errors.length, 1);
    assert.equal(errors[0][0], 'Reactive subscriber failed');
    assert.deepEqual(errors[0][1], {
      channel: 'city-stats',
      error: 'render boom',
    });
  });

  await t.test('defaults missing payloads to null', () => {
    const state = new StartupRenderState();
    state.setCityStatsContext(undefined);
    state.setBuildingCollectionOptions(null);

    assert.equal(state.getCityStatsContext(), null);
    assert.equal(state.getBuildingCollectionOptions(), null);
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(startupRenderState instanceof StartupRenderState);
    assert.equal(typeof startupRenderState.subscribe, 'function');
  });
});
