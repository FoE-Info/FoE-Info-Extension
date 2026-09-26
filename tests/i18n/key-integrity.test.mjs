/**
 * Every data-i18n* key referenced in source must exist in the canonical
 * dictionary.
 *
 * Why this exists: `t()` resolves `currentDict[key] ?? enDict[key] ?? key`
 * (src/js/utils/i18n.js), so a missing key is NOT a no-op — it renders the raw
 * key to the user. Seven such keys shipped in the Treasury Logs panel
 * (treasury_logs, entries, goods_donated, medals_donated, medals_spent,
 * action) and the GB donors card (contributors), so every user of every
 * language saw raw snake_case in those headers.
 *
 * `npm run i18n:check` cannot catch this: it compares dictionaries to each
 * other, so a key that is missing everywhere is perfectly "in parity" while
 * being referenced and broken. This test closes that gap by checking usage
 * against the dictionary.
 *
 * Dynamic keys are interpolated at runtime (e.g. data-i18n="${titleKey}"), so
 * they cannot be checked statically and are excluded by requiring the captured
 * value to be a plain identifier.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const SCAN_DIRS = [path.join(ROOT, 'src/js'), path.join(ROOT, 'src/chrome')];
const CANONICAL = path.join(ROOT, 'src/i18n/en.json');

const IDENTIFIER = /^[a-z0-9_]+$/;

function collectSourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.(js|mjs|html)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function collectUsedKeys() {
  const used = new Map();
  for (const file of SCAN_DIRS.flatMap((d) => collectSourceFiles(d))) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/data-i18n(?:-[a-z]+)?="([^"]*)"/g)) {
      const key = m[1];
      if (!IDENTIFIER.test(key)) continue; // dynamic or empty
      if (!used.has(key)) used.set(key, new Set());
      used.get(key).add(path.relative(ROOT, file));
    }
  }
  return used;
}

describe('i18n key integrity', () => {
  it('every data-i18n key referenced in source exists in en.json', () => {
    const dict = JSON.parse(fs.readFileSync(CANONICAL, 'utf8'));
    const used = collectUsedKeys();
    assert.ok(used.size > 50, `expected a real scan, found ${used.size} keys`);

    const dangling = [...used.entries()]
      .filter(([key]) => !(key in dict))
      .map(([key, files]) => `  ${key}  <- ${[...files].join(', ')}`);

    assert.equal(
      dangling.length,
      0,
      `data-i18n keys referenced but absent from en.json. t() falls back to the ` +
        `key itself, so these render raw snake_case to the user:\n${dangling.join('\n')}`,
    );
  });
});
