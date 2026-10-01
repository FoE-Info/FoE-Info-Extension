#!/usr/bin/env node
/**
 * Default-argument audit.
 *
 * Catches the defect that a missed-callsite check structurally cannot:
 * a function parameter's default is changed or removed, and every caller that
 * relied on that default silently changes behaviour instead of failing.
 *
 * The 2026-09-28 batch review rejected a patch for exactly this. Four `calc/`
 * modules were made pure by dependency injection, and each constructor default
 * was changed from a live state lookup to `null` / `0`. Both calculators build
 * module-level singletons that pass no argument, so with the default now `null`
 * the metadata store was permanently absent on the production path. `meta` then
 * fed Great Building classification, chain-link filtering, `extractSpecialBonuses`
 * (including the Arc bonus), `extractEntityProduction` and `extractEntityBoosts`.
 * The test suite stayed green because no test constructed these with a store,
 * and optional chaining meant nothing threw — the production and boost totals
 * were simply quietly wrong.
 *
 * Nothing about that is a "removed symbol", so `audit:callsites` saw a clean
 * tree. This script sees it: the default changed, and these call sites omit the
 * parameter.
 *
 * Usage:
 *   node scripts/audit-default-args.mjs              # uncommitted changes vs HEAD
 *   node scripts/audit-default-args.mjs --staged
 *   node scripts/audit-default-args.mjs --base main
 *   node scripts/audit-default-args.mjs --json
 *   node scripts/audit-default-args.mjs --all        # list every affected call
 * Exit:
 *   0 = no caller relies on a changed default, 1 = findings present.
 *
 * SCOPE AND HONEST LIMITS
 *
 * This is a conservative syntactic check. It reports a call site when the
 * argument count is less than or equal to the affected parameter's index —
 * i.e. the parameter is omitted and the default is in force. It does not
 * evaluate whether the new default is *wrong*, only that a caller depends on
 * it. Deciding whether the new value is acceptable is a review question, and
 * the output is written to make that question cheap to answer by reading.
 *
 * It is blind to several real cases, and a clean result is not a proof of
 * safety:
 *   - Call sites reached through indirection the local binding resolver cannot follow: a function
 *     passed as a value and invoked by another name.
 *   - Callers whose argument list is assembled at runtime or spread
 *     (`fn(...args)`), where the count cannot be read statically.
 *   - Methods and accessors reached by destructuring (`const { go } = obj`),
 *     which this does not resolve.
 *   - Changes to a default in a file the diff did not touch, for instance when
 *     a shared constant a default references is edited elsewhere.
 * AST matching excludes declarations and unrelated imported/local receivers.
 * Same-file calls, constructors, aliases and multiline arguments are included.
 * Unknown receivers, spread arguments and unsupported syntax remain unresolved.
 * Those are stated so a future reader does not over-trust a passing run.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  defaultArgumentCalls,
  defaultSignatures,
} from './lib/default-argument-calls.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const AS_JSON = process.argv.includes('--json');
const SHOW_ALL = process.argv.includes('--all');
const STAGED = process.argv.includes('--staged');
const BASE = (() => {
  const i = process.argv.indexOf('--base');
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
})();

const SCAN_EXT = /\.(js|mjs|cjs|ts|jsx|tsx)$/;
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

// --- 1. Which files changed? -----------------------------------------------

const diffArgs = ['diff', '-U0'];
if (STAGED) diffArgs.push('--cached', BASE ?? 'HEAD');
else if (BASE) diffArgs.push(BASE);
else diffArgs.push('HEAD');

const ref = BASE ?? 'HEAD';
const diff = git(diffArgs, { allowFail: true });
const changedFiles = new Set();
for (const line of diff.split('\n')) {
  const m = line.match(/^\+\+\+ b\/(.*)$/);
  if (m && SCAN_EXT.test(m[1])) changedFiles.add(m[1]);
}

if (changedFiles.size === 0) {
  const note =
    STAGED ? 'no staged changes'
    : BASE ? `no changes vs ${BASE}`
    : 'no uncommitted changes';
  console.log(
    AS_JSON ?
      JSON.stringify({ scope: note, findings: [] }, null, 2)
    : `audit:default-args — ${note}; nothing to check.`,
  );
  process.exit(0);
}

const readAt = (path, r) => {
  try {
    return execFileSync('git', ['show', `${r}:${path}`], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    return null;
  }
};

// --- 2. Which function defaults changed? -----------------------------------

/** @type {Array<{file,name,paramIndex,param,before,after}>} */
const changedDefaults = [];

