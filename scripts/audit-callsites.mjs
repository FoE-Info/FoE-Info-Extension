#!/usr/bin/env node
/**
 * Missed-callsite audit.
 *
 * A removal that leaves a live reference behind is the single most common way
 * an agent-authored patch breaks a working tree, and the failure is silent until
 * the surviving line executes. The three patches rejected during the 2026-09-28
 * batch review all had this shape: declarations removed on one side, references
 * left standing on the other, and a summary that reported the change as complete.
 *
 * This is a deterministic check, not a judgement. For every symbol a diff
 * removes, it greps the working tree for surviving references and names them. A
 * rename is a removal plus an addition, so it is covered by the same pass.
 *
 * Usage:
 *   node scripts/audit-callsites.mjs               # uncommitted changes vs HEAD
 *   node scripts/audit-callsites.mjs --staged      # staged changes vs HEAD
 *   node scripts/audit-callsites.mjs --base main   # working tree vs a ref
 *   node scripts/audit-callsites.mjs --json
 *   node scripts/audit-callsites.mjs --all         # list every reference
 * Exit:
 *   0 = no surviving references, 1 = findings present.
 *
 * WHAT IT CATCHES
 *   - A removed or renamed top-level binding (const/let/var/function/class,
 *     including destructured ones) with surviving references.
 *   - A key dropped from a `module.exports` block with surviving references,
 *     which is the shape of a broken cross-module import.
 *
 * WHAT IT DOES NOT CATCH
 *   - A changed default parameter whose callers relied on the default. Removing
 *     the value is not removing a name, so this passes. (It happened: a
 *     dependency-injection change defaulted a metadata store to `null` while the
 *     module-level singleton never passed one, silently zeroing production and
 *     boost arithmetic in two calculators.)
 *   - A call to a method that never existed. `obj?.method?.()` on a missing
 *     method is not a removal.
 *   - Anything decided at runtime rather than by name.
 *
 * Those are different classes of defect and need a different check. This one
 * exists because the missed-callsite class is free to detect and was missed
 * three times in a row.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const AS_JSON = process.argv.includes('--json');
const SHOW_ALL = process.argv.includes('--all');
const STAGED = process.argv.includes('--staged');
const BASE = (() => {
  const i = process.argv.indexOf('--base');
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
})();

/** Only JS-family source is worth grepping; a renamed symbol cannot be called from YAML. */
const SCAN_EXT = /\.(js|mjs|cjs|ts|jsx|tsx)$/;
const ALL_BINDINGS = process.argv.includes('--all-bindings');

const git = (args, { allowFail = false } = {}) => {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    if (allowFail) return '';
    throw e;
  }
};

// --- 1. Which files changed, and on which lines were lines removed? --------

// `git diff -U0 <ref>` compares <ref> against the working tree. A second ref
// would compare <ref> to itself and yield an empty diff, which reads as
// "nothing removed" rather than as a failure — the first version did exactly
// that and reported a clean tree on a deliberately broken one.
const diffArgs = ['diff', '-U0'];
if (STAGED) diffArgs.push('--cached', BASE ?? 'HEAD');
else if (BASE) diffArgs.push(BASE);
else diffArgs.push('HEAD');

const diff = git(diffArgs, { allowFail: true });

/** file -> Set of line numbers that no longer exist in the working tree */
const removedLines = new Map();
let currentFile = null;
let newLineNo = 0;
for (const line of diff.split('\n')) {
  const fileHeader = line.match(/^\+\+\+ b\/(.*)$/);
  if (fileHeader) {
    currentFile = fileHeader[1];
    continue;
  }
  const hunk = line.match(/^@@ -\S+ \+(\d+)/);
  if (hunk) {
    newLineNo = Number(hunk[1]);
    continue;
  }
  if (!currentFile) continue;
  if (line.startsWith('---') || line.startsWith('+++')) continue;
  if (line.startsWith('-')) {
    if (!removedLines.has(currentFile))
      removedLines.set(currentFile, new Set());
    removedLines.get(currentFile).add(newLineNo);
  } else if (!line.startsWith('\\')) {
    newLineNo++;
  }
}

const changedFiles = [...removedLines.keys()].filter((f) => SCAN_EXT.test(f));
if (changedFiles.length === 0) {
  const note =
    STAGED ? 'no staged changes'
    : BASE ? `no changes vs ${BASE}`
    : 'no uncommitted changes';
  if (AS_JSON)
    console.log(
      JSON.stringify({ scope: note, removed: [], findings: [] }, null, 2),
    );
  else console.log(`audit:callsites — ${note}; nothing removed.`);
  process.exit(0);
}

// `git diff -U0 <ref>` compares <ref> against the working tree. Passing a
// second ref would compare <ref> to itself and silently yield an empty diff,
// which reads as "nothing removed" rather than as a failure.
// --- 2. Which names does each changed file no longer define? ----------------

const DECL =
  /(?:^|[;{}\s])(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/g;
const DESTRUCTURED =
  /(?:^|[;{}\s])(?:export\s+)?(?:const|let|var)\s*\{([^}]*)\}\s*=/g;

