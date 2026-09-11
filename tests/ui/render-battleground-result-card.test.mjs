import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import renderBattlegroundResultCardPkg from '../../src/js/ui/renderBattlegroundResultCard.js';
import { escapeHTML } from '../../src/js/utils/formatters.js';

const { renderBattlegroundResultCard, buildBattlegroundResultCardHTML } =
  renderBattlegroundResultCardPkg.default || renderBattlegroundResultCardPkg;

function createMockElement(id = '') {
  const listeners = new Map();
  return {
    id,
    innerHTML: '',
    style: {},
    className: '',
    addEventListener(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    click() {
      for (const fn of listeners.get('click') || []) fn();
    },
  };
}

describe('renderBattlegroundResultCard Suite', () => {
  let domStore;
  let targetEl;

  beforeEach(() => {
    domStore = new Map();
    targetEl = createMockElement('battleground');
    domStore.set('battleground', targetEl);
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

  const sampleResponse = () => ({
    playerLeaderboardEntries: [
      {
        rank: 1,
        player: { name: 'Alice <script>' },
        negotiationsWon: 3,
        battlesWon: 10,
        attrition: 5,
      },
      {
        rank: 2,
        player: { name: 'Bob' },
        negotiationsWon: 0,
        battlesWon: 4,
        attrition: 2,
      },
    ],
  });

  const baseOptions = () => ({
    targetEl,
    helper: { escapeHTML },
    collapse: { fCollapseBattleground() {} },
    copy: { BattlegroundCopy() {} },
  });

  it('renders the result card shell with header row and control ids', () => {
    const html = renderBattlegroundResultCard(sampleResponse(), baseOptions());

    assert.match(html, /id="battlegroundResultCard"/);
    assert.match(html, /id="battlegroundResultTextLabel"/);
    assert.match(html, /id="battlegroundicon"/);
    assert.match(html, /id="battlegroundCopyID"/);
    assert.match(
      html,
      /<th class="text-center">Rank<\/th><th class="text-start">Member<\/th><th class="text-center">Negs<\/th><th class="text-center">Fights<\/th><th class="text-center">Attrition<\/th>/,
    );
    assert.equal(targetEl.innerHTML, html);
  });

  it('renders escaped member names and centered stat cells', () => {
    const html = buildBattlegroundResultCardHTML(sampleResponse(), {
      helper: { escapeHTML },
      collapse: { collapseBattleground: false },
    });

    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /Alice <script>/);
    assert.match(
      html,
      /<td class="text-center">1<\/td><td class="text-start">Alice &lt;script&gt;<\/td><td class="text-center">3<\/td><td class="text-center">10<\/td><td class="text-center">5<\/td>/,
    );
  });

  it('computes the guild total row from negotiations and fights', () => {
    const html = buildBattlegroundResultCardHTML(sampleResponse(), {
      helper: { escapeHTML },
    });

    assert.match(html, /<th class="text-start">Guild Total<\/th>/);
    assert.match(
      html,
      /<th class="text-center">3<\/th><th class="text-center">14<\/th>/,
      'totals row must show 3 negotiations and 14 fights',
    );
  });

  it('reports legacy state rows via onRow without mutating shared state', () => {
    const rows = [];
    let mutateAttempts = 0;

    renderBattlegroundResultCard(sampleResponse(), {
      ...baseOptions(),
      onRow: (row) => {
        rows.push(row);
        mutateAttempts++;
      },
    });

    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], {
      rank: 1,
      name: 'Alice <script>',
      negotiations: 3,
      fights: 10,
      attrition: 5,
    });
    assert.deepEqual(rows[1], {
      rank: 2,
      name: 'Bob',
      negotiations: 0,
      fights: 4,
      attrition: 2,
    });
    assert.equal(mutateAttempts, 2);
  });

  it('handles missing or empty playerLeaderboardEntries without throwing', () => {
    const emptyHtml = buildBattlegroundResultCardHTML(
      { playerLeaderboardEntries: [] },
      { helper: { escapeHTML } },
    );
    assert.match(
      emptyHtml,
      /<th class="text-center">0<\/th><th class="text-center">0<\/th>/,
    );

    const missingHtml = buildBattlegroundResultCardHTML({}, {});
    assert.match(missingHtml, /id="battlegroundResultCard"/);
  });

  it('wires copy and collapse listeners cleanly', () => {
    let copyCalls = 0;
    let collapseCalls = 0;

    renderBattlegroundResultCard(sampleResponse(), {
      ...baseOptions(),
      copy: {
        BattlegroundCopy() {
          copyCalls++;
        },
      },
      collapse: {
        fCollapseBattleground() {
          collapseCalls++;
        },
      },
    });

    domStore.get('battlegroundCopyID').click();
    assert.equal(copyCalls, 1, 'copy button must trigger BattlegroundCopy');

    domStore.get('battlegroundResultTextLabel').click();
    assert.equal(
      collapseCalls,
      1,
      'label click must toggle the battleground collapse',
    );

    domStore.get('battlegroundicon').click();
    assert.equal(
      collapseCalls,
      2,
      'icon click must toggle the battleground collapse once',
    );
  });
});
