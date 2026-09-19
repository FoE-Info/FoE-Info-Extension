import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatShieldCountdown,
  getFriendsHTML,
  renderSocialListsPanel,
} from '../../src/js/ui/renderSocialListsPanel.js';

function createMockElement(id = '') {
  const listeners = new Map();
  const classes = new Set();
  return {
    id,
    innerHTML: '',
    style: {},
    className: '',
    offsetHeight: 150,
    classList: {
      contains: (c) => classes.has(c),
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
    },
    addEventListener: (evt, fn) => {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    },
    listenerCount: (evt) => (listeners.get(evt) || []).length,
  };
}

test('renderSocialListsPanel Suite', async (t) => {
  await t.test('formatShieldCountdown formatting & safety', () => {
    const NOW_SECONDS = 1700000000;
    const NOW_MS = NOW_SECONDS * 1000;

    assert.equal(formatShieldCountdown(NOW_SECONDS + 3600, NOW_MS), '1:0:');
    assert.equal(
      formatShieldCountdown(NOW_SECONDS + 86400 * 2 + 3661, NOW_MS),
      '2 Days 1:',
    );
    assert.equal(formatShieldCountdown(NOW_SECONDS + 303, NOW_MS), '0:5:3');
    assert.equal(formatShieldCountdown(0, NOW_MS), '');
    assert.equal(formatShieldCountdown(-5, NOW_MS), '');
    assert.equal(formatShieldCountdown(null, NOW_MS), '');
    assert.equal(formatShieldCountdown(undefined, NOW_MS), '');
  });

  await t.test(
    'getFriendsHTML generates expected rows and escapes HTML',
    () => {
      const list = [
        { name: '<Script>Evil</Script>', is_friend: true },
        { name: 'PendingGuy', is_friend: false, accepted: false },
        { name: 'Saboteur', canSabotage: true },
        { name: 'InactivePlayer', is_active: false },
        {
          player_id: 999,
          name: 'ProtectedNeighbor',
          is_neighbor: true,
        },
      ];

      const cityProtections = [{ playerId: 999, expireTime: 1700003600 }];

      const html = getFriendsHTML(list, {
        CityProtections: cityProtections,
        nowMs: 1700000000 * 1000,
      });

      assert.ok(html.includes('&lt;Script&gt;Evil&lt;/Script&gt;'));
      assert.ok(
        !html.includes('PendingGuy'),
        'Pending request should be skipped',
      );
      assert.ok(html.includes('Plunder'));
      assert.ok(html.includes('INACTIVE'));
      assert.ok(html.includes('Shield'));
    },
  );

  await t.test(
    'renderSocialListsPanel renders markup and wires listeners',
    () => {
      const elements = new Map();
      const getEl = (id) => {
        if (!elements.has(id)) elements.set(id, createMockElement(id));
        return elements.get(id);
      };

      const container = getEl('friends');
      const mockDoc = {
        getElementById: (id) => getEl(id),
      };

      const mockElement = {
        icon: (iconId) => `<span id="${iconId}"></span>`,
        close: () => '<button id="closeBtn"></button>',
      };

      const mockCollapse = {
        collapseLists: true,
        collapseFriends: false,
        collapseGuild: false,
        collapseHood: false,
        fCollapseLists: () => {},
        fCollapseFriends: () => {},
        fCollapseGuild: () => {},
        fCollapseHood: () => {},
      };

      const mockCopy = {
        fFriendsCopy: () => {},
        fGuildCopy: () => {},
        fHoodCopy: () => {},
      };

      renderSocialListsPanel({
        friends: [{ name: 'FriendOne', is_friend: true }],
        guildMembers: [{ name: 'GuildOne', is_guild_member: true }],
        hoodlist: [{ name: 'HoodOne', is_neighbor: true }],
        showOptions: { showFriends: true, showGuild: true, showHood: true },
        container,
        doc: mockDoc,
        deps: {
          element: mockElement,
          collapse: mockCollapse,
          copy: mockCopy,
        },
      });

      assert.ok(container.innerHTML.includes('FriendOne'));
      assert.ok(container.innerHTML.includes('GuildOne'));
      assert.ok(container.innerHTML.includes('HoodOne'));

      // Accessible table semantics assertions
      assert.ok(
        container.innerHTML.includes(
          '<caption class="visually-hidden"><span data-i18n="friends">Friends</span></caption>',
        ),
      );
      assert.ok(
        container.innerHTML.includes(
          '<caption class="visually-hidden"><span data-i18n="guild">Guild</span></caption>',
        ),
      );
      assert.ok(
        container.innerHTML.includes(
          '<caption class="visually-hidden"><span data-i18n="hood">Hood List</span></caption>',
        ),
      );
      assert.ok(
        container.innerHTML.includes(
          '<thead class="visually-hidden"><tr><th scope="col" data-i18n="name">Name</th><th scope="col" data-i18n="player_status">Status</th></tr></thead>',
        ),
      );

      assert.equal(getEl('friendsCopyID').listenerCount('click'), 1);
      assert.equal(getEl('guildCopyID').listenerCount('click'), 1);
      assert.equal(getEl('hoodCopyID').listenerCount('click'), 1);
      assert.equal(getEl('listsicon').listenerCount('click'), 1);
    },
  );
});
