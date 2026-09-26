#!/usr/bin/env node
// .mjs per scripts convention.
/**
 * run-tests.mjs — Node-side test discovery for `npm test`.
 *
 * A `tests/**` glob in `"test"` of package.json gets expanded by
 * the POSIX shell — NOT by Node — where `**` behaves like `*`, so
 * `tests/<area>/<name>.test.mjs` matched but a future deeper
 * `tests/a/b/c.test.mjs` would be silently skipped. Recursion must live
 * in-process, so we resolve the file list here and hand explicit paths to
 * `node --test`.
 */
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function collectTestFiles(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTestFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.test.mjs')) {
      out.push(full);
    }
  }
  return out;
}

let files = [];
try {
  files = collectTestFiles(join(ROOT, 'tests'), files);
} catch {
  // No tests directory yet.
}

if (files.length === 0) {
  console.error('Error: no *.test.mjs files found under tests/');
  process.exit(1);
}

// Pass ORIGINAL --arg values through that are not our discovery concerns.
const passthrough = process.argv.slice(2);
const reporterArgs = ['--test', ...passthrough, ...files];

console.log(
  `${files.length} test file(s) discovered:`,
  files.map((f) => relative(ROOT, f)).join(', '),
);

const { status } = require('node:child_process').spawnSync(
  process.execPath,
  reporterArgs,
  { stdio: 'inherit' },
);
process.exitCode = status ?? 1;
