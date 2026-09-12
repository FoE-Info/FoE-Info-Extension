import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/GuildBattlegroundState.js';

const { GuildBattlegroundState, guildBattlegroundState } = statePkg;

test('GuildBattlegroundState - reactive publish/subscribe', async (t) => {
  await t.test('stores each channel payload and notifies its channel', () => {
    const state = new GuildBattlegroundState();
    const channels = [];
    state.subscribe((snapshot, channel) => channels.push(channel));

    const targets = { map: [{ id: 1 }] };
    const result = { responseData: { stateId: 'subscribed' } };
    const leaderboard = { leaderboard: [] };
    const province = { map: [], mapName: 'volcano' };

    state.setTargets(targets);
    state.setResult(result);
    state.setLeaderboard(leaderboard);
    state.setProvince(province);

    assert.deepEqual(channels, [
      'targets',
      'result',
      'leaderboard',
      'province',
    ]);
    assert.equal(state.getTargets(), targets);
    assert.equal(state.getResult(), result);
    assert.equal(state.getLeaderboard(), leaderboard);
    assert.equal(state.getProvince(), province);
  });

  await t.test('defaults missing payloads to null', () => {
    const state = new GuildBattlegroundState();
    state.setTargets(undefined);
    state.setResult(null);
    state.setLeaderboard();
    state.setProvince(undefined);

    assert.equal(state.getTargets(), null);
    assert.equal(state.getResult(), null);
    assert.equal(state.getLeaderboard(), null);
    assert.equal(state.getProvince(), null);
  });

  await t.test('isolates and logs a throwing subscriber', () => {
    const errors = [];
    const state = new GuildBattlegroundState({
      logger: { error: (...args) => errors.push(args) },
    });
    let reached = false;
    state.subscribe(() => {
      throw new Error('render boom');
    });
    state.subscribe(() => {
      reached = true;
    });

    assert.doesNotThrow(() => state.setTargets({ map: [] }));
    assert.equal(reached, true);
    assert.deepEqual(errors[0][1], {
      channel: 'targets',
      error: 'render boom',
    });
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(guildBattlegroundState instanceof GuildBattlegroundState);
    assert.equal(typeof guildBattlegroundState.subscribe, 'function');
  });
});
