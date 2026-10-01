import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'acorn';

const ROOT = path.resolve(import.meta.dirname, '../../');

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return (
      entry.isDirectory() ? sourceFiles(file)
      : /\.(?:js|mjs|cjs)$/.test(file) ? [file]
      : []
    );
  });
}

test('source syntax matches native Node module classification', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(
    pkg.type,
    'commonjs',
    'update this migration guard when switching the package default',
  );
  const failures = [];
  for (const file of sourceFiles(path.join(ROOT, 'src'))) {
    try {
      parse(readFileSync(file, 'utf8'), {
        ecmaVersion: 'latest',
        sourceType: file.endsWith('.mjs') ? 'module' : 'script',
      });
    } catch (error) {
      failures.push(`${path.relative(ROOT, file)}: ${error.message}`);
    }
  }
  assert.deepEqual(
    failures,
    [],
    'ESM source must use .mjs while the package is CommonJS',
  );
});
