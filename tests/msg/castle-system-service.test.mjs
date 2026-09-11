import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import castlePkg from '../../src/js/msg/CastleSystemService.js';

const {
  CastleSystemService,
  castleSystemService,
  getOverview,
  getCastleSystemPlayer,
  getBoostsForStage,
  getBoostsForEntity,
} = castlePkg;

function loadFixture(filename) {
  const filePath = new URL(
    `../../tests/fixtures/rpc/${filename}`,
    import.meta.url,
  );
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('CastleSystemService', async (t) => {
  const playerFixture = loadFixture(
    'CastleSystemService.getCastleSystemPlayer.json',
  );
  const overviewFixture = loadFixture('CastleSystemService.getOverview.json');

  const playerMsg = { responseData: playerFixture };
  const overviewMsg = { responseData: overviewFixture };

  await t.test('exposes a module singleton and bound helpers', () => {
    assert.ok(castleSystemService instanceof CastleSystemService);
    assert.strictEqual(typeof getOverview, 'function');
    assert.strictEqual(typeof getCastleSystemPlayer, 'function');
    assert.strictEqual(typeof getBoostsForStage, 'function');
    assert.strictEqual(typeof getBoostsForEntity, 'function');
  });

  await t.test('getCastleSystemPlayer parses level and next thresholds', () => {
    const service = new CastleSystemService();
    const result = service.getCastleSystemPlayer(playerMsg);

    assert.equal(result.success, true);
    assert.equal(result.level, 15);
    assert.equal(service.getLevel(), 15);
    assert.equal(service.nextCastlePoints.castlePointsWinBattle, 30);
    assert.equal(
      service.nextCastlePoints.castlePointsItemShopTradeCoinsDivisor,
      300,
    );
    assert.ok(service.getSummary().lastUpdated !== null);
  });

  await t.test(
    'getCastleSystemPlayer defaults safely on empty payloads',
    () => {
      const service = new CastleSystemService();
      assert.equal(service.getCastleSystemPlayer({}).level, 0);
      assert.equal(service.getCastleSystemPlayer(null).level, 0);
      assert.equal(service.nextCastlePoints, null);
    },
  );

  await t.test('getOverview parses daily collection timestamps', () => {
    const service = new CastleSystemService();
    const result = service.getOverview(overviewMsg);

    assert.equal(result.success, true);
    assert.equal(
      result.dailyPointsCollectionAvailableAt,
      overviewFixture.dailyPointsCollectionAvailableAt,
    );
    assert.equal(
      service.dailyRewardCollectionAvailableAt,
      overviewFixture.dailyRewardCollectionAvailableAt,
    );
  });

  await t.test('availability helpers respect timestamps and zero state', () => {
    const service = new CastleSystemService();
    assert.equal(service.isDailyRewardAvailable(), false);
    assert.equal(service.isDailyPointsAvailable(), false);
    assert.equal(service.isDailyBonusPointsAvailable(), false);

    service.getOverview(overviewMsg);
    const at = overviewFixture.dailyRewardCollectionAvailableAt;
    assert.equal(service.isDailyRewardAvailable(at), true);
    assert.equal(service.isDailyRewardAvailable(at - 1), false);
    assert.equal(service.isDailyPointsAvailable(at + 1), true);
  });

  await t.test('getBoostsForStage maps 0-7 and rejects unknown stages', () => {
    const service = new CastleSystemService();
    assert.deepEqual(service.getBoostsForStage(0), {
      attackerAtt: 0,
      attackerDef: 0,
      defenderAtt: 0,
      defenderDef: 0,
    });
    assert.deepEqual(service.getBoostsForStage('4'), {
      attackerAtt: 30,
      attackerDef: 30,
      defenderAtt: 30,
      defenderDef: 30,
    });
    assert.deepEqual(service.getBoostsForStage(7), {
      attackerAtt: 60,
      attackerDef: 60,
      defenderAtt: 60,
      defenderDef: 60,
    });
    assert.equal(service.getBoostsForStage(99), null);
  });

  await t.test('getBoostsForEntity resolves castle map entity stages', () => {
    const service = new CastleSystemService();
    assert.deepEqual(
      service.getBoostsForEntity({
        cityentity_id: 'V_AllAge_CastleSystem4',
      }),
      { attackerAtt: 30, attackerDef: 30, defenderAtt: 30, defenderDef: 30 },
    );
    assert.deepEqual(
      service.getBoostsForEntity({
        cityentity_id: 'V_AllAge_CastleSystem6',
      }),
      { attackerAtt: 45, attackerDef: 45, defenderAtt: 45, defenderDef: 45 },
    );
    assert.equal(
      service.getBoostsForEntity({ cityentity_id: 'W_MultiAge_Tower1' }),
      null,
    );
    assert.equal(service.getBoostsForEntity({}), null);
    assert.equal(service.getBoostsForEntity(null), null);
  });

  await t.test('register wires both RPC methods to a dispatcher', () => {
    const registered = [];
    const dispatcher = {
      register(requestClass, method, handler) {
        registered.push([requestClass, method, handler]);
      },
    };

    const service = new CastleSystemService();
    const returned = service.register(dispatcher);

    assert.strictEqual(returned, service);
    assert.deepEqual(
      registered.map(([requestClass, method]) => [requestClass, method]),
      [
        ['CastleSystemService', 'getOverview'],
        ['CastleSystemService', 'getCastleSystemPlayer'],
      ],
    );
    assert.equal(typeof registered[0][2], 'function');
  });
});
