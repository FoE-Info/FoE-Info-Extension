import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/VisitedCityState.js';

const { VisitedCityState, visitedCityState } = statePkg;

test('VisitedCityState - reactive publish/subscribe', async (t) => {
  await t.test('notifies subscribers with the visit channel', () => {
    const state = new VisitedCityState();
    const calls = [];
    state.subscribe((snapshot, channel) =>
      calls.push([channel, snapshot.getVisit()]),
    );

    state.setVisit({ containerId: 'visit' });

    assert.deepEqual(calls, [['visit', { containerId: 'visit' }]]);
  });

  await t.test('unsubscribe stops further notifications', () => {
    const state = new VisitedCityState();
    let count = 0;
    const off = state.subscribe(() => {
      count += 1;
    });

    state.setVisit({ containerId: 'visit' });
    off();
    state.setVisit({ containerId: 'visit' });

    assert.equal(count, 1);
  });

  await t.test('isolates a throwing subscriber', () => {
    const state = new VisitedCityState();
    let reached = 0;
    state.subscribe(() => {
      throw new Error('boom');
    });
    state.subscribe(() => {
      reached += 1;
    });

    assert.doesNotThrow(() => state.setVisit({ containerId: 'visit' }));
    assert.equal(reached, 1);
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(visitedCityState instanceof VisitedCityState);
    assert.equal(typeof visitedCityState.subscribe, 'function');
  });
});
