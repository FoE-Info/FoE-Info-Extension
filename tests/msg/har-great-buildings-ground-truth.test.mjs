import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function loadBundle(name) {
  return JSON.parse(
    fs.readFileSync(
      new URL(`../fixtures/rpc/har/greatbuildings/${name}`, import.meta.url),
    ),
  );
}

const OVERVIEW = loadBundle('other_player_overview.json');
const CONSTRUCTION = loadBundle('construction.json');
const CONTRIBUTE = loadBundle('contribute_forge_points.json');
const CITY_ENTITY = loadBundle('other_player_city_map_entity.json');
const PACKAGES = loadBundle('available_package_forge_points.json');

test('HAR ground truth: Great Buildings overview & construction', async (t) => {
  await t.test('getOtherPlayerOverview returns contribution rows', () => {
    assert.ok(OVERVIEW.captures.length >= 1);
    let rows = 0;
    let complete = 0;
    for (const capture of OVERVIEW.captures) {
      assert.ok(Array.isArray(capture.responseData));
      for (const row of capture.responseData) {
        rows++;
        if (
          row.player &&
          typeof row.player.name === 'string' &&
          typeof row.forge_points === 'number' &&
          typeof row.entity_id === 'number' &&
          typeof row.city_entity_id === 'string' &&
          typeof row.level === 'number' &&
          typeof row.current_progress === 'number' &&
          typeof row.max_progress === 'number'
        ) {
          complete++;
        }
      }
    }
    assert.ok(rows > 0);
    assert.ok(complete > 0, 'expected fully-populated contribution rows');
  });

  await t.test('getConstruction carries next bonuses and rankings', () => {
    assert.ok(CONSTRUCTION.captures.length >= 1);
    let sawForgePoints = false;
    for (const capture of CONSTRUCTION.captures) {
      const data = capture.responseData;
      assert.ok(data.next_passive_bonus, 'missing next_passive_bonus');
      assert.ok(Array.isArray(data.rankings));
      assert.ok(data.rankings.length > 0);
      for (const row of data.rankings) {
        assert.ok(row.player);
      }
      if (data.rankings.some((row) => typeof row.forge_points === 'number')) {
        sawForgePoints = true;
      }
    }
    assert.ok(sawForgePoints, 'expected ranking rows with forge_points');
  });
});

test('HAR ground truth: Great Buildings contributions', async (t) => {
  await t.test('contributeForgePoints request shape', () => {
    assert.ok(CONTRIBUTE.captures.length >= 1);
    for (const capture of CONTRIBUTE.captures) {
      const req = capture.requestData;
      assert.ok(Array.isArray(req) && req.length >= 4);
      const [entityId, playerId, level, amount] = req;
      assert.equal(typeof entityId, 'number');
      assert.equal(typeof playerId, 'number');
      assert.equal(typeof level, 'number');
      assert.equal(typeof amount, 'number');
      assert.equal(typeof req[4], 'boolean');
    }
  });

  await t.test('contribution response is ranked reward rows', () => {
    const withRanks = CONTRIBUTE.captures.find((c) =>
      Array.isArray(c.responseData),
    );
    assert.ok(withRanks, 'expected an array response');
    const rows = withRanks.responseData;
    assert.ok(rows.length > 0);
    let contributorRows = 0;
    for (const row of rows) {
      assert.ok(row.player);
      if (typeof row.forge_points === 'number') contributorRows++;
      if (row.reward) {
        assert.equal(typeof row.reward.blueprints, 'number');
        assert.equal(typeof row.reward.strategy_point_amount, 'number');
      }
    }
    assert.ok(contributorRows > 0, 'expected at least one contributor row');
    const ranked = rows.filter((r) => typeof r.rank === 'number');
    if (ranked.length > 0) {
      assert.equal(Math.min(...ranked.map((r) => r.rank)), 1);
    }
  });

  await t.test(
    'getAvailablePackageForgePoints returns a numeric amount',
    () => {
      assert.ok(PACKAGES.captures.length >= 1);
      for (const capture of PACKAGES.captures) {
        const value =
          Array.isArray(capture.responseData) ?
            capture.responseData[0]
          : capture.responseData;
        assert.equal(typeof value, 'number');
        assert.ok(value >= 0);
      }
    },
  );
});

test('HAR ground truth: foreign GB entity progress consistency', async (t) => {
  await t.test(
    'city-map invested/level-up values match the overview at the same level',
    () => {
      const overviewByEntity = new Map();
      for (const capture of OVERVIEW.captures) {
        for (const row of capture.responseData || []) {
          overviewByEntity.set(String(row.entity_id), row);
        }
      }

      let compared = 0;
      for (const capture of CITY_ENTITY.captures) {
        const entity = capture.responseData;
        if (!entity || entity.id === undefined) continue;
        const row = overviewByEntity.get(String(entity.id));
        if (!row) continue;
        // Skip snapshots where the building was leveled between captures.
        if (row.level !== entity.level) continue;
        const state = entity.state || {};
        assert.equal(
          Number(row.current_progress),
          Number(state.invested_forge_points),
          `entity ${entity.id} invested FPs`,
        );
        assert.equal(
          Number(row.max_progress),
          Number(state.forge_points_for_level_up),
          `entity ${entity.id} level-up threshold`,
        );
        compared++;
      }
      assert.ok(compared > 0, 'expected at least one same-level comparison');
    },
  );
});
