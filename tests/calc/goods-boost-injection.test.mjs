/**
 * Pins the calc -> state dependency removal.
 *
 * The goods formatters used to default `boostValue` to `City?.goodsProductionBoost`
 * through a `../state/` import, and both stats calculators captured
 * `../state/MetadataStore.js` at module load to use as a fallback default. That
 * inverted the layer direction: the calculators defaulted to a live store, so a
 * missing injection produced quietly wrong totals instead of an error.
 *
 * These are the two things that must stay true. A structural "no state/ imports"
 * check alone is not sufficient evidence — it passes even while the runtime
 * behaviour is wrong — so the boost is asserted to actually apply, and the
 * missing-store case is asserted to fail loudly.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { CityStatsCalculator } from '../../src/js/calc/CityStatsCalculator.js';
import {
  fGoodsHTML,
  fGoodsText,
} from '../../src/js/calc/goodsTooltipFormatter.js';
import { VisitedCityStatsCalculator } from '../../src/js/calc/VisitedCityStatsCalculator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CALC_DIR = path.resolve(__dirname, '../../src/js/calc');

test('calc/ never imports the state layer', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.js')) continue;
      const source = fs.readFileSync(full, 'utf8');
      if (/require\(\s*['"][^'"]*\/state\//.test(source)) {
        offenders.push(path.relative(CALC_DIR, full));
      }
    }
  };
  walk(CALC_DIR);

  assert.deepEqual(
    offenders,
    [],
    `calc/ must not import state/ (docs/architecture.md layer rule): ${offenders.join(', ')}`,
  );
});

test('a boost passed to fGoodsText is applied, not dropped', () => {
  const goods = { BronzeAge: '100 Iron<br>' };

  assert.equal(fGoodsText('ba', goods, 100), '200 Iron<br>');
  // No boost means the raw value is returned untouched.
  assert.equal(fGoodsText('ba', goods, 0), '100 Iron<br>');
});

test('a boost passed to fGoodsHTML scales the rendered amount', () => {
  const goods = { BronzeAge: '100 Iron<br>' };
  const currentGoods = { ba: 100 };

  const boosted = fGoodsHTML('ba', goods, currentGoods, 100);
  assert.match(boosted, />BA:200</, 'boosted amount should render as 200');
  assert.match(boosted, /200 Iron/);

  const unboosted = fGoodsHTML('ba', goods, currentGoods, 0);
  assert.match(unboosted, />BA:100</, 'unboosted amount should render as 100');
});

test('an omitted boost is a visible no-op rather than a hidden default', () => {
  // The parameter no longer reads from state. Omitting it must not resurrect a
  // live-store value, and must not produce NaN.
  const goods = { BronzeAge: '100 Iron<br>' };
  const text = fGoodsText('ba', goods, undefined);
  assert.equal(text, '100 Iron<br>');
  assert.doesNotMatch(text, /NaN/);

  const html = fGoodsHTML('ba', goods, { ba: 100 }, undefined);
  assert.doesNotMatch(html, /NaN/);
});

test('calculators fail loudly when entities arrive without a store', () => {
  // This is the regression the refactor is for: before injection was required,
  // these defaulted to a live store and returned plausible but wrong totals.
  const entity = [{ id: 1, cityentity_id: 'building_fp' }];

  assert.throws(
    () =>
      new VisitedCityStatsCalculator().calculateVisitedCityStats({
        entities: entity,
      }),
    /metadataStore is required/,
  );

  assert.throws(
    () =>
      new CityStatsCalculator().calculateCityStats({
        entities: entity,
      }),
    /metadataStore is required/,
  );
});

test('calculators still serve an empty entity list without a store', () => {
  // No entities means no classification happens, so no store is needed. This
  // guards against over-correcting the invariant into an unconditional throw.
  const visited = new VisitedCityStatsCalculator().calculateVisitedCityStats();
  assert.equal(visited.fp.total.toNumber(), 0);

  const city = new CityStatsCalculator().calculateCityStats();
  assert.ok(city);
});
