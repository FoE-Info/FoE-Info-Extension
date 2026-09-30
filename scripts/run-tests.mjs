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
import { mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Application and harness tests are shared repository sources. Both roots
// participate in the same gate in the working tree and isolated exports.
const TEST_ROOTS = ['tests', '.agents/tests'];

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

/**
 * Build the argument list for `node --test`.
 *
 * When `env.CI_TEST_EVIDENCE_DIR` is set, the runner emits a JUnit XML
 * report in addition to console output. Evidence mode owns the reporter
 * configuration: caller-supplied `--test-reporter` / `--test-reporter-destination`
 * flags are stripped and replaced by a fixed spec->stdout + junit->file pair.
 * This guarantees valid reporter/destination counts regardless of how the
 * caller invoked the runner.
 *
 * @param {string[]} passthrough – argv after the script name
 * @param {NodeJS.ProcessEnv} env – process environment
 * @param {string} root – repository root used to resolve evidence paths
 * @returns {{ reporterArgs: string[], files: string[] }}
 */
function buildTestArgs(passthrough, env, root) {
  let files = [];
  for (const testRoot of TEST_ROOTS) {
    try {
      files = collectTestFiles(join(root, testRoot), files);
    } catch (error) {
      // A test root may be absent in a focused fixture; other read failures
      // must fail discovery rather than silently dropping a test suite.
      if (error.code !== 'ENOENT') throw error;
    }
  }

  if (files.length === 0) {
    throw new Error(`Error: no *.test.mjs files found under ${TEST_ROOTS[0]}/`);
  }

  const evidenceDir = env.CI_TEST_EVIDENCE_DIR;
  let evidencePassthrough = passthrough;
  const extraArgs = [];

  if (evidenceDir) {
    const evidenceFile = resolve(root, evidenceDir, 'junit.xml');
    mkdirSync(dirname(evidenceFile), { recursive: true });

    // Evidence mode owns the reporter configuration so that console output
    // and JUnit output are always paired correctly. Drop any caller-supplied
    // --test-reporter or --test-reporter-destination flags (both `--flag=value`
    // and `--flag value` forms) and emit a fixed spec->stdout + junit->file
    // pair. This keeps `npm run test:verbose`/`test:watch` usable locally when
    // the env var is unset, and guarantees valid reporter/destination counts
    // when the env var is set.
    const reporterFlags = new Set([
      '--test-reporter',
      '--test-reporter-destination',
    ]);
    const filtered = [];
    for (let i = 0; i < evidencePassthrough.length; i++) {
      const arg = evidencePassthrough[i];
      if (reporterFlags.has(arg)) {
        i++; // skip the value that follows the flag
        continue;
      }
      if (
        arg.startsWith('--test-reporter=') ||
        arg.startsWith('--test-reporter-destination=')
      ) {
        continue;
      }
      filtered.push(arg);
    }
    evidencePassthrough = filtered;

    extraArgs.push(
      '--test-reporter=spec',
      '--test-reporter-destination=stdout',
      '--test-reporter=junit',
      `--test-reporter-destination=${evidenceFile}`,
    );
  }

  const reporterArgs = [
    '--test',
    ...evidencePassthrough,
    ...extraArgs,
    ...files,
  ];

  return { reporterArgs, files };
}

function main() {
  const passthrough = process.argv.slice(2);
  let reporterArgs;
  let files;
  try {
    ({ reporterArgs, files } = buildTestArgs(passthrough, process.env, ROOT));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

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
}

main();
