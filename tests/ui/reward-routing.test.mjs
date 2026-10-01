import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const { addToBucket, resolveBucketKey, SOURCE_BUCKETS } =
  await import('../../src/js/ui/rewardCategories.js');
const questPkg = await import('../../src/js/msg/QuestService.js');
const { QuestService } = questPkg.default || questPkg;

const rewardCategoriesSrc = readFileSync(
  fileURLToPath(
    new URL('../../src/js/ui/rewardCategories.js', import.meta.url),
  ),
  'utf8',
);
const rewardRendererSrc = readFileSync(
  fileURLToPath(new URL('../../src/js/ui/RewardRenderer.mjs', import.meta.url)),
  'utf8',
);
const cityProductionSrc = readFileSync(
  fileURLToPath(
    new URL('../../src/js/msg/CityProductionService.js', import.meta.url),
  ),
  'utf8',
);

function makeBuckets() {
  return { rewardsGeneric: {}, rewardsCity: {}, rewardsArmy: {} };
}

test('Reward routing — single-source category map', async (t) => {
  await t.test('maps only the explicit sources to their categories', () => {
    assert.deepEqual(SOURCE_BUCKETS, {
      greatBuilding: 'rewardsGeneric',
      battleground: 'rewardsGeneric',
      expedition: 'rewardsGeneric',
      pvpArena: 'rewardsGeneric',
      antiquesShop: 'rewardsGeneric',
      antiquesSales: 'rewardsGeneric',
      himejiCastle: 'rewardsGeneric',
      spaceCarrier: 'rewardsGeneric',
      quest: 'rewardsCity',
      cityProductionArmy: 'rewardsArmy',
      cityProductionCity: 'rewardsCity',
    });
  });

  await t.test('resolves known sources and rejects unknown ones', () => {
    assert.equal(resolveBucketKey('greatBuilding'), 'rewardsGeneric');
    assert.equal(resolveBucketKey('quest'), 'rewardsCity');
    assert.equal(resolveBucketKey('expedition'), 'rewardsGeneric');
    assert.equal(resolveBucketKey('cityProductionArmy'), 'rewardsArmy');
    assert.equal(resolveBucketKey('cityProductionCity'), 'rewardsCity');
    assert.equal(resolveBucketKey('guildExpedition'), null);
    assert.equal(resolveBucketKey('battlegrounds_conquest'), null);
    assert.equal(resolveBucketKey('otherPlayer'), null);
  });

  await t.test('isolates each source to exactly one bucket', () => {
    const buckets = makeBuckets();

    assert.equal(
      addToBucket(buckets, 'greatBuilding', 'Arc BP', 2),
      'rewardsGeneric',
    );
    assert.equal(buckets.rewardsGeneric['Arc BP'], 2);
    assert.deepEqual(buckets.rewardsCity, {});
    assert.deepEqual(buckets.rewardsArmy, {});

    assert.equal(addToBucket(buckets, 'quest', 'Wood', 5), 'rewardsCity');
    assert.equal(buckets.rewardsCity.Wood, 5);
    assert.deepEqual(buckets.rewardsArmy, {});

    assert.equal(
      addToBucket(buckets, 'cityProductionArmy', 'Spearfighter', 1),
      'rewardsArmy',
    );
    assert.equal(buckets.rewardsArmy.Spearfighter, 1);

    assert.equal(
      addToBucket(buckets, 'cityProductionCity', 'Iron', 3),
      'rewardsCity',
    );
    assert.equal(buckets.rewardsCity.Iron, 3);
    assert.equal(buckets.rewardsGeneric['Arc BP'], 2);
  });

  await t.test('accumulates repeat rewards in the same bucket', () => {
    const buckets = makeBuckets();
    addToBucket(buckets, 'quest', 'Coins', 10);
    addToBucket(buckets, 'quest', 'Coins', 4);
    assert.equal(buckets.rewardsCity.Coins, 14);
  });

  await t.test('ignores unknown sources without mutating buckets', () => {
    const buckets = makeBuckets();
    assert.equal(addToBucket(buckets, 'guildExpedition', 'Relic', 1), null);
    assert.deepEqual(buckets, makeBuckets());
  });

  await t.test('RewardRenderer delegates bucketing to the shared map', () => {
    assert.match(rewardRendererSrc, /import \{ addToBucket \}/);
    assert.match(
      rewardRendererSrc,
      /export function showReward\(source, payload\)/,
    );
    assert.match(rewardRendererSrc, /createLogger\('RewardRenderer'\)/);
    assert.doesNotMatch(rewardRendererSrc, /guildExpedition/);
    assert.doesNotMatch(rewardRendererSrc, /battlegrounds_conquest/);
  });

  await t.test('category map owns the only reward bucket definitions', () => {
    assert.match(rewardCategoriesSrc, /greatBuilding: 'rewardsGeneric'/);
    assert.match(rewardCategoriesSrc, /quest: 'rewardsCity'/);
    assert.match(rewardCategoriesSrc, /cityProductionArmy: 'rewardsArmy'/);
    assert.match(rewardCategoriesSrc, /cityProductionCity: 'rewardsCity'/);
  });
});

