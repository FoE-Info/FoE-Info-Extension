import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'webextension-polyfill')
      return {
        url: 'data:text/javascript,export default {}',
        shortCircuit: true,
      };
    return nextResolve(specifier, context);
  },
});
const { collectReward, rewardService } =
  await import('../../src/js/msg/RewardService.js');
const packet = JSON.parse(
  fs.readFileSync(
    new URL('../fixtures/rpc/live/gbg-collected-reward.json', import.meta.url),
    'utf8',
  ),
);
test('captured GBG collectReward envelope publishes its actual reward through shared state', () => {
  const entries = [];
  collectReward(packet, {
    state: { setReward: (entry) => entries.push(entry) },
    options: { showGBGrewards: true },
  });
  assert.deepEqual(entries, [
    { source: 'battleground', payload: packet.responseData[0][0] },
  ]);
});
test('GBG reward toggle suppresses publication; unrelated sources and malformed envelopes are ignored', () => {
  const entries = [],
    state = { setReward: (entry) => entries.push(entry) };
  collectReward(packet, { state, options: { showGBGrewards: false } });
  for (const responseData of [
    undefined,
    [],
    [[], 'quest'],
    [null, 'battlegrounds_conquest'],
  ])
    collectReward({ responseData }, { state, options: {} });
  assert.deepEqual(entries, []);
});
test('reward service registers the collected reward route centrally', () => {
  const routes = [];
  rewardService.register({ register: (...args) => routes.push(args) });
  assert.equal(routes[0][0], 'RewardService');
  assert.equal(routes[0][1], 'collectReward');
  assert.equal(typeof routes[0][2], 'function');
});

test('captured GE source routes through its own toggle and reward bucket', () => {
  const payload = {
    type: 'consumable',
    subType: 'fragment',
    amount: 4,
    name: '4 Fragments of Ancient Temple - Active',
  };
  const entries = [];
  const state = { setReward: (entry) => entries.push(entry) };
  const msg = { responseData: [[payload], 'guildExpedition'] };
  collectReward(msg, {
    state,
    options: { showGErewards: true, showGBGrewards: false },
  });
  assert.deepEqual(entries, [{ source: 'expedition', payload }]);
  collectReward(msg, { state, options: { showGErewards: false } });
  assert.equal(entries.length, 1);
});

test('GE notification rewards use the same GE route', () => {
  const payload = { type: 'resource', subType: 'gex_coyote', amount: 900 };
  const entries = [];
  collectReward(
    { responseData: [[payload], 'guild_expedition_reward_notification'] },
    {
      state: { setReward: (entry) => entries.push(entry) },
      options: { showGErewards: true },
    },
  );
  assert.deepEqual(entries, [{ source: 'expedition', payload }]);
});

test('captured PvP rewards publish goods and chest contents without counting the chest twice', () => {
  const packets = JSON.parse(
    fs.readFileSync(
      new URL(
        '../fixtures/rpc/live/pvp-collected-rewards.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const entries = [];
  for (const packet of packets)
    collectReward(packet, {
      state: { setReward: (entry) => entries.push(entry) },
      options: { showGBRewards: true },
    });
  assert.deepEqual(
    entries.map(({ source, payload }) => [
      source,
      payload.subType,
      payload.amount,
    ]),
    [
      ['pvpArena', 'deep_space_data', 20],
      ['pvpArena', 'pvp_arena_attempt', 5],
      ['pvpArena', 'money', 710000],
      ['pvpArena', 'supplies', 1330000],
      ['pvpArena', 'pvp_arena_attempt', 2],
    ],
  );
  const disabled = [];
  collectReward(packets[0], {
    state: { setReward: (entry) => disabled.push(entry) },
    options: { showGBRewards: false },
  });
  assert.deepEqual(disabled, []);
});

test('six captured Antiques Dealer purchases publish exactly six purchased rewards', () => {
  const packets = JSON.parse(
    fs.readFileSync(
      new URL(
        '../fixtures/rpc/live/antiques-shop-rewards.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  assert.equal(packets.length, 6);
  const entries = [];
  for (const packet of packets)
    collectReward(packet, {
      state: { setReward: (entry) => entries.push(entry) },
      options: { showGBRewards: true },
    });
  assert.equal(entries.length, 6);
  assert.ok(
    entries.every(
      (entry) => entry.source === 'antiquesShop' && entry.payload.amount === 1,
    ),
  );
  assert.deepEqual(
    entries.map((entry) => entry.payload.name),
    [
      'Gift Tower',
      'Victory Tower Upgrade Kit',
      'Hanami Bridge Selection Kit',
      'Fragment of Wishing Well',
      'Gate Statue East',
      '8h Mass Coin Rush',
    ],
  );
});

test('EN16 collected exchange publishes actual Trade Coins and Gemstones, including bonuses', () => {
  const packet = JSON.parse(
    fs.readFileSync(
      new URL(
        '../fixtures/rpc/live/antiques-exchange-rewards.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const entries = [];
  collectReward(packet, {
    state: { setReward: (entry) => entries.push(entry) },
    options: { showGBRewards: true },
  });
  assert.deepEqual(
    entries.map(({ source, payload }) => [
      source,
      payload.subType,
      payload.amount,
    ]),
    [
      ['antiquesSales', 'trade_coins', 21384],
      ['antiquesSales', 'gemstones', 32],
    ],
  );
});

test('Himeji rewards retain their building source regardless of combat context', () => {
  const packet = JSON.parse(
    fs.readFileSync(
      new URL('../fixtures/rpc/live/gbg-spoils-reward.json', import.meta.url),
      'utf8',
    ),
  );
  for (const view of ['GBG', 'GE', 'OWN_CITY', null]) {
    const entries = [];
    collectReward(packet, {
      state: { setReward: (entry) => entries.push(entry) },
      options: {
        showGBRewards: true,
        showGBGrewards: false,
        showGErewards: false,
      },
      getCurrentView: () => view,
    });
    assert.equal(entries[0].source, 'himejiCastle');
  }
  const disabled = [];
  collectReward(packet, {
    state: { setReward: (entry) => disabled.push(entry) },
    options: { showGBRewards: false },
  });
  assert.deepEqual(disabled, []);
});
test('Space Carrier rewards use their building source', () => {
  const entries = [];
  collectReward(
    {
      responseData: [
        [{ type: 'resource', subType: 'strategy_points', amount: 10 }],
        'diplomaticGifts',
      ],
    },
    {
      state: { setReward: (entry) => entries.push(entry) },
      options: { showGBRewards: true },
    },
  );
  assert.equal(entries[0].source, 'spaceCarrier');
});
