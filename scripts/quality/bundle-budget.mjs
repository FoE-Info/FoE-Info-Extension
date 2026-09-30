#!/usr/bin/env node
/**
 * bundle-budget.mjs — Measure production build artifact sizes against
 * recorded baselines and fail on meaningful regression.
 *
 * Does not build. Reads build/FoE-Info-Prod/ (or --dir PATH) after a
 * production build. Source maps are not shipped and are excluded.
 * The baselines below are observed uncompressed bytes in the available
 * production artifact; they must be reviewed when intentional output
 * changes. Asset-level and aggregate budgets catch distinct regressions.
 *
 * Baseline composition: JS ~784 kB, CSS ~463 kB, fonts ~166 kB,
 * icons/images ~186 kB, i18n ~82 kB, HTML ~17 kB, other ~2 kB.
 * app.js is the largest JS asset (677 kB); app.css and options.css
 * together account for 463 kB. Both SCSS entrypoints import Bootstrap.
 *
 * Usage: node scripts/quality/bundle-budget.mjs [--report] [--dir PATH]
 * Exit 0 on passing budgets, 1 on regression, 2 on missing build.
 */
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dirArg = process.argv.indexOf('--dir');
if (dirArg !== -1 && !process.argv[dirArg + 1]) {
  console.error('Usage: bundle-budget.mjs [--report] [--dir PATH]');
  process.exit(2);
}
const BUILD_DIR =
  dirArg === -1 ?
    join(ROOT, 'build', 'FoE-Info-Prod')
  : resolve(process.argv[dirArg + 1]);

// ── Baseline table ────────────────────────────────────────────────
// Keys are build-relative paths.  `baseline` is the byte count to
// defend; `tolerance` is the fraction above baseline that triggers
// failure (0.10 = allow up to 10% growth).
const BASELINES = {
  'app.js': { baseline: 676_678, tolerance: 0.1 },
  'app.css': { baseline: 239_433, tolerance: 0.1 },
  'options.js': { baseline: 37_453, tolerance: 0.15 },
  'options.css': { baseline: 223_578, tolerance: 0.1 },
  'devtools.js': { baseline: 30_649, tolerance: 0.15 },
  'contentBridge.js': { baseline: 25_479, tolerance: 0.15 },
  'popup.js': { baseline: 10_284, tolerance: 0.2 },
  'langBootstrap.js': { baseline: 164, tolerance: 0.2 },
  'xhrInterceptor.js': { baseline: 3_466, tolerance: 0.2 },
};

// Aggregate budgets (byte counts).  These catch wholesale regressions
// even when individual asset tolerances are generous.
const AGGREGATE = {
  'All JS (excl. maps)': { budget: 820_000, tolerance: 0.1 },
  'All CSS (excl. maps)': { budget: 490_000, tolerance: 0.08 },
  'Fonts (woff2)': { budget: 180_000, tolerance: 0.1 },
  'Total (excl. maps)': { budget: 1_800_000, tolerance: 0.06 },
};

// ── Helpers ────────────────────────────────────────────────────────

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      entries.push(...walk(full));
    } else {
      entries.push({ path: relative(BUILD_DIR, full), size: st.size });
    }
  }
  return entries;
}

function fmt(bytes) {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
}

function pctDiff(current, baseline) {
  return (((current - baseline) / baseline) * 100).toFixed(1);
}

// ── Collect artifacts ──────────────────────────────────────────────

let artifacts;
try {
  artifacts = walk(BUILD_DIR);
} catch {
  console.error(
    `ERROR: build directory not found at ${relative(ROOT, BUILD_DIR)}\n` +
      'Run `npm run build:prod` first, or ensure the prod build exists.',
  );
  process.exit(2);
}

// ── Per-asset budget check ────────────────────────────────────────

const report = [];
const failures = [];

const assetMap = new Map(artifacts.map((a) => [a.path, a.size]));

for (const [path, { baseline, tolerance }] of Object.entries(BASELINES)) {
  const current = assetMap.get(path);
  const maxAllowed = Math.ceil(baseline * (1 + tolerance));
  const within = current !== undefined && current <= maxAllowed;
  const entry = {
    asset: path,
    baseline,
    current,
    maxAllowed,
    within,
    diffPct: current === undefined ? 'missing' : pctDiff(current, baseline),
  };
  report.push(entry);
  if (!within) {
    failures.push(
      current === undefined ?
        `MISSING ${path}: required production asset absent`
      : `REGRESSION ${path}: ${fmt(current)} exceeds budget ${fmt(maxAllowed)} ` +
          `(+${pctDiff(current, baseline)}% from baseline ${fmt(baseline)})`,
    );
  }
}
for (const { path } of artifacts) {
  if (/\.(js|css)$/.test(path) && !Object.hasOwn(BASELINES, path)) {
    failures.push(
      `UNBUDGETED ${path}: new JS/CSS output requires a measured baseline`,
    );
  }
}

// ── Aggregate budgets ──────────────────────────────────────────────

