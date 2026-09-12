import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/QuantumState.js';

const { QuantumState, quantumState } = statePkg;

test('QuantumState - reactive publish/subscribe', async (t) => {
  await t.test('notifies subscribers with the changed slice', () => {
    const state = new QuantumState();
    const events = [];
    state.subscribe((snapshot, changed) => {
      events.push({ changed, members: snapshot.members.length });
    });

    state.setMemberActivity([{ name: 'Alice' }], 1234);
    state.setLeaderboard([{ clanName: 'Guild' }]);

    assert.deepEqual(events, [
      { changed: 'members', members: 1 },
      { changed: 'leaderboard', members: 1 },
    ]);
  });

  await t.test('unsubscribe stops further notifications', () => {
    const state = new QuantumState();
    let count = 0;
    const off = state.subscribe(() => {
      count += 1;
    });

    state.setMemberActivity([]);
    off();
    state.setLeaderboard([]);

    assert.equal(count, 1);
  });

  await t.test('isolates a throwing subscriber', () => {
    const state = new QuantumState();
    let reached = false;
    state.subscribe(() => {
      throw new Error('boom');
    });
    state.subscribe(() => {
      reached = true;
    });

    assert.doesNotThrow(() => state.setMemberActivity([{ name: 'x' }]));
    assert.equal(reached, true);
  });

  await t.test('reports subscriber failures to the logger', () => {
    const errors = [];
    const state = new QuantumState({
      logger: { error: (...args) => errors.push(args) },
    });
    state.subscribe(() => {
      throw new Error('render boom');
    });

    state.setMemberActivity([{ name: 'x' }]);

    assert.equal(errors.length, 1);
    assert.equal(errors[0][0], 'Reactive subscriber failed');
    assert.deepEqual(errors[0][1], {
      changed: 'members',
      error: 'render boom',
    });
  });

  await t.test('defaults non-array inputs to empty collections', () => {
    const state = new QuantumState();
    state.setMemberActivity(null);
    state.setLeaderboard(undefined);

    assert.deepEqual(state.getMemberActivity(), []);
    assert.deepEqual(state.getLeaderboard(), []);
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(quantumState instanceof QuantumState);
    assert.equal(typeof quantumState.subscribe, 'function');
  });
});
