import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT_DIR = process.cwd();

test('DevTools Teardown & Entity Flush Invariants', async (t) => {
  const indexSource = fs.readFileSync(
    path.join(ROOT_DIR, 'src/js/index.js'),
    'utf8',
  );
  const devtoolsSource = fs.readFileSync(
    path.join(ROOT_DIR, 'src/js/devtools.js'),
    'utf8',
  );

  await t.test(
    'src/js/index.js does not save massive metadata definitions (AllyDefs, BuildingEntityLookup) in flushCityEntityDefs',
    () => {
      // Find the body of flushCityEntityDefs
      const match = indexSource.match(
        /export\s+function\s+flushCityEntityDefs\s*\(\)\s*\{([\s\S]*?)\n\}/,
      );
      assert.ok(match, 'flushCityEntityDefs function must exist');
      const body = match[1];

      assert.doesNotMatch(
        body,
        /storage\.set\(\s*['"]AllyDefs['"]/,
        'flushCityEntityDefs must not serialize AllyDefs (28MB payload)',
      );
      assert.doesNotMatch(
        body,
        /storage\.set\(\s*['"]BuildingEntityLookup['"]/,
        'flushCityEntityDefs must not serialize BuildingEntityLookup',
      );
      assert.doesNotMatch(
        body,
        /storage\.set\(\s*['"]MetaIds['"]/,
        'flushCityEntityDefs must not serialize MetaIds',
      );
      assert.doesNotMatch(
        body,
        /storage\.set\(\s*['"]ResearchDefs['"]/,
        'flushCityEntityDefs must not serialize ResearchDefs',
      );
      assert.doesNotMatch(
        body,
        /storage\.set\(\s*['"]MilitaryDefs['"]/,
        'flushCityEntityDefs must not serialize MilitaryDefs',
      );
    },
  );

  await t.test(
    'src/js/index.js guards flushCityEntityDefs with dirty state check',
    () => {
      const match = indexSource.match(
        /export\s+function\s+flushCityEntityDefs\s*\(\)\s*\{([\s\S]*?)\n\}/,
      );
      assert.ok(match, 'flushCityEntityDefs function must exist');
      const body = match[1];

      assert.match(
        body,
        /if\s*\(\s*!cityEntityDefsDirty\s*\)\s*return/,
        'flushCityEntityDefs must return early when not dirty',
      );
    },
  );

  await t.test(
    'src/js/index.js guards beforeunload to skip flush when clean',
    () => {
      assert.match(
        indexSource,
        /window\.addEventListener\(\s*['"]beforeunload['"][\s\S]*?cityEntityDefsDirty/,
        'beforeunload must check dirty flag before calling flushCityEntityDefs',
      );
    },
  );

  await t.test(
    'src/js/devtools.js unlinks panelWindow on panel.onHidden and unload',
    () => {
      assert.match(
        devtoolsSource,
        /panel\.onHidden\.addListener\(\s*\(\)\s*=>\s*\{[\s\S]*?panelWindow\s*=\s*null/,
        'devtools.js must listen to panel.onHidden to dereference panelWindow',
      );
      assert.match(
        devtoolsSource,
        /window\.addEventListener\(\s*['"]unload['"][\s\S]*?panelWindow\s*=\s*null/,
        'devtools.js must clean up on window unload',
      );
    },
  );
});