const jsTotal = artifacts
  .filter((a) => a.path.endsWith('.js') && !a.path.endsWith('.map'))
  .reduce((s, a) => s + a.size, 0);

const cssTotal = artifacts
  .filter((a) => a.path.endsWith('.css') && !a.path.endsWith('.map'))
  .reduce((s, a) => s + a.size, 0);

const fontTotal = artifacts
  .filter((a) => a.path.includes('fonts/') && a.path.endsWith('.woff2'))
  .reduce((s, a) => s + a.size, 0);

const totalNoMaps = artifacts
  .filter((a) => !a.path.endsWith('.map'))
  .reduce((s, a) => s + a.size, 0);

const aggregates = {
  'All JS (excl. maps)': jsTotal,
  'All CSS (excl. maps)': cssTotal,
  'Fonts (woff2)': fontTotal,
  'Total (excl. maps)': totalNoMaps,
};

for (const [name, { budget, tolerance }] of Object.entries(AGGREGATE)) {
  const current = aggregates[name];
  const maxAllowed = Math.ceil(budget * (1 + tolerance));
  const within = current <= maxAllowed;
  report.push({
    asset: `[aggregate] ${name}`,
    baseline: budget,
    current,
    maxAllowed,
    within,
    diffPct: pctDiff(current, budget),
  });
  if (!within) {
    failures.push(
      `REGRESSION ${name}: ${fmt(current)} exceeds budget ${fmt(maxAllowed)} ` +
        `(+${pctDiff(current, budget)}% from budget ${fmt(budget)})`,
    );
  }
}

// ── Composition report ─────────────────────────────────────────────

const showReport = process.argv.includes('--report');

if (showReport) {
  console.log('\n=== Bundle Composition ===\n');
  console.log(
    'Category'.padEnd(30) + 'Size'.padStart(12) + '% of total'.padStart(12),
  );
  console.log('─'.repeat(54));

  const categories = [
    ['JS bundles', jsTotal],
    ['CSS', cssTotal],
    ['Fonts (woff2)', fontTotal],
    [
      'Icons',
      artifacts
        .filter((a) => a.path.startsWith('icons/'))
        .reduce((s, a) => s + a.size, 0),
    ],
    [
      'Images',
      artifacts
        .filter((a) => a.path.startsWith('images/'))
        .reduce((s, a) => s + a.size, 0),
    ],
    [
      'i18n JSON',
      artifacts
        .filter((a) => a.path.startsWith('i18n/'))
        .reduce((s, a) => s + a.size, 0),
    ],
    [
      'HTML',
      artifacts
        .filter((a) => a.path.endsWith('.html'))
        .reduce((s, a) => s + a.size, 0),
    ],
    [
      'Other',
      artifacts
        .filter(
          (a) =>
            !a.path.endsWith('.map') &&
            !a.path.endsWith('.js') &&
            !a.path.endsWith('.css') &&
            !a.path.endsWith('.html') &&
            !a.path.startsWith('i18n/') &&
            !a.path.startsWith('images/') &&
            !a.path.startsWith('icons/') &&
            !a.path.startsWith('fonts/'),
        )
        .reduce((s, a) => s + a.size, 0),
    ],
  ];

  for (const [name, bytes] of categories) {
    const pct =
      totalNoMaps > 0 ? ((bytes / totalNoMaps) * 100).toFixed(1) : '0.0';
    console.log(
      `${name.padEnd(30)}${fmt(bytes).padStart(12)}${(pct + '%').padStart(12)}`,
    );
  }

  console.log('─'.repeat(54));
  console.log(
    `${'Total (excl. maps)'.padEnd(30)}${fmt(totalNoMaps).padStart(12)}${'100.0%'.padStart(12)}`,
  );

  // Per-asset detail
  console.log('\n=== Per-Asset Detail ===\n');
  console.log(
    'Asset'.padEnd(30) +
      'Current'.padStart(12) +
      'Baseline'.padStart(12) +
      'Max'.padStart(12) +
      'Diff'.padStart(10),
  );
  console.log('─'.repeat(76));
  for (const r of report) {
    const name = r.asset;
    console.log(
      `${name.padEnd(30)}` +
        `${fmt(r.current).padStart(12)}` +
        `${fmt(r.baseline).padStart(12)}` +
        `${fmt(r.maxAllowed).padStart(12)}` +
        `${(r.diffPct === 'missing' ? r.diffPct : r.diffPct + '%').padStart(10)}`,
    );
  }
}

// ── Exit ───────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error('\n✗ Bundle budget violations:\n');
  for (const f of failures) {
    console.error(`  • ${f}`);
  }
  console.error(
    '\nThese are real regressions, not style noise.  Investigate the ' +
      'listed asset(s) or update the baseline if the change was intentional.',
  );
  process.exit(1);
} else {
  console.log('✓ Bundle budget: all assets within baseline tolerances.');
  if (showReport) {
    console.log(`  Total shipped (excl. maps): ${fmt(totalNoMaps)}`);
  }
}
