import assert from 'node:assert/strict';
import test from 'node:test';

// Setup DOM mocks
const domStore = new Map();

function createMockElement(tag, id = '') {
  const el = {
    tagName: tag.toUpperCase(),
    id,
    innerHTML: '',
    innerText: '',
    style: {},
    className: '',
    children: [],
    listeners: {},
    appendChild(child) {
      if (!child) return child;
      if (child.parentNode && child.parentNode.removeChild) {
        child.parentNode.removeChild(child);
      }
      child.parentNode = this;
      this.children.push(child);
      if (child.id) domStore.set(child.id, child);
      return child;
    },
    addEventListener(event, fn) {
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push(fn);
    },
    querySelector(sel) {
      const targetId = sel.replace('#', '');
      if (this.innerHTML.includes(targetId)) {
        if (!domStore.has(targetId)) {
          domStore.set(targetId, createMockElement('div', targetId));
        }
        return domStore.get(targetId);
      }
      return domStore.get(targetId) || null;
    },
    querySelectorAll() {
      return [];
    },
    setAttribute() {},
    getAttribute() {
      return null;
    },
  };
  if (id) domStore.set(id, el);
  return el;
}

globalThis.document = {
  getElementById(id) {
    if (!domStore.has(id)) {
      domStore.set(id, createMockElement('div', id));
    }
    return domStore.get(id);
  },
};

