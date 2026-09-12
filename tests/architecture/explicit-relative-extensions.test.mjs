import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '../../src/js');
const REL_IMPORT = /(?:require\(|from\s+)['"]\s*(\.\.?\/[^'"]+)['"]/g;
const VALID_EXT = /\.(js|json|mjs|scss|css)$/;

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
  for (const file of await walk(ROOT)) {
    if (!file.endsWith('.js')) continue;
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(REL_IMPORT)) {
      if (!VALID_EXT.test(match[1])) {
        violations.push(`${path.relative(ROOT, file)} -> ${match[1]}`);
      }
    }
  }
  assert.deepEqual(violations, [], violations.join('\n'));
});