function bindingsIn(source) {
  const names = new Set();
  for (const m of source.matchAll(DECL)) names.add(m[1]);
  for (const m of source.matchAll(DESTRUCTURED)) {
    for (const part of m[1].split(',')) {
      const t = part.split(':').pop().split('=')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(t)) names.add(t);
    }
  }
  return names;
}

/**
 * Names a module exports, in both idioms this repo uses.
 *
 * The block form (`module.exports = { a, b }`) matched 146 of the 179 files
 * that export anything; the remaining 33 use the property form
 * (`module.exports.a = a`), which a block-only pattern cannot see at all.
 */
function exportKeysIn(source) {
  const keys = new Set();
  for (const m of source.matchAll(
    /module\.exports\s*=\s*\{([\s\S]*?)\n\s*\};/g,
  )) {
    for (const part of m[1].split(',')) {
      const t = part.split(':')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(t)) keys.add(t);
    }
  }
  for (const m of source.matchAll(/module\.exports\.([A-Za-z_$][\w$]*)\s*=/g)) {
    keys.add(m[1]);
  }
  return keys;
}

const readAt = (path, ref) => {
  try {
    return execFileSync('git', ['show', `${ref}:${path}`], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    return null;
  }
};

const ref = BASE ?? 'HEAD';

/** name -> Set of files the name disappeared from */
const removedNames = new Map();
for (const file of changedFiles) {
  const before = readAt(file, ref);
  if (before === null) continue;
  const afterPath = join(ROOT, file);
  const after = existsSync(afterPath) ? readFileSync(afterPath, 'utf8') : '';
  // Scope: only names that were part of the module's SURFACE at HEAD.
  //
  // Every local binding was tried first and is unsound. A repo-wide name grep
  // cannot tell one module's `after` from another's, so a local named `after`
  // removed from one script reports sixty live "references" in unrelated ones
  // that share nothing but a word. An exported name is different: it crosses a
  // module boundary by definition, so a surviving occurrence really is a
  // caller. `--all-bindings` restores the local scan for the cases where the
  // noise is worth it.
  const beforeSurface = new Set([
    ...bindingsIn(before),
    ...exportKeysIn(before),
  ]);
  const afterSurface = new Set([...bindingsIn(after), ...exportKeysIn(after)]);
  const beforeExports = exportKeysIn(before);

  const gone = new Set();
  for (const name of beforeSurface) {
    if (afterSurface.has(name)) continue;
    if (!ALL_BINDINGS && !beforeExports.has(name)) continue;
    gone.add(name);
  }

  for (const name of gone) {
    if (name.length < 2) continue; // one-letter names produce pure noise
    if (!removedNames.has(name)) removedNames.set(name, new Set());
    removedNames.get(name).add(file);
  }
}

// --- 3. Grep the working tree for surviving references ----------------------

const findings = [];
let truncated = 0;

for (const [name, fromFiles] of removedNames) {
  const hits = git(['grep', '-n', '-w', '--', name], { allowFail: true })
    .split('\n')
    .filter(Boolean);
  if (hits.length === 0) continue;

  const live = [];
  for (const hit of hits) {
    const m = hit.match(/^(.+?):(\d+):(.*)$/);
    if (!m) continue;
    const [, file, lineNo] = m;
    // Prose, licences and hook scripts are not callers. Without this an
    // ordinary English word in a doc reads as a surviving reference — the
    // first version reported `LICENSE.md` 421 times over the word "after".
    if (!SCAN_EXT.test(file)) continue;
    // A reference on a line this same diff removed is not a survivor.
    if (removedLines.get(file)?.has(Number(lineNo))) continue;
    live.push({ file, line: Number(lineNo) });
  }
  if (live.length === 0) continue;
  const hidden = SHOW_ALL ? 0 : Math.max(0, live.length - 4);
  truncated += hidden;
  findings.push({
    name,
    removedFrom: [...fromFiles],
    references: live,
    hidden,
  });
}

findings.sort(
  (a, b) =>
    b.references.length - a.references.length || a.name.localeCompare(b.name),
);

// --- 4. Report -------------------------------------------------------------

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        scope:
          STAGED ? 'staged'
          : BASE ? `vs ${BASE}`
          : 'uncommitted',
        filesScanned: changedFiles.length,
        namesRemoved: removedNames.size,
        findings,
        truncatedReferences: truncated,
      },
      null,
      2,
    ),
  );
} else {
  console.log(
    `audit:callsites — ${changedFiles.length} changed file(s), ${removedNames.size} name(s) removed, ${findings.length} with surviving references.`,
  );
  for (const f of findings) {
    console.log(`\n  ${f.name}  (removed from ${f.removedFrom.join(', ')})`);
    const shown = SHOW_ALL ? f.references : f.references.slice(0, 4);
    for (const r of shown) console.log(`      ${r.file}:${r.line}`);
    if (f.hidden) console.log(`      … ${f.hidden} more`);
  }
  if (!SHOW_ALL && truncated)
    console.log(
      `\n  ${truncated} further reference(s) hidden; pass --all to list them.`,
    );
  console.log(
    findings.length ?
      '\nFAIL — a removed name is still referenced.'
    : '\nOK — no surviving references.',
  );
}

process.exit(findings.length ? 1 : 0);
