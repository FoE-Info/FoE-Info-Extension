import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import renderQuantumPanelsPkg from '../../src/js/ui/renderQuantumPanels.js';

const { renderQuantumContributionsCard, renderQuantumLeaderboardCard } =
  renderQuantumPanelsPkg.default || renderQuantumPanelsPkg;

function createMockElement(id = '') {
  const listeners = new Map();
  return {
    id,
    innerHTML: '',
    style: {},
    className: '',
    checked: false,
    value: '',
    addEventListener(event, fn) {
      // In innerHTML replacement, previous element listeners do not accumulate
      listeners.set(event, [fn]);
    },
    click() {
      const handlers = [...(listeners.get('click') || [])];
      for (const fn of handlers) fn({ target: this });
    },
    dispatchEvent(event) {
      const handlers = [...(listeners.get(event?.type || event) || [])];
      for (const fn of handlers) fn(event);
    },
  };
}

describe('renderQuantumPanels UI Suite', () => {
  let domStore;
  let contributionsContainer;
  let leaderboardContainer;

  beforeEach(() => {
    domStore = new Map();
    contributionsContainer = createMockElement('quantumContributions');
    leaderboardContainer = createMockElement('quantumLeaderboard');

    domStore.set('quantumContributions', contributionsContainer);
    domStore.set('quantumLeaderboard', leaderboardContainer);

    globalThis.document = {
      getElementById(id) {
        if (!domStore.has(id)) domStore.set(id, createMockElement(id));
        return domStore.get(id);
      },
      createElement(tag) {
        return createMockElement(tag);
      },
    };
  });

  const sampleMembers = () => [
    {
      playerId: 101,
      name: 'Arthur',
      progressContribution: 1250,
      progressDiff: 250,
      actionPoints: 120,
      actionPointsDiff: 20,
    },
    {
      playerId: 102,
      name: 'Lancelot',
      progressContribution: 800,
      progressDiff: 0,
      actionPoints: 80,
      actionPointsDiff: 0,
    },
  ];

  const sampleRankings = () => [
    { rank: 1, clanId: 10, clanName: 'Knights of the Round', points: 45200 },
    { rank: 2, clanId: 20, clanName: 'Camelot Defenders', points: 38100 },
    { rank: 3, clanId: 30, clanName: 'Avalon Order', points: 29500 },
  ];

  describe('renderQuantumContributionsCard', () => {
    it('renders the card shell with member table and headers', () => {
      renderQuantumContributionsCard(sampleMembers(), 1715420000000);

      const html = contributionsContainer.innerHTML;
      assert.match(html, /id="quantumContributionsCard"/);
      assert.match(html, /id="qiContributionsTextLabel"/);
      assert.match(html, /id="qiContributionsIcon"/);
      assert.match(html, /id="qiContributionsCopyID"/);
      assert.match(html, /id="showQIchanges"/);
      assert.match(html, /Member/);
      assert.match(html, /Progress/);
      assert.match(html, /AP Spent/);
      assert.match(html, /Arthur/);
      assert.match(html, /Lancelot/);

      // Numeric cells use standard proportional font, not monospace
      assert.match(html, /<td class="text-end">1,250/);
      assert.match(html, /<td class="text-end">120/);
      assert.doesNotMatch(html, /<td class="text-end font-monospace">/);
    });

    it('renders red diff badges when changes exist', () => {
      renderQuantumContributionsCard(sampleMembers());

      const html = contributionsContainer.innerHTML;
      assert.match(html, /<span class="badge bg-danger ms-1">\+250<\/span>/);
      assert.match(html, /<span class="badge bg-danger ms-1">\+20<\/span>/);
      // Lancelot has 0 diff so no diff badge
      assert.doesNotMatch(html, />\+0</);
    });

    it('filters out unchanged members when changes-only mode is active', () => {
      renderQuantumContributionsCard(sampleMembers());
      const checkbox = domStore.get('showQIchanges');
      checkbox.checked = true;
      checkbox.dispatchEvent({ type: 'change' });

      const html = contributionsContainer.innerHTML;
      assert.match(html, /Arthur/);
      assert.doesNotMatch(html, /Lancelot/);

      // Revert checkbox
      checkbox.checked = false;
      checkbox.dispatchEvent({ type: 'change' });
    });

    it('shows empty state message when changes-only is active and no members have diffs', () => {
      const noDiffMembers = [
        {
          playerId: 1,
          name: 'Passive Member',
          progressContribution: 100,
          progressDiff: 0,
        },
      ];

      renderQuantumContributionsCard(noDiffMembers);
      const checkbox = domStore.get('showQIchanges');
      checkbox.checked = true;
      checkbox.dispatchEvent({ type: 'change' });

      const html = contributionsContainer.innerHTML;
      assert.match(html, /No active changes since last save/);

      // Revert
      checkbox.checked = false;
      checkbox.dispatchEvent({ type: 'change' });
    });
  });

  describe('renderQuantumLeaderboardCard', () => {
    it('renders the 3-column leaderboard matching the GBG layout', () => {
      renderQuantumLeaderboardCard(sampleRankings());

      const html = leaderboardContainer.innerHTML;
      assert.match(html, /id="quantumLeaderboardCard"/);
      assert.match(html, /id="qiLeaderboardTextLabel"/);
      assert.match(html, /id="qiLeaderboardIcon"/);
      assert.match(html, /id="qiLeaderboardCopyID"/);
      assert.match(
        html,
        /<table id="qiLeaderboardTable" class="goods-table w-100">/,
      );

      // Headers: Guild | Rank | Total Points
      assert.match(html, />Guild<\/th>/);
      assert.match(html, />Rank<\/th>/);
      assert.match(html, />Total Points<\/th>/);

      // Entries
      assert.match(html, /Knights of the Round/);
      assert.match(html, />1<\/td>/);
      assert.match(html, />45,200<\/td>/);

      assert.match(html, /Camelot Defenders/);
      assert.match(html, />2<\/td>/);
      assert.match(html, />38,100<\/td>/);

      // Numeric cells use standard proportional font, not monospace
      assert.match(html, /<td class="text-end">45,200<\/td>/);
      assert.match(html, /<td class="text-end">38,100<\/td>/);
      assert.doesNotMatch(html, /<td class="text-end font-monospace">/);
    });
  });
});
