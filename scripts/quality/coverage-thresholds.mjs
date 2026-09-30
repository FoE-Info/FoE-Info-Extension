#!/usr/bin/env node
/**
 * coverage-thresholds.mjs — Per-module coverage gates for representative
 * source files.
 *
 * Design rationale
 * ────────────────
 * A full-tree percentage masks losses in security and calculation modules.
 * This gate uses a focused passing test slice and checks source files with
 * observed coverage, not an artificial aggregate. Values beside each
 * module are from Node 24's coverage table on this same test slice.
 *
 * Usage: node scripts/quality/coverage-thresholds.mjs
 * Node 26.8.2+ required. Exit 0 on passing gates, 1 on test/coverage regression,
 * 2 when the test runner cannot produce a coverage report.
 * This command does not build.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// ── Module thresholds ──────────────────────────────────────────────
// Keys are paths relative to src/js/. Measured using the selected tests.
const MODULES = {
  // Security-critical — must not regress
  // Measured: lines 100.0, branches  95.0, functions 100.0
  'utils/escape.js': { lines: 95, branches: 90, functions: 95 },
  // Measured: lines  99.5, branches  95.7, functions 100.0
  'utils/intakePolicy.js': { lines: 90, branches: 90, functions: 90 },
  // Measured: lines  98.8, branches  95.5, functions 100.0
  'utils/destinationValidator.js': { lines: 85, branches: 85, functions: 90 },

  // Business logic — well-tested, defend existing coverage
  // Measured: lines  91.3, branches  92.1, functions  83.3
  'utils/formatters.js': { lines: 80, branches: 80, functions: 75 },
  // Measured: lines 94.6, branches 72.5, functions 93.8
  'utils/date.js': { lines: 80, branches: 65, functions: 80 },

  // Calc layer — representative core business logic
  // Measured: lines 91.3, branches 77.8, functions 100.0
  'calc/goods/GoodsCalculator.js': { lines: 80, branches: 65, functions: 80 },
  // Measured: lines 100.0, branches 79.3, functions 100.0
  'calc/GreatBuildingCalculator.js': { lines: 85, branches: 65, functions: 85 },
  // Measured: lines 95.0, branches 62.0, functions 90.9
  'calc/BlueGalaxyCalculator.js': { lines: 80, branches: 50, functions: 75 },
  // Protocol — message handling. Measured: 93.0 / 85.4 / 81.8.
  'protocol/devtoolsBridge.js': { lines: 80, branches: 70, functions: 70 },
};

// The normal test runner owns full-suite discovery. This is a stable,
// focused slice of tests exercising the modules above.
const TESTS = [
  'tests/security/escaping.test.mjs',
  'tests/security/network-intake.test.mjs',
  'tests/security/destination-validation.test.mjs',
  'tests/utils/formatters.test.mjs',
  'tests/utils/date.test.mjs',
  'tests/calc/great-building-calculator.test.mjs',
  'tests/calc/blue-galaxy-calculator.test.mjs',
  'tests/calc/modular-calculators.test.mjs',
  'tests/protocol/devtools-bridge.test.mjs',
];
for (const file of TESTS) {
  if (!existsSync(join(ROOT, file))) {
    console.error(`Missing coverage test: ${file}`);
    process.exit(2);
  }
}
console.log(`Measuring ${TESTS.length} focused test files…`);

const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--experimental-test-coverage',
    '--test-coverage-include=src/js/**',
    ...TESTS,
  ],
  {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
    maxBuffer: 16 * 1024 * 1024,
  },
);

if (result.error) {
  console.error('ERROR: failed to run tests:', result.error.message);
  process.exit(2);
}

const output = Buffer.concat([
  result.stdout || Buffer.alloc(0),
  result.stderr || Buffer.alloc(0),
]).toString();
if (result.status !== 0) {
  console.error('Coverage test slice failed:');
  console.error(output.slice(-6000));
  process.exit(1);
}
if (!output.includes('end of coverage report')) {
  console.error('Node did not produce a coverage report.');
  process.exit(2);
}

// Node prints an indented hierarchy:
// ℹ src | ... ; ℹ  js | ... ; ℹ   utils | ... ; ℹ    escape.js | 100.00 ...
// Each leading space after the marker denotes one level.

const lines = output.split('\n');
const coverageData = new Map();
const pathStack = [];

for (const line of lines) {
  // Coverage lines start with ℹ (U+2139, "Information Source")
  if (!line.startsWith('ℹ ')) continue;
  if (line.startsWith('ℹ all files')) continue;
  if (line.startsWith('ℹ file ')) continue;

  // Drop the Unicode marker and the following space (two JS characters).
  const content = line.slice(2);

  // Count leading spaces to determine depth
  const trimmed = content.replace(/^ +/, '');
  const depth = content.length - trimmed.length;

  // Parse pipe-delimited fields
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|').map((p) => p.trim());
    const name = parts[0];

    if (!name || parts.length < 4) continue;

    // Empty coverage columns = directory node
    if (!parts[1]) {
      pathStack.length = depth;
      pathStack[depth] = name;
    } else {
      // File: reconstruct full path from stack
      pathStack.length = depth;
      const fullPath = [...pathStack.slice(0, depth), name].join('/');
      const linesPct = parseFloat(parts[1]);
      const branchesPct = parseFloat(parts[2]) || 0;
      const functionsPct = parseFloat(parts[3]) || 0;

      coverageData.set(fullPath, {
        lines: linesPct,
        branches: branchesPct,
        functions: functionsPct,
      });
    }
  }
}

// ── Check thresholds ───────────────────────────────────────────────

const failures = [];
const results = [];

for (const [module, thresholds] of Object.entries(MODULES)) {
  const data = coverageData.get(`src/js/${module}`);

  if (!data) {
    failures.push(`${module}: no coverage data (not exercised by any test)`);
    results.push({ module, status: 'missing', data: null, thresholds });
    continue;
  }

  const moduleFailures = [];

  if (thresholds.lines != null && data.lines < thresholds.lines) {
    moduleFailures.push(
      `lines ${data.lines.toFixed(1)}% < ${thresholds.lines}%`,
    );
  }
  if (thresholds.branches != null && data.branches < thresholds.branches) {
    moduleFailures.push(
      `branches ${data.branches.toFixed(1)}% < ${thresholds.branches}%`,
    );
  }
  if (thresholds.functions != null && data.functions < thresholds.functions) {
    moduleFailures.push(
      `functions ${data.functions.toFixed(1)}% < ${thresholds.functions}%`,
    );
  }

  const status = moduleFailures.length === 0 ? 'ok' : 'fail';
  if (moduleFailures.length > 0) {
    failures.push(`${module}: ${moduleFailures.join(', ')}`);
  }
  results.push({ module, status, data, thresholds });
}

// ── Report ─────────────────────────────────────────────────────────

console.log('=== Coverage Threshold Report ===\n');
console.log(
  'Module'.padEnd(42) +
    'Lines'.padStart(8) +
    'Brch'.padStart(8) +
    'Func'.padStart(8) +
    '  Status',
);
console.log('─'.repeat(76));

for (const r of results) {
  const d = r.data;
  const lines = d ? `${d.lines.toFixed(1)}%` : '—';
  const brch = d ? `${d.branches.toFixed(1)}%` : '—';
  const func = d ? `${d.functions.toFixed(1)}%` : '—';
  const icon =
    r.status === 'ok' ? '✓'
    : r.status === 'missing' ? '⚠'
    : '✗';
  console.log(
    `${r.module.padEnd(42)}` +
      `${lines.padStart(8)}` +
      `${brch.padStart(8)}` +
      `${func.padStart(8)}` +
      `  ${icon} ${r.status}`,
  );
}

// ── Exit ───────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error('\n✗ Coverage threshold violations:\n');
  for (const f of failures) {
    console.error(`  • ${f}`);
  }
  console.error(
    '\nAdd tests for the failing modules or review any intentional threshold change.',
  );
  process.exit(1);
} else {
  console.log('\n✓ All representative modules within coverage thresholds.');
}
