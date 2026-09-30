#!/usr/bin/env node
/**
 * fork-drift.mjs — is LoW-Tool still maintainable as a fork of this repo?
 *
 * A downstream fork is only maintainable while re-syncing it costs nothing
 * beyond copying files. The thing that breaks that is a file under
 * src/extras/ that duplicates an upstream module: it becomes a hand-merge the
 * next time upstream touches that module.
 *
 * But a duplicate is only a MERGE HAZARD if it is actually built. A file that
 * shadows an upstream path and that nothing imports and no webpack entry names
 * is dead weight — confusing to a reviewer, but it cannot conflict, because it
 * never reaches a build. So this measures REACHABILITY, not filename equality,
 * and reports the two separately.
 *
 * Four conditions define a maintained fork:
 *   1. no orphan file duplicating an upstream module   (dead weight to remove)
 *   2. no reachable extras file shadowing upstream     (a real merge hazard)
 *   3. fork core matches upstream src/js               (a clean copy, not a fork)
 *   4. src/js never imports from src/extras            (layering intact)
 *
 * Reads both trees; writes to neither.
 *
 * Usage: node .agents/scripts/fork-drift.mjs [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const UPSTREAM = path.resolve(SCRIPT_DIR, '../..');
if (!process.env.LOW_TOOL_ROOT) {
  console.error(
    'Set LOW_TOOL_ROOT to the optional downstream repository before comparing.',
  );
  process.exit(2);
}
const FORK = path.resolve(UPSTREAM, process.env.LOW_TOOL_ROOT);
if (!fs.existsSync(path.join(FORK, 'src/js'))) {
  console.error(
    `Downstream source directory not found: ${FORK}. Check LOW_TOOL_ROOT.`,
  );
  process.exit(2);
}

/** Recursively list .js files under a subdirectory, relative to it. */
function jsFiles(root, sub) {
  const base = path.join(root, sub);
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const entry of fs.readdirSync(base, {
    withFileTypes: true,
    recursive: true,
  })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    out.push(path.relative(base, path.join(entry.parentPath, entry.name)));
  }
  return out.sort();
}

const read = (root, sub, rel) =>
  fs.readFileSync(path.join(root, sub, rel), 'utf8');
const extrasFiles = jsFiles(FORK, 'src/extras');
const coreSet = new Set(jsFiles(FORK, 'src/js'));