test('gbOverviewCard UI Suite', async (t) => {
  const gbOverviewPkg = await import('../../src/js/ui/gbOverviewCard.js');
  const { renderGbDonorsCard, renderGbOverviewCard } =
    gbOverviewPkg.default || gbOverviewPkg;

  const mockHelper = {
    escapeHTML: (str) => `[ESCAPED]${str}`,
    translateContainer: (container) => {
      container.translated = true;
    },
  };

  const mockElement = {
    close: () => '<button class="btn-close"></button>',
    copy: (id, style, align, collapseState) =>
      `<button id="${id}" class="${style} ${align}">Copy</button>`,
    icon: (name, target, collapseState) =>
      `<i class="${name}" data-target="${target}"></i>`,
  };

  const mockCollapse = {
    collapseGBDonors: false,
    fCollapseGBDonors: () => {},
  };

  const mockCopy = {
    DonorCopy: () => {},
  };

  await t.test(
    'exports both renderGbDonorsCard and renderGbOverviewCard',
    () => {
      assert.equal(typeof renderGbDonorsCard, 'function');
      assert.equal(typeof renderGbOverviewCard, 'function');
      assert.equal(renderGbDonorsCard, renderGbOverviewCard);
    },
  );

  await t.test('handles empty or missing rankings safely', () => {
    const greatbuilding = createMockElement('div', 'greatbuilding');
    greatbuilding.innerHTML = '<p>existing</p>';

    const res = renderGbDonorsCard({
      GBselected: { name: 'The Arc', level: 80 },
      rankings: null,
      showOptions: { showGBDonors: true },
      greatbuilding,
    });

    assert.equal(res.outputHTML, '');
    assert.equal(res.donorsHTML, '');
    assert.equal(greatbuilding.innerHTML, '');
  });

  await t.test(
    'mutates Top, GBrewards, and Reward arrays with Arc bonus for ranks 1-5',
    () => {
      const Top = [0, 0, 0, 0, 0, 0];
      const GBrewards = [0, 0, 0, 0, 0];
      const Reward = [0, 0, 0, 0, 0];

      const rankings = [
        {
          rank: 1,
          forge_points: 1000,
          player: { player_id: 101, name: 'Alice' },
          reward: { strategy_point_amount: 500 },
        },
        {
          rank: 2,
          forge_points: 500,
          player: { player_id: 102, name: 'Bob' },
          reward: { strategy_point_amount: 250 },
        },
        {
          rank: 3,
          forge_points: 200,
          player: { player_id: 103, name: 'Charlie' },
          reward: { strategy_point_amount: 100 },
        },
        {
          rank: 4,
          forge_points: 80,
          player: { player_id: 104, name: 'David' },
          reward: { strategy_point_amount: 40 },
        },
        {
          rank: 5,
          forge_points: 20,
          player: { player_id: 105, name: 'Eve' },
          reward: { strategy_point_amount: 10 },
        },
      ];

      const City = { ArcBonus: 90 };
      const greatbuilding = createMockElement('div', 'greatbuilding');

      renderGbDonorsCard({
        GBselected: {
          name: 'The Arc',
          level: 80,
          max_level: 81,
          current: 1800,
          total: 3200,
        },
        rankings,
        showOptions: { showGBDonors: true },
        greatbuilding,
        Top,
        GBrewards,
        Reward,
        City,
        helper: mockHelper,
        element: mockElement,
        collapse: mockCollapse,
        copy: mockCopy,
      });

      // Ranks 1-5 Top FP
      assert.deepEqual(Top.slice(0, 5), [1000, 500, 200, 80, 20]);
      // Ranks 1-5 Base Rewards
      assert.deepEqual(GBrewards, [500, 250, 100, 40, 10]);
      // Ranks 1-5 Boosted Rewards (1.9x with half-up rounding)
      assert.deepEqual(Reward, [950, 475, 190, 76, 19]);
    },
  );

  await t.test(
    'renders donor badges for ranks 1-10 and ignores badges for rank > 10',
    () => {
      const rankings = [];
      for (let r = 1; r <= 12; r++) {
        rankings.push({
          rank: r,
          forge_points: 100 - r * 5,
          player: { player_id: 200 + r, name: `Player_${r}` },
          reward: r <= 5 ? { strategy_point_amount: 50 } : undefined,
        });
      }

      let capturedName = null;
      let capturedId = null;
      const setPlayerName = (name, id) => {
        capturedName = name;
        capturedId = id;
      };

      const greatbuilding = createMockElement('div', 'greatbuilding');

      const res = renderGbDonorsCard({
        GBselected: {
          name: 'Castel del Monte',
          level: 10,
          max_level: 11,
          current: 400,
          total: 600,
        },
        rankings,
        showOptions: { showGBDonors: true },
        greatbuilding,
        PlayerID: 211, // Player_11
        setPlayerName,
        helper: mockHelper,
        element: mockElement,
        collapse: mockCollapse,
        copy: mockCopy,
      });

      for (let r = 1; r <= 10; r++) {
        assert.match(res.donorsHTML, new RegExp(`${r}\\. Player_${r}`));
      }
      assert.doesNotMatch(res.donorsHTML, /11\. Player_11/);
      assert.doesNotMatch(res.donorsHTML, /12\. Player_12/);

      // PlayerID 211 (rank 11) should still trigger setPlayerName
      assert.equal(capturedName, 'Player_11');
      assert.equal(capturedId, 211);
    },
  );

  await t.test(
    'honors showOptions.showGBDonors toggle (clears markup when false, binds events when true)',
    () => {
      const rankings = [
        {
          rank: 1,
          forge_points: 100,
          player: { player_id: 301, name: 'Leader' },
          reward: { strategy_point_amount: 50 },
        },
      ];

      const greatbuilding = createMockElement('div', 'greatbuilding');

      // 1. showGBDonors = true
      renderGbDonorsCard({
        GBselected: {
          name: 'Alcatraz',
          level: 50,
          max_level: 51,
          current: 1000,
          total: 2000,
        },
        rankings,
        showOptions: { showGBDonors: true },
        greatbuilding,
        helper: mockHelper,
        element: mockElement,
        collapse: mockCollapse,
        copy: mockCopy,
      });

      assert.match(greatbuilding.innerHTML, /\[ESCAPED\]Alcatraz/);
      assert.match(greatbuilding.innerHTML, /Leader/);
      assert.match(greatbuilding.innerHTML, /100 FP/);
      assert.equal(greatbuilding.translated, true);

      // Event listeners registered
      const copyBtn = domStore.get('donorCopyID');
      assert.ok(copyBtn);
      assert.ok(copyBtn.listeners.click?.length > 0);

      const donorIcon = domStore.get('gbinvesticon');
      assert.ok(donorIcon);
      assert.ok(donorIcon.listeners.click?.length > 0);

      // 2. showGBDonors = false
      renderGbDonorsCard({
        GBselected: {
          name: 'Alcatraz',
          level: 50,
          max_level: 51,
          current: 1000,
          total: 2000,
        },
        rankings,
        showOptions: { showGBDonors: false },
        greatbuilding,
        helper: mockHelper,
        element: mockElement,
        collapse: mockCollapse,
        copy: mockCopy,
      });

      assert.equal(greatbuilding.innerHTML, '');
    },
  );

  await t.test(
    'displays fallback message when rankings array has no names',
    () => {
      const greatbuilding = createMockElement('div', 'greatbuilding');
      const rankings = [{ rank: 1, forge_points: 10, player: {} }];

      renderGbDonorsCard({
        GBselected: { name: 'Statue of Zeus' },
        rankings,
        showOptions: { showGBDonors: true },
        greatbuilding,
        helper: mockHelper,
        element: mockElement,
        collapse: mockCollapse,
        copy: mockCopy,
      });

      assert.match(greatbuilding.innerHTML, /data-i18n="no_contributors"/);
      assert.match(greatbuilding.innerHTML, /No contributors yet/);
    },
  );
});