test('QuestService routes only completed quest rewards to RewardState', async (t) => {
  await t.test('routes completed quest rewards once via quest source', () => {
    const calls = [];
    const service = new QuestService({
      rewardState: {
        setReward: (entry) => calls.push(entry),
      },
    });

    const completedReward = {
      type: 'resource',
      subType: 'coins',
      name: 'Coins',
      amount: 500,
    };
    const activeReward = {
      type: 'resource',
      subType: 'supplies',
      name: 'Supplies',
      amount: 100,
    };

    const msg = {
      responseData: [
        {
          id: 101,
          title: 'Done',
          state: 'closed',
          genericRewards: [completedReward],
        },
        {
          id: 102,
          title: 'Pending',
          state: 'accepted',
          genericRewards: [activeReward],
        },
      ],
    };

    service.getUpdates(msg);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].source, 'quest');
    assert.equal(calls[0].payload, completedReward);
  });

  await t.test('does not re-route the same completed quest twice', () => {
    const calls = [];
    const service = new QuestService({
      rewardState: {
        setReward: (entry) => calls.push(entry),
      },
    });

    const msg = {
      responseData: [
        {
          id: 201,
          title: 'Done',
          state: 'closed',
          genericRewards: [{ type: 'resource', subType: 'coins', amount: 5 }],
        },
      ],
    };

    service.getUpdates(msg);
    service.getUpdates(msg);

    assert.equal(calls.length, 1);
  });

  await t.test('routes rewards when a quest transitions to completed', () => {
    const calls = [];
    const service = new QuestService({
      rewardState: {
        setReward: (entry) => calls.push(entry),
      },
    });

    const reward = { type: 'resource', subType: 'coins', amount: 5 };
    service.getUpdates({
      responseData: [{ id: 301, state: 'accepted', genericRewards: [reward] }],
    });
    assert.equal(calls.length, 0);

    service.getUpdates({
      responseData: [{ id: 301, state: 'closed', genericRewards: [reward] }],
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].source, 'quest');
  });

  await t.test(
    'suppressStartupQuests: true suppresses closed quests on startup initial batch but allows subsequent completions',
    () => {
      const calls = [];
      const service = new QuestService({
        suppressStartupQuests: true,
        rewardState: {
          setReward: (entry) => calls.push(entry),
        },
      });

      const startupReward = { type: 'item', subType: 'upgrade_kit', amount: 1 };
      const subsequentReward = {
        type: 'resource',
        subType: 'coins',
        amount: 50,
      };

      // Initial startup batch with closed historical quest
      service.getUpdates({
        responseData: [
          { id: 401, state: 'closed', genericRewards: [startupReward] },
          { id: 402, state: 'accepted', genericRewards: [subsequentReward] },
        ],
      });
      assert.equal(calls.length, 0, 'Startup closed quests must be suppressed');

      // Subsequent update where 402 transitions to closed
      service.getUpdates({
        responseData: [
          { id: 401, state: 'closed', genericRewards: [startupReward] },
          { id: 402, state: 'closed', genericRewards: [subsequentReward] },
        ],
      });
      assert.equal(
        calls.length,
        1,
        'Subsequent quest completion must be routed',
      );
      assert.equal(calls[0].payload, subsequentReward);
    },
  );

  await t.test('stays silent when reward routing is disabled', () => {
    const calls = [];
    const service = new QuestService({
      rewardState: {
        setReward: (entry) => calls.push(entry),
      },
    });
    service.resolveShowRewards = () => false;

    service.getUpdates({
      responseData: [
        {
          id: 401,
          state: 'closed',
          genericRewards: [{ type: 'resource', subType: 'coins', amount: 5 }],
        },
      ],
    });

    assert.equal(calls.length, 0);
  });
});

