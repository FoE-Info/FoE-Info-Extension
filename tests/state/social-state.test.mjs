import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/SocialState.js';

const { SocialState, socialState } = statePkg;

test('SocialState - reactive publish/subscribe', async (t) => {
  await t.test('publishes lists and notifies the lists channel', () => {
    const state = new SocialState();
    const channels = [];
    state.subscribe((snapshot, channel) => channels.push(channel));

    state.setLists({ friends: [{ player_id: 1 }] });

    assert.deepEqual(channels, ['lists']);
    assert.deepEqual(state.getFriends(), [{ player_id: 1 }]);
    assert.deepEqual(state.getGuildMembers(), []);
    assert.deepEqual(state.getHoodlist(), []);
  });

  await t.test('ignores non-array list values', () => {
    const state = new SocialState();
    state.setLists({ friends: [{ player_id: 1 }] });
    state.setLists({ friends: null, hoodlist: 'bad' });

    assert.deepEqual(state.getFriends(), [{ player_id: 1 }]);
    assert.deepEqual(state.getHoodlist(), []);
  });

  await t.test('unsubscribe stops further notifications', () => {
    const state = new SocialState();
    let count = 0;
    const off = state.subscribe(() => {
      count += 1;
    });

    state.setLists({ friends: [] });
    off();
    state.setLists({ friends: [] });

    assert.equal(count, 1);
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(socialState instanceof SocialState);
    assert.equal(typeof socialState.subscribe, 'function');
  });
});
