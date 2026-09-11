import assert from 'node:assert/strict';
import test from 'node:test';
import renderGuildPkg from '../../src/js/ui/renderGuildPanel.js';

const { renderGuildPanel } = renderGuildPkg;

test('renderGuildPanel UI Suite', async (t) => {
  await t.test('handles empty or missing clanData gracefully', () => {
    const mockGuildDiv = { id: 'guild', innerHTML: 'initial' };
    renderGuildPanel(null, { guild: mockGuildDiv });
    assert.equal(mockGuildDiv.innerHTML, 'initial');

    renderGuildPanel({}, { guild: mockGuildDiv });
    assert.equal(mockGuildDiv.innerHTML, 'initial');

    renderGuildPanel({ members: [] }, { guild: mockGuildDiv });
    assert.equal(mockGuildDiv.innerHTML, 'initial');
  });

  await t.test(
    'renders guild name, member count, and member roster table',
    () => {
      let styleDisplay = 'none';
      let dNoneRemoved = false;
      const listeners = {};

      const mockGuildDiv = {
        id: 'guild',
        innerHTML: '',
        classList: {
          contains: (cls) => cls === 'd-none',
          remove: (cls) => {
            if (cls === 'd-none') dNoneRemoved = true;
          },
        },
        style: {
          get display() {
            return styleDisplay;
          },
          set display(val) {
            styleDisplay = val;
          },
        },
        querySelector: (sel) => {
          const id = sel.replace('#', '');
          return {
            addEventListener: (evt, fn) => {
              listeners[id] = listeners[id] || {};
              listeners[id][evt] = fn;
            },
          };
        },
      };

      const clanData = {
        name: 'Knights of the Round',
        membersNum: 3,
        members: [
          {
            rank: 1,
            name: 'KingArthur',
            title: 'Founder',
            player_id: 1001,
            era: 'SpaceAgeSpaceHub',
            won_battles: 154200,
            score: 85200100,
          },
          {
            rank: 2,
            name: 'Lancelot',
            title: 'Leader',
            player_id: 1002,
            era: 'SpaceAgeTitan',
            won_battles: 98400,
            score: 62100500,
          },
          {
            rank: 3,
            name: 'Galahad',
            title: '',
            player_id: 1003,
            era: 'VirtualFuture',
            won_battles: 32000,
            score: 18500200,
          },
        ],
      };

      renderGuildPanel(clanData, {
        guild: mockGuildDiv,
        collapse: {
          collapseGuild: false,
          fCollapseGuild: () => {},
        },
        element: {
          close: () => '<button class="btn-close"></button>',
          copy: (id, style, align, isCol) =>
            `<button id="${id}" class="copy-btn">Copy</button>`,
          icon: (id, target, isCol) => `<span id="${id}">[-]</span>`,
        },
        helper: {
          escapeHTML: (s) => s,
          fGVGagesname: (era) => {
            if (era === 'SpaceAgeSpaceHub') return 'SASH';
            if (era === 'SpaceAgeTitan') return 'SAT';
            if (era === 'VirtualFuture') return 'VF';
            return era;
          },
          translateContainer: () => {},
        },
      });

      // 1. Unhides
      assert.equal(styleDisplay, '');
      assert.equal(dNoneRemoved, true);

      // 2. Guild header
      assert.match(
        mockGuildDiv.innerHTML,
        /<span data-i18n="guild">Guild<\/span>:\s*Knights of the Round/,
      );
      assert.match(
        mockGuildDiv.innerHTML,
        /3\s*<span data-i18n="members">members<\/span>/,
      );

      // 3. Table headers
      assert.match(mockGuildDiv.innerHTML, /<th class="text-start">#<\/th>/);
      assert.match(mockGuildDiv.innerHTML, /data-i18n="name"/);
      assert.match(mockGuildDiv.innerHTML, /data-i18n="title"/);
      assert.match(mockGuildDiv.innerHTML, /data-i18n="era"/);
      assert.match(mockGuildDiv.innerHTML, /data-i18n="battles"/);
      assert.match(mockGuildDiv.innerHTML, /data-i18n="points"/);

      // 4. Member entries
      assert.match(mockGuildDiv.innerHTML, /KingArthur/);
      assert.match(mockGuildDiv.innerHTML, /Founder/);
      assert.match(mockGuildDiv.innerHTML, /SASH/);
      assert.match(mockGuildDiv.innerHTML, /154,200/);
      assert.match(mockGuildDiv.innerHTML, /85,200,100/);

      assert.match(mockGuildDiv.innerHTML, /Lancelot/);
      assert.match(mockGuildDiv.innerHTML, /Leader/);
      assert.match(mockGuildDiv.innerHTML, /SAT/);
      assert.match(mockGuildDiv.innerHTML, /98,400/);
      assert.match(mockGuildDiv.innerHTML, /62,100,500/);

      assert.match(mockGuildDiv.innerHTML, /Galahad/);
      assert.match(mockGuildDiv.innerHTML, /VF/);
      assert.match(mockGuildDiv.innerHTML, /32,000/);
      assert.match(mockGuildDiv.innerHTML, /18,500,200/);

      // 5. Event listeners bound
      assert.ok(listeners['guildCopyID']);
      assert.ok(listeners['guildOverviewIcon']);
      assert.match(mockGuildDiv.innerHTML, /id="guildOverviewText"/);
      assert.match(mockGuildDiv.innerHTML, /id="guildOverviewTextLabel"/);
    },
  );
});
