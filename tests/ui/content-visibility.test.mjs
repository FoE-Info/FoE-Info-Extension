import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('Modern-Web Content-Visibility Suite', async (t) => {
  const scssPath = path.resolve(
    import.meta.dirname,
    '../../src/css/custom.scss',
  );
  const scssContent = readFileSync(scssPath, 'utf8');

  await t.test(
    'custom.scss declares content-visibility: auto for dense table rows',
    () => {
      assert.ok(
        scssContent.includes('content-visibility: auto;'),
        'custom.scss must declare content-visibility: auto;',
      );
      assert.ok(
        scssContent.includes('contain-intrinsic-size: auto 28px;'),
        'custom.scss must declare contain-intrinsic-size: auto 28px;',
      );
    },
  );

  await t.test(
    'content-visibility targets table rows and avoids card body containers',
    () => {
      assert.ok(
        scssContent.includes('.goods-table tbody tr'),
        'content-visibility must target .goods-table tbody tr',
      );
      assert.ok(
        scssContent.includes('.gbg-table tbody tr'),
        'content-visibility must target .gbg-table tbody tr',
      );
      assert.ok(
        scssContent.includes('#friendsText2 tbody tr'),
        'content-visibility must target #friendsText2 tbody tr',
      );

      // Verify it is NOT applied to resizable containers or collapse elements
      assert.ok(
        !scssContent.includes('.resize {\n  content-visibility'),
        'content-visibility must not be declared directly on .resize',
      );
      assert.ok(
        !scssContent.includes('.foe-resizable {\n  content-visibility'),
        'content-visibility must not be declared directly on .foe-resizable',
      );
    },
  );
});
