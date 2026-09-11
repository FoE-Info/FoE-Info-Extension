import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/visits');

test('VisitedCityStatsCalculator Suite', async (t) => {
  const { VisitedCityStatsCalculator, visitedCityStatsCalculator } =
    await import('../../src/js/fn/VisitedCityStatsCalculator.js');

  await t.test('instantiation and exports', () => {
    assert.ok(VisitedCityStatsCalculator);
    assert.ok(visitedCityStatsCalculator instanceof VisitedCityStatsCalculator);
  });

  await t.test('defensive defaults with empty or invalid input', () => {
    const calc = new VisitedCityStatsCalculator();
    const emptyStats = calc.calculateVisitedCityStats();

    assert.ok(emptyStats);
    assert.equal(emptyStats.fp.total.toNumber(), 0);
    assert.equal(emptyStats.fp.boostPercent.toNumber(), 0);
    assert.equal(emptyStats.goods.total.toNumber(), 0);
    assert.equal(emptyStats.goods.treasury.toNumber(), 0);
    assert.equal(emptyStats.units.total.toNumber(), 0);
    assert.equal(emptyStats.military.red.base.att.toNumber(), 0);
    assert.equal(emptyStats.military.blue.base.def.toNumber(), 0);
    assert.equal(emptyStats.special.arcPercent.toNumber(), 0);
    assert.equal(emptyStats.special.goodsPerQuest.toNumber(), 5);
  });

  await t.test(
    'idempotence: identical output on consecutive runs (no accumulator leakage)',
    () => {
      const fixturePath = path.join(FIXTURES_DIR, 'hood_1_Crispy_Frisbee.json');
      if (!fs.existsSync(fixturePath)) {
        t.skip('Fixture hood_1_Crispy_Frisbee.json not found');
        return;
      }

      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const entities = fixture.payload.city_map.entities;
      const playerEra = fixture.payload.other_player.era;

      const calc = new VisitedCityStatsCalculator();
      const run1 = calc.calculateVisitedCityStats({ entities, playerEra });
      const run2 = calc.calculateVisitedCityStats({ entities, playerEra });

      // Assert absolute equality of numeric totals (preventing the 2x doubling bug)
      assert.equal(run1.fp.total.toString(), run2.fp.total.toString());
      assert.equal(run1.goods.total.toString(), run2.goods.total.toString());
      assert.equal(
        run1.goods.treasury.toString(),
        run2.goods.treasury.toString(),
      );
      assert.equal(run1.units.total.toString(), run2.units.total.toString());
      assert.equal(run1.units.traz.toString(), run2.units.traz.toString());
      assert.equal(
        run1.military.red.base.att.toString(),
        run2.military.red.base.att.toString(),
      );
      assert.equal(
        run1.military.blue.base.def.toString(),
        run2.military.blue.base.def.toString(),
      );
      assert.equal(
        run1.special.arcPercent.toString(),
        run2.special.arcPercent.toString(),
      );
    },
  );

  await t.test(
    'sequential visits across multiple players (cross-player isolation)',
    () => {
      const summaryPath = path.join(FIXTURES_DIR, '_summary.json');
      if (!fs.existsSync(summaryPath)) {
        t.skip('Visits summary not found');
        return;
      }

      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      const calc = new VisitedCityStatsCalculator();

      const results = [];
      // Visit first 5 players
      const sample = summary.slice(0, 5);
      for (const item of sample) {
        const pPath = path.join(FIXTURES_DIR, item.filename);
        const data = JSON.parse(fs.readFileSync(pPath, 'utf8'));
        const stats = calc.calculateVisitedCityStats({
          entities: data.payload.city_map.entities,
          playerEra: data.payload.other_player.era,
        });
        results.push({ item, stats });
      }

      // Re-visit player 0 and assert exact parity with previous result
      const firstPPath = path.join(FIXTURES_DIR, sample[0].filename);
      const firstData = JSON.parse(fs.readFileSync(firstPPath, 'utf8'));
      const reVisitStats = calc.calculateVisitedCityStats({
        entities: firstData.payload.city_map.entities,
        playerEra: firstData.payload.other_player.era,
      });

      assert.equal(
        results[0].stats.fp.total.toString(),
        reVisitStats.fp.total.toString(),
        'Revisiting player 0 must not compound FP',
      );
      assert.equal(
        results[0].stats.goods.total.toString(),
        reVisitStats.goods.total.toString(),
        'Revisiting player 0 must not compound Goods',
      );
      assert.equal(
        results[0].stats.military.red.base.att.toString(),
        reVisitStats.military.red.base.att.toString(),
        'Revisiting player 0 must not compound Military Boosts',
      );
    },
  );

  await t.test(
    'renders with renderCityStats without error or missing keys',
    async () => {
      const { renderCityStats } =
        await import('../../src/js/fn/renderCityStats.js');
      const fixturePath = path.join(FIXTURES_DIR, 'hood_1_Crispy_Frisbee.json');
      if (!fs.existsSync(fixturePath)) return;

      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const calc = new VisitedCityStatsCalculator();
      const stats = calc.calculateVisitedCityStats({
        entities: fixture.payload.city_map.entities,
        playerEra: fixture.payload.other_player.era,
      });

      const html = renderCityStats('#visit', stats, {
        isOwnCity: false,
        name: fixture.payload.other_player.name,
        era: fixture.payload.other_player.era,
        score: fixture.payload.other_player.score,
      });

      assert.ok(html.includes('id="visit-panel"'));
      assert.ok(html.includes(fixture.payload.other_player.name));
      assert.ok(html.includes('data-i18n="attackers"'));
      assert.ok(html.includes('data-i18n="defenders"'));
    },
  );
});
