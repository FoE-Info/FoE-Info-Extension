import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/CityDomainState.js';
import bindingPkg from '../../src/js/ui/bonusPanel.js';

const { BonusState } = statePkg;
const { bindBonusPanel } = bindingPkg;

test('bonusRenderBinding - replays bonus state to the panel', async (t) => {
  await t.test('renders summary then updates each amount span', () => {
    const state = new BonusState();
    const calls = [];
    const off = bindBonusPanel(state, {
      renderSummary: (html, summary) => calls.push(['summary', html, summary]),
      updateAmount: (id, amount) => calls.push(['amount', id, amount]),
      updateDailyFp: (total) => calls.push(['daily', total]),
    });

    state.setSummary({
      bonusHTML: 'Spoils',
      aid: 1,
      spoils: 2,
      diplomatic: 3,
      strike: 4,
      dailyForgePoints: 12,
    });
    off();

    assert.deepEqual(calls, [
      ['summary', 'Spoils', { aid: 1, spoils: 2, diplomatic: 3, strike: 4 }],
      ['amount', 'spoilsID', 2],
      ['amount', 'diplomaticID', 3],
      ['amount', 'firststrikeID', 4],
      ['amount', 'aidID', 1],
      ['daily', 12],
    ]);
  });

  await t.test('skips daily fp when not present', () => {
    const state = new BonusState();
    const calls = [];
    bindBonusPanel(state, {
      renderSummary: () => calls.push('summary'),
      updateAmount: () => {},
      updateDailyFp: () => calls.push('daily'),
    });

    state.setSummary({ spoils: 5 });

    assert.deepEqual(calls, ['summary']);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindBonusPanel(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});

test('limited bonus rows show only reported bonuses and resolve building names from metadata', () => {
  const { formatLimitedBonuses } = bindingPkg;
  const store = {
    entities: new Map([
      [
        'himeji',
        {
          name: 'Himeji Castle',
          type: 'greatbuilding',
          passive_bonus: { type: 'spoils_of_war' },
        },
      ],
      [
        'virgo',
        {
          name: 'The Virgo Project',
          type: 'greatbuilding',
          passive_bonus: { type: 'missile_launch' },
        },
      ],
      [
        'kraken',
        {
          name: 'The Kraken',
          type: 'greatbuilding',
          passive_bonus: { type: 'first_strike' },
        },
      ],
    ]),
  };
  const html = formatLimitedBonuses(
    [
      { type: 'spoils_of_war', remaining: 9, value: 47 },
      { type: 'missile_launch', remaining: 3 },
      { type: 'double_collection', remaining: null },
    ],
    store,
  );
  assert.match(html, /Himeji Castle/);
  assert.match(html, />9<\/strong>/);
  assert.match(html, /The Virgo Project/);
  assert.match(html, />3<\/strong>/);
  assert.match(html, /—<\/strong>/);
  assert.doesNotMatch(html, /Kraken|47/);
});

test('passive chances and shard spawning never render as remaining uses', () => {
  const html = bindingPkg.formatLimitedBonuses(
    [
      {
        type: 'helping_hands',
        kind: 'passive',
        buildingName: 'Seed Vault',
        value: 10,
      },
      {
        type: 'mysterious_shards',
        kind: 'passive',
        buildingName: 'Flying Island',
        remaining: 19,
        amount: 19,
      },
    ],
    { entities: new Map() },
  );
  assert.match(html, /Seed Vault/);
  assert.match(html, /10%/);
  assert.match(html, /Flying Island/);
  assert.match(html, /19%/);
  assert.doesNotMatch(html, /Remaining/);
});
