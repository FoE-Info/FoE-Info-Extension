import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const memberContributionsFixture = JSON.parse(
  fs.readFileSync(
    new URL(
      '../fixtures/rpc/har/qi/member_contributions.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

const rankingsFixture = JSON.parse(
  fs.readFileSync(
    new URL('../fixtures/rpc/har/qi/rankings.json', import.meta.url),
    'utf8',
  ),
);

test('GuildRaidsService Suite', async (t) => {
  const { GuildRaidsService } =
    await import('../../src/js/msg/GuildRaidsService.js');

  await t.test('initializes with empty activity and leaderboard state', () => {
    const service = new GuildRaidsService();
    assert.deepEqual(service.getMemberActivity(), []);
    assert.deepEqual(service.getLeaderboard(), []);
    assert.equal(service.getLastSaved(), null);
  });

  await t.test(
    'parses real getMemberActivityOverview capture from InnoGames',
    () => {
      const service = new GuildRaidsService();
      const mockStorage = new Map();
      const storageAdapter = {
        get: (key) => mockStorage.get(key),
        set: (key, val) => mockStorage.set(key, val),
      };

      const msg = memberContributionsFixture.captures[0];
      const result = service.handleMemberActivityOverview(msg, storageAdapter);

      assert.equal(result.success, true);
      assert.equal(result.totalMembers, 72);
      assert.equal(result.members.length, 72);

      const top = result.members[0];
      assert.equal(top.name, 'Lexe2k');
      assert.equal(top.playerId, 854712836);
      assert.equal(top.progressContribution, 13120);
      assert.equal(top.actionPoints, 4602900);
      assert.equal(top.progressDiff, 0);
      assert.equal(top.actionPointsDiff, 0);

      // Verify stored in adapter
      assert.ok(mockStorage.has('qiPerformance'));
      assert.ok(mockStorage.has('qiTime'));
    },
  );

  await t.test(
    'computes member progress and action point diffs on subsequent updates',
    () => {
      const service = new GuildRaidsService();
      const mockStorage = new Map();
      mockStorage.set('qiPerformance', [
        {
          playerId: 854712836,
          name: 'Lexe2k',
          progressContribution: 13000,
          actionPoints: 4600000,
        },
        {
          playerId: 8457018,
          name: 'robinmagister',
          progressContribution: 11840,
          actionPoints: 4149900,
        },
      ]);

      const storageAdapter = {
        get: (key) => mockStorage.get(key),
        set: (key, val) => mockStorage.set(key, val),
      };

      const msg = memberContributionsFixture.captures[0];
      const result = service.handleMemberActivityOverview(msg, storageAdapter);

      const lexe = result.members.find((m) => m.name === 'Lexe2k');
      assert.ok(lexe);
      assert.equal(lexe.progressDiff, 120); // 13120 - 13000
      assert.equal(lexe.actionPointsDiff, 2900); // 4602900 - 4600000

      const robin = result.members.find((m) => m.name === 'robinmagister');
      assert.ok(robin);
      assert.equal(robin.progressDiff, 0);
      assert.equal(robin.actionPointsDiff, 0);

      // Filtering changes only
      const changed = service.filterChangesOnly(result.members);
      assert.ok(changed.length >= 1);
      assert.ok(changed.some((m) => m.name === 'Lexe2k'));
      assert.ok(!changed.some((m) => m.name === 'robinmagister'));
    },
  );

  await t.test(
    'parses real searchRanking guild_raids championship capture',
    () => {
      const service = new GuildRaidsService();
      const msg = rankingsFixture.captures[0];
      const result = service.handleSearchRanking(msg);

      assert.equal(result.success, true);
      assert.ok(result.rankings.length >= 10);

      const first = result.rankings[0];
      assert.equal(first.rank, 1);
      assert.equal(first.clanName, 'FightClub⚔️👊😎☕');
      assert.equal(first.points, 400410);
      assert.equal(first.championshipsWon, 11);
    },
  );

  await t.test(
    'ignores searchRanking messages for non-guild_raids categories',
    () => {
      const service = new GuildRaidsService();
      const msg = {
        requestData: [
          { __enum__: 'RankingCategory', value: 'great_buildings' },
        ],
        responseData: { rankings: [] },
      };
      const result = service.handleSearchRanking(msg);
      assert.equal(result.ignored, true);
      assert.deepEqual(service.getLeaderboard(), []);
    },
  );
});
