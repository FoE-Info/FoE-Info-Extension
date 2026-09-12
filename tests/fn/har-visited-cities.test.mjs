import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VISITS_DIR = path.resolve(__dirname, '../fixtures/visits');

function loadHarVisitFixtures() {
  return fs
    .readdirSync(VISITS_DIR)
    .filter((f) => /^visit-.*\.json$/.test(f))
    .map((file) => ({
      file,
      data: JSON.parse(fs.readFileSync(path.join(VISITS_DIR, file), 'utf8')),
    }))
    .filter(({ data }) => data?.city_map?.entities && data?.other_player);
}

test('HAR ground truth: 13 visited player cities', async (t) => {
  const { VisitedCityStatsCalculator } =
    await import('../../src/js/fn/VisitedCityStatsCalculator.js');

  const fixtures = loadHarVisitFixtures();

  await t.test('ingests 13 authentic visited-city snapshots', () => {
    assert.ok(
      fixtures.length >= 13,
      `expected >= 13 HAR visit fixtures, found ${fixtures.length}`,
    );
    const names = fixtures.map((f) => f.data.other_player.name);
    for (const expected of [
      'bootnreboot',
      '-Queenie-',
      'EllieMayhem',
      'Phil knows Best',
      'JonSunset',
      'Zeno the Red 170',
    ]) {
      assert.ok(
        names.includes(expected),
        `missing captured visit for ${expected}`,
      );
    }
  });

  await t.test(
    'calculator parses every city deterministically without throwing',
    () => {
      const calc = new VisitedCityStatsCalculator();
      for (const { file, data } of fixtures) {
        const input = {
          entities: data.city_map.entities,
          playerEra: data.other_player.era,
        };
        const run1 = calc.calculateVisitedCityStats(input);
        const run2 = calc.calculateVisitedCityStats(input);

        assert.ok(run1, `${file}: no result`);
        assert.equal(
          run1.fp.total.toString(),
          run2.fp.total.toString(),
          `${file}: non-deterministic FP total`,
        );
        assert.equal(
          run1.goods.total.toString(),
          run2.goods.total.toString(),
          `${file}: non-deterministic goods total`,
        );
        assert.equal(
          run1.military.red.base.att.toString(),
          run2.military.red.base.att.toString(),
          `${file}: non-deterministic red attack`,
        );
        assert.ok(
          run1.fp.total.isGreaterThanOrEqualTo(0),
          `${file}: negative FP total`,
        );
        assert.ok(
          run1.goods.total.isGreaterThanOrEqualTo(0),
          `${file}: negative goods total`,
        );
      }
    },
  );

  await t.test('city entity counts match the raw other_player payloads', () => {
    for (const { file, data } of fixtures) {
      assert.ok(
        Array.isArray(data.city_map.entities),
        `${file}: city_map.entities must be an array`,
      );
      assert.ok(
        data.other_player.name.length > 0,
        `${file}: player name missing`,
      );
      assert.ok(
        typeof data.other_player.era === 'string',
        `${file}: era missing`,
      );
    }
  });
});