/** Every webpack config in the fork, concatenated for entry extraction. */
function webpackConfigs() {
  return fs
    .readdirSync(FORK)
    .filter((f) => f.endsWith('.config.js') || f.includes('webpack'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => fs.readFileSync(path.join(FORK, f), 'utf8'))
    .join('\n');
}

/**
 * Classify each extras file as live (reachable from a webpack entry) or orphan.
 * Walks the import graph transitively from the configured entries.
 */
function classifyExtras() {
  const configs = webpackConfigs();

  // Entry points: a config naming ./src/extras/<path> as a bundle entry.
  const entries = new Set();
  for (const m of configs.matchAll(
    /["'](?:\.\/)?src\/extras\/([A-Za-z0-9_/.-]+\.js)["']/g,
  )) {
    entries.add(path.posix.normalize(m[1]));
  }

  // Import specifiers inside an extras file, as repo-relative extras paths.
  const depsOf = (rel) => {
    const src = read(FORK, 'src/extras', rel);
    const out = new Set();
    const spec = /(?:from|import|require\()\s*["'](\.[^"']*)["']/g;
    for (const m of src.matchAll(spec)) {
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(rel), m[1]),
      );
      if (extrasFiles.includes(target)) out.add(target);
    }
    return out;
  };

  const live = new Set();
  const queue = [...entries];
  while (queue.length) {
    const rel = queue.pop();
    if (live.has(rel) || !extrasFiles.includes(rel)) continue;
    live.add(rel);
    for (const dep of depsOf(rel)) queue.push(dep);
  }

  return {
    entries: [...entries].sort(),
    live: extrasFiles.filter((f) => live.has(f)),
    orphans: extrasFiles.filter((f) => !live.has(f)),
  };
}

const extras = classifyExtras();
const orphanDupes = extras.orphans.filter((rel) => coreSet.has(rel));

/** Fork core files whose content differs from the same path upstream. */
function coreDrift() {
  const differs = [];
  const forkOnly = [];
  for (const rel of jsFiles(FORK, 'src/js')) {
    const upstreamPath = path.join(UPSTREAM, 'src/js', rel);
    if (!fs.existsSync(upstreamPath)) {
      forkOnly.push(rel);
      continue;
    }
    if (read(FORK, 'src/js', rel) !== fs.readFileSync(upstreamPath, 'utf8')) {
      differs.push(rel);
    }
  }
  return { differs, forkOnly };
}

/** Any src/js file importing from src/extras inverts the layering. */
function upwardImports() {
  const out = [];
  for (const rel of jsFiles(FORK, 'src/js')) {
    const src = read(FORK, 'src/js', rel);
    for (const m of src.matchAll(/["'][^"']*extras[^"']*["']/g)) {
      out.push(`${rel} -> ${m[0]}`);
    }
  }
  return out;
}

const drift = coreDrift();
const upward = upwardImports();
// A configured entry is fork-owned by definition. extras/index.js shares a name
// with src/js/index.js but builds a DIFFERENT bundle (`app` vs `foeinfo`), so it
// replaces nothing — testing it for shadowing would be a guaranteed false
// positive that could never be satisfied.
const liveShadows = extras.live
  .filter((rel) => !extras.entries.includes(rel))
  .filter((rel) => coreSet.has(rel));

const conditions = [
  {
    id: 'no-orphan-duplicate',
    label: 'No orphan file duplicates an upstream module',
    pass: orphanDupes.length === 0,
    detail:
      extras.orphans.length ?
        `${extras.orphans.length} unreachable of ${extrasFiles.length}` +
        (orphanDupes.length ?
          `, ${orphanDupes.length} duplicating upstream`
        : '')
      : `all ${extrasFiles.length} extras files reachable`,
  },
  {
    id: 'no-live-shadow',
    label: 'No reachable extras file shadows an upstream module',
    pass: liveShadows.length === 0,
    detail:
      liveShadows.length ?
        `${liveShadows.length} live shadow(s): ${liveShadows.join(', ')}`
      : `live extras (${extras.live.length} files) is purely additive`,
  },
  {
    id: 'core-is-clean-copy',
    label: 'Fork core matches upstream src/js',
    pass: drift.differs.length === 0 && drift.forkOnly.length === 0,
    detail:
      drift.differs.length || drift.forkOnly.length ?
        `${drift.differs.length} differ, ${drift.forkOnly.length} fork-only`
      : 'identical',
  },
  {
    id: 'imports-only-downward',
    label: 'src/js never imports from src/extras',
    pass: upward.length === 0,
    detail: upward.length ? upward.join('; ') : 'layering intact',
  },
];

const maintained = conditions.every((c) => c.pass);
const report = {
  fork: path.basename(FORK),
  upstream: path.basename(UPSTREAM),
  maintained,
  conditions,
  extras: {
    entryPoints: extras.entries,
    live: extras.live,
    orphans: extras.orphans,
  },
  counts: {
    upstreamCoreFiles: jsFiles(UPSTREAM, 'src/js').length,
    forkCoreFiles: jsFiles(FORK, 'src/js').length,
    extrasFiles: extrasFiles.length,
    extrasLiveFiles: extras.live.length,
    extrasOrphanFiles: extras.orphans.length,
  },
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else if (process.argv.includes('--brief')) {
  // One line per condition, no file lists. Used by the pre-push hook, which
  // reports on every push and must not bury the verify output.
  console.log(
    `[fork-drift] ${report.fork}: ${maintained ? 'maintained' : 'NOT maintained'}`,
  );
  for (const c of conditions) {
    console.log(`[fork-drift]   [${c.pass ? 'ok  ' : 'FAIL'}] ${c.label}`);
  }
} else {
  console.log(`\nFork drift: ${report.fork} <- ${report.upstream}`);
  console.log(
    `  core ${report.counts.forkCoreFiles}/${report.counts.upstreamCoreFiles} files | ` +
      `extras ${report.counts.extrasFiles} ` +
      `(${report.counts.extrasLiveFiles} live, ${report.counts.extrasOrphanFiles} orphan)`,
  );
  console.log(`  entries: ${extras.entries.join(', ') || '(none found)'}`);
  if (extras.live.length) console.log(`  live:    ${extras.live.join(', ')}`);
  if (extras.orphans.length)
    console.log(`  orphan:  ${extras.orphans.join(', ')}`);
  for (const c of conditions) {
    console.log(`  [${c.pass ? 'ok  ' : 'FAIL'}] ${c.label}`);
    console.log(`         ${c.detail}`);
  }
  console.log(
    `\n  ${maintained ? 'MAINTAINED — re-syncing is a file copy' : 'NOT MAINTAINED'}`,
  );
  console.log('');
}

process.exit(maintained ? 0 : 1);