for (const file of changedFiles) {
  const before = readAt(file, ref);
  if (before === null) continue;
  const afterPath = join(ROOT, file);
  const after =
    STAGED ? (readAt(file, '') ?? '')
    : existsSync(afterPath) ? readFileSync(afterPath, 'utf8')
    : '';

  const beforeSigs = defaultSignatures(before);
  const afterSigs = defaultSignatures(after);

  for (const [key, bSig] of beforeSigs) {
    const aSig = afterSigs.get(key);
    if (!aSig) continue; // removed entirely — that is audit:callsites' job
    const width = Math.max(bSig.params.length, aSig.params.length);
    for (let i = 0; i < width; i++) {
      const b = bSig.params[i];
      const a = aSig.params[i];
      const bDefault = b?.defaultExpr ?? null;
      const aDefault = a?.defaultExpr ?? null;
      if (bDefault === aDefault) continue;
      changedDefaults.push({
        file,
        name: bSig.name,
        owner: bSig.owner,
        paramIndex: i,
        param: a?.text ?? b?.text ?? '?',
        before: bDefault,
        after: aDefault,
        wasDefaulted: bDefault !== null,
        nowDefaulted: aDefault !== null,
      });
    }
  }
}

// --- 3. Which callers omit that parameter? ---------------------------------

/** @type {Map<string, Array>} */
const findings = [];
let unresolved = 0;

const callerFiles = git([
  'ls-files',
  '--cached',
  '--others',
  '--exclude-standard',
])
  .split('\n')
  .filter((file) => SCAN_EXT.test(file) && existsSync(join(ROOT, file)));
for (const change of changedDefaults) {
  const sites = [];
  for (const file of callerFiles) {
    const source =
      STAGED ? readAt(file, '') : readFileSync(join(ROOT, file), 'utf8');
    if (!source || !source.includes(change.name)) continue;
    try {
      const result = defaultArgumentCalls(source, join(ROOT, file), {
        ...change,
        file: join(ROOT, change.file),
      });
      unresolved += result.unresolved;
      sites.push(...result.sites.map((site) => ({ ...site, file })));
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      unresolved++; // Unsupported syntax is an explicit audit boundary.
    }
  }
  if (sites.length) findings.push({ change, sites });
}

findings.sort((a, b) => b.sites.length - a.sites.length);

// --- 4. Report --------------------------------------------------------------

const totalSites = findings.reduce((n, f) => n + f.sites.length, 0);

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        scope:
          STAGED ? 'staged'
          : BASE ? `vs ${BASE}`
          : 'uncommitted',
        filesScanned: changedFiles.size,
        defaultsChanged: changedDefaults.length,
        changedDefaults,
        findings,
        unresolvedCallSites: unresolved,
      },
      null,
      2,
    ),
  );
} else {
  console.log(
    `audit:default-args — ${changedFiles.size} changed file(s), ${changedDefaults.length} default(s) changed, ${findings.length} function(s) with callers relying on a default, ${totalSites} call site(s).`,
  );
  for (const f of findings) {
    const c = f.change;
    const what =
      c.wasDefaulted ?
        `default changed: ${c.before} -> ${c.after === null ? '(none — now required)' : c.after}`
      : `new default added: -> ${c.after}`;
    console.log(`\n  ${c.name}(..., ${c.param})  in ${c.file}`);
    console.log(`      ${what}`);
    const shown = SHOW_ALL ? f.sites : f.sites.slice(0, 4);
    for (const s of shown)
      console.log(
        `      caller passes ${s.argsPassed} arg(s) at ${s.file}:${s.line}`,
      );
    const hidden = f.sites.length - shown.length;
    if (hidden > 0) console.log(`      … ${hidden} more`);
  }
  if (unresolved)
    console.log(
      `\n  ${unresolved} call site(s) could not be resolved statically (receiver, spread or unsupported syntax) and were not checked.`,
    );
  console.log(
    findings.length ?
      '\nFAIL — callers rely on a default this diff changed.'
    : '\nOK — no caller relies on a changed default.',
  );
}

process.exit(findings.length ? 1 : 0);
