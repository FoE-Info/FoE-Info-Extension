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

      // 2. Guild header (expanded: title + subtitle)
      assert.match(
        mockGuildDiv.innerHTML,
        /<span data-i18n="guild_overview">Guild Overview<\/span>/,
      );
      assert.match(
        mockGuildDiv.innerHTML,
        /Knights of the Round • 3\s*<span data-i18n="members">members<\/span>/,
      );

      // 3. Table headers
      assert.match(
        mockGuildDiv.innerHTML,
        /<th scope="col" class="text-start">#<\/th>/,
      );
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

  await t.test(
    'unhides the parent #guildOverview wrapper so #guild becomes visible',
    () => {
      let guildDisplay = 'none';
      let parentDisplay = 'none';
      let parentDNoneRemoved = false;

      const parent = {
        id: 'guildOverview',
        classList: {
          contains: (cls) => cls === 'd-none',
          remove: (cls) => {
            if (cls === 'd-none') parentDNoneRemoved = true;
          },
        },
        style: {
          get display() {
            return parentDisplay;
          },
          set display(val) {
            parentDisplay = val;
          },
        },
      };

      const guildDiv = {
        id: 'guild',
        innerHTML: '',
        parentElement: parent,
        classList: {
          contains: (cls) => cls === 'd-none',
          remove: () => {},
        },
        style: {
          get display() {
            return guildDisplay;
          },
          set display(val) {
            guildDisplay = val;
          },
        },
        querySelector: () => ({ addEventListener: () => {} }),
      };

      renderGuildPanel(
        { name: 'Wrapper Guild', members: [{ rank: 1, name: 'ParentFix' }] },
        {
          guild: guildDiv,
          collapse: { collapseGuild: false, fCollapseGuild: () => {} },
          element: { close: () => '', copy: () => '', icon: () => '' },
          helper: {
            escapeHTML: (s) => s,
            fGVGagesname: (e) => e,
            translateContainer: () => {},
          },
        },
      );

      assert.equal(guildDisplay, '', '#guild should be unhidden');
      assert.equal(
        parentDisplay,
        '',
        '#guildOverview parent should be unhidden',
      );
      assert.equal(
        parentDNoneRemoved,
        true,
        'd-none should be removed from #guildOverview',
      );
      assert.match(guildDiv.innerHTML, /Wrapper Guild/);
      assert.match(guildDiv.innerHTML, /ParentFix/);
    },
  );

  await t.test(
    'falls back to document lookup when #guild has no parentElement',
    () => {
      let parentDisplay = 'none';

      const parent = {
        id: 'guildOverview',
        classList: { contains: () => false, remove: () => {} },
        style: {
          get display() {
            return parentDisplay;
          },
          set display(val) {
            parentDisplay = val;
          },
        },
      };

      const guildDiv = {
        id: 'guild',
        innerHTML: '',
        parentElement: null,
        classList: { contains: () => false, remove: () => {} },
        style: { display: '' },
        querySelector: () => ({ addEventListener: () => {} }),
      };

      const doc = {
        getElementById: (id) => (id === 'guildOverview' ? parent : null),
        createElement: () => ({
          style: {},
          select: () => {},
          remove: () => {},
        }),
      };

      renderGuildPanel(
        { name: 'Fallback Guild', members: [{ rank: 2, name: 'DocLookup' }] },
        {
          guild: guildDiv,
          document: doc,
          collapse: { collapseGuild: false, fCollapseGuild: () => {} },
          element: { close: () => '', copy: () => '', icon: () => '' },
          helper: {
            escapeHTML: (s) => s,
            fGVGagesname: (e) => e,
            translateContainer: () => {},
          },
        },
      );

      assert.equal(
        parentDisplay,
        '',
        '#guildOverview should be resolved via document lookup',
      );
      assert.match(guildDiv.innerHTML, /Fallback Guild/);
    },
  );
});