test('CityProductionService publishes rewards to the shared RewardState', () => {
  assert.match(cityProductionSrc, /rewardState\.setReward\(\{/);
  assert.match(cityProductionSrc, /source: 'cityProductionArmy'/);
  assert.match(cityProductionSrc, /source: 'cityProductionCity'/);
  assert.doesNotMatch(cityProductionSrc, /showReward\(/);
  assert.doesNotMatch(cityProductionSrc, /rewardsArmy\[/);
  assert.doesNotMatch(cityProductionSrc, /rewardsCity\[/);
});

test('recurring quests count each cycle but never duplicate its completed update', () => {
  const entries = [];
  const service = new QuestService({
    rewardState: { setReward: (entry) => entries.push(entry) },
  });
  const random = { type: '', name: 'Random Reward', flags: ['random'] };
  const good = {
    type: 'good',
    subType: 'dark_energy_battery',
    amount: 5,
    name: '5 Dark Energy Batteries',
  };
  const update = (state, rewards) =>
    service.getUpdates({
      responseData: [
        { id: 1, type: 'generic', state, genericRewards: rewards },
      ],
    });
  update('accepted', [random]);
  update('collectReward', [good]);
  update('collectReward', [good]);
  assert.equal(entries.length, 1);
  update('accepted', [random]);
  const fp = {
    type: 'resource',
    subType: 'strategy_points',
    amount: 10,
    name: '10 Forge Points',
  };
  update('collectReward', [fp]);
  update('collectReward', [fp]);
  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map((entry) => entry.payload),
    [good, fp],
  );
  assert.deepEqual(
    entries.map((x) => x.source),
    ['quest', 'quest'],
  );
});
test('empty or unresolved completion rewards do not block a later resolved payout', () => {
  const entries = [];
  const service = new QuestService({
    rewardState: { setReward: (entry) => entries.push(entry) },
  });
  for (const genericRewards of [
    [],
    [{ type: '', name: 'Random Reward' }],
    [{ type: 'resource', subType: 'supplies', amount: 500 }],
  ])
    service.getUpdates({
      responseData: [{ id: 1, state: 'collectReward', genericRewards }],
    });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].payload.subType, 'supplies');
});

test('captured EN7 recurring goods rewards publish once per completed cycle', () => {
  const packet = JSON.parse(
    readFileSync(
      new URL(
        '../fixtures/rpc/live/recurring-quest-rewards.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const calls = [];
  const service = new QuestService({
    rewardState: { setReward: (entry) => calls.push(entry) },
  });
  service.getUpdates(packet);
  service.getUpdates(packet);
  assert.equal(calls.length, 2);
  assert.deepEqual(
    calls.map((entry) => [
      entry.source,
      entry.payload.subType,
      entry.payload.amount,
    ]),
    [
      ['quest', 'dark_energy_battery', 5],
      ['quest', 'deep_space_data', 5],
    ],
  );
});

test('captured repeated quest IDs award different loot on successive cycles', () => {
  const sequence = JSON.parse(
    readFileSync(
      new URL(
        '../fixtures/rpc/live/recurring-quest-cycles.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const entries = [];
  const service = new QuestService({
    suppressStartupQuests: true,
    rewardState: { setReward: (entry) => entries.push(entry) },
  });
  for (const packet of sequence) service.getUpdates(packet);
  assert.deepEqual(
    entries.map((entry) => [entry.payload.name, entry.payload.amount]),
    [
      ['5 Dark Energy Batteries', 5],
      ['5 Deep Space Data', 5],
      ['177,300 Coins', 177300],
      ['5 Silver Crystals', 5],
      ['560,400 Coins', 560400],
    ],
  );
});
