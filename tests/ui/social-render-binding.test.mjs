import assert from 'node:assert/strict';
import test from 'node:test';
import { SocialState } from '../../src/js/state/SocialState.js';
import { bindSocialLists } from '../../src/js/ui/socialRenderBinding.js';

test('socialRenderBinding Suite', async (t) => {
  await t.test(
    'subscribes to SocialState and triggers renderer on lists channel',
    () => {
      const state = new SocialState();
      const calls = [];

      const unbind = bindSocialLists(state, {
        renderer: (params) => calls.push(params),
        showOptions: { showFriends: true },
        CityProtections: [],
        toolOptions: { friendsSize: 250 },
      });

      assert.equal(calls.length, 0);

      state.setLists({
        friends: [{ name: 'TestFriend' }],
        guildMembers: [{ name: 'TestGuild' }],
        hoodlist: [{ name: 'TestHood' }],
      });

      assert.equal(calls.length, 1);
      assert.deepEqual(calls[0].friends, [{ name: 'TestFriend' }]);
      assert.deepEqual(calls[0].guildMembers, [{ name: 'TestGuild' }]);
      assert.deepEqual(calls[0].hoodlist, [{ name: 'TestHood' }]);

      unbind();
      state.setLists({ friends: [] });
      assert.equal(calls.length, 1, 'No calls after unbind');
    },
  );

  await t.test('safe no-op when state is invalid', () => {
    const off = bindSocialLists(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
