import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const FONT_DIR = path.join(root, 'src', 'fonts');
const FONT = path.join(FONT_DIR, 'MaterialSymbolsOutlined-Regular.woff2');
const MANIFEST = path.join(FONT_DIR, 'icons-subset.json');
const CLASS = 'material-symbols-outlined';

function jsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsFiles(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

/** Mirrors findIconNames() in scripts/subset-icons-font.mjs. */
function usedIconNames() {
  const names = new Set();
  const re = new RegExp(`${CLASS}[\\s\\S]{0,600}?>([a-z0-9_]+)<`, 'g');
  for (const file of jsFiles(path.join(root, 'src', 'js'))) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(re)) names.add(m[1]);
  }
  return [...names].sort();
}

test('every Material Symbols icon in the source is in the shipped subset', () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const used = usedIconNames();

  assert.ok(
    used.length > 0,
    'the scanner must find the icons, or this test is vacuous',
  );

  const missing = used.filter((n) => !manifest.icons.includes(n));
  assert.deepEqual(
    missing,
    [],
    `icons used in src but absent from the subset: ${missing.join(', ')}. ` +
      'Run npm run fonts:subset and commit the result.',
  );

  const stale = manifest.icons.filter((n) => !used.includes(n));
  assert.deepEqual(
    stale,
    [],
    `subset holds icons no longer used: ${stale.join(', ')}. Re-run npm run fonts:subset.`,
  );
});

test('the shipped symbols font stays small enough to be a subset', () => {
  // The full Material Symbols variable font is 3,969,688 bytes and was 70% of
  // the packaged extension. This is a budget, not a formatting rule: it fails
  // if a full font is swapped back in, or if subsetting regresses to no-op.
  const bytes = fs.statSync(FONT).size;
  assert.ok(
    bytes < 200_000,
    `MaterialSymbolsOutlined-Regular.woff2 is ${bytes.toLocaleString()} bytes; ` +
      'expected a subset well under 200 KB. Run npm run fonts:subset.',
  );
});
