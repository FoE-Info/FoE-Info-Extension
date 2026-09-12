import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '../../src/js');

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

test('no module exists as both .js and .ts under src/js', async () => {
  const bases = new Map();
  const files = await walk(ROOT);
  assert.ok(
    files.length > 0,
    'expected to walk at least one file under src/js',
  );
  for (const file of files) {
    const ext = path.extname(file);
    if (ext !== '.js' && ext !== '.ts') continue;
    const base = file.slice(0, -ext.length);
    if (!bases.has(base)) bases.set(base, new Set());
    bases.get(base).add(ext);
  }
  const twins = [...bases.entries()]
    .filter(([, exts]) => exts.has('.js') && exts.has('.ts'))
    .map(([base]) => path.relative(ROOT, base))
    .sort();
  assert.deepEqual(twins, [], `duplicate .js/.ts modules: ${twins.join(', ')}`);
});
