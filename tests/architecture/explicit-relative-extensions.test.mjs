import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '../../src/js');
const REL_IMPORT = /(?:require\(|from\s+)['"]\s*(\.\.?\/[^'"]+)['"]/g;
const VALID_EXT = /\.(js|ts|json|mjs|scss|css)$/;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

test('internal relative imports use explicit extensions', async () => {
  const violations = [];
  let scanned = 0;
  let matched = 0;
  for (const file of await walk(ROOT)) {
    if (!file.endsWith('.js') && !file.endsWith('.ts')) continue;
    scanned += 1;
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(REL_IMPORT)) {
      matched += 1;
      if (!VALID_EXT.test(match[1])) {
        violations.push(`${path.relative(ROOT, file)} -> ${match[1]}`);
      }
    }
  }
  assert.ok(scanned > 0, 'expected to scan at least one .js/.ts file');
  assert.ok(matched > 0, 'expected to match at least one relative specifier');
  assert.deepEqual(violations, [], violations.join('\n'));
});
