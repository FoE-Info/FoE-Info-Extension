#!/usr/bin/env node
/** Recursively discover extension tests, including nested directories. */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
function collect(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return (
      entry.isDirectory() ? collect(path)
      : entry.isFile() && entry.name.endsWith('.test.mjs') ? [path]
      : []
    );
  });
}
const files = collect(join(root, 'tests')).sort();
if (!files.length) throw new Error('No extension tests found under tests/.');
console.log(`${files.length} test files discovered.`);
const result = spawnSync(
  process.execPath,
  [
    '--test',
    ...process.argv.slice(2),
    ...files.map((path) => relative(root, path)),
  ],
  { cwd: root, stdio: 'inherit' },
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
