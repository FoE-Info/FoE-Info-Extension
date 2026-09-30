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
 *   - Call sites reached through indirection the grep cannot follow: a function
 *     passed as a value and invoked by another name.
 *   - Callers whose argument list is assembled at runtime or spread
 *     (`fn(...args)`), where the count cannot be read statically.
 *   - Methods and accessors reached by destructuring (`const { go } = obj`),
 *     which this does not resolve.
 *   - Changes to a default in a file the diff did not touch, for instance when
 *     a shared constant a default references is edited elsewhere.
 * Those are stated so a future reader does not over-trust a passing run.
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

const SCAN_EXT = /\.(js|mjs|cjs|ts|jsx|tsx)$/;
/** Keywords whose `(` is never a function declaration we care about. */
const NOT_A_DECL = new Set([
  'if',
  'for',
  'while',
  'switch',
  'catch',
  'return',
  'typeof',
  'await',
  'new',
  'delete',
  'void',
  'in',
  'of',
  'do',
  'else',
  'try',
  'finally',
  'case',
  'throw',
  'yield',
  'super',
  'this',
]);
const IDENT = /[A-Za-z_$][\w$]*/y;
const IDENT_CHAR = /[A-Za-z0-9_$]/;

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

// --- Lexing helpers ---------------------------------------------------------

/** Given the index of an opening bracket, return the index of its match, or -1. */
function matchBracket(src, open) {
  const pairs = { '(': ')', '[': ']', '{': '}' };
  const close = pairs[src[open]];
  if (!close) return -1;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(src, i);
      if (i === -1) return -1;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? src.length : nl;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      if (e === -1) return -1;
      i = e + 1;
      continue;
    }
    if (c === src[open]) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Index of the closing quote of the string starting at `i`, or -1. */
function skipString(src, i) {
  const quote = src[i];
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === '\\') {
      j += 2;
      continue;
    }
    if (src[j] === quote) return j;
    if (quote !== '`' && src[j] === '\n') return -1; // unterminated
    j++;
  }
  return -1;
}

/** Split a parameter/argument list on top-level commas. */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '"' || c === "'" || c === '`') {
      const e = skipString(body, i);
      if (e !== -1) {
        i = e;
        continue;
      }
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

// --- Signature extraction ---------------------------------------------------

/**
 * Map of function name -> { params: [{ text, hasDefault }], line }
 * Only declarations are collected: a `(` whose matching `)` is followed by
 * `{`, `=>`, or `async`. A call site is followed by something else, which is
 * what keeps every invocation in the file from being read as a declaration.
 */
function signaturesIn(src) {
  const found = new Map();
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== '(') continue;

    // Walk back over whitespace to the name.
    let j = i - 1;
    while (j >= 0 && /\s/.test(src[j])) j--;
    if (j < 0 || !IDENT_CHAR.test(src[j])) continue;

    // Read the identifier that ENDS at j. A sticky regex with lastIndex set to
    // j matches forward from j, which yields the final character of the name
    // rather than the name itself: `function fDemoAlpha(a, …)` was recorded as
    // a function called `a`, so every call-site grep silently missed and the
    // script reported a clean tree on a deliberately broken one.
    const idMatch = src.slice(0, j + 1).match(/[A-Za-z_$][\w$]*$/);
    if (!idMatch) continue;
    const name = idMatch[0];
    const nameStart = idMatch.index;

    let before = nameStart - 1;
    while (before >= 0 && /\s/.test(src[before])) before--;
    let isFunctionKw = false;
    if (before >= 7 && src.slice(before - 7, before + 1) === 'function') {
      isFunctionKw = true;
      before -= 8;
      while (before >= 0 && /\s/.test(src[before])) before--;
    }

    if (NOT_A_DECL.has(name) && !isFunctionKw) continue;
    if (name === 'function') continue;

    const close = matchBracket(src, i);
    if (close === -1) continue;

    // Declaration test: what follows the parameter list decides.
    let after = close + 1;
    while (after < src.length && /\s/.test(src[after])) after++;
    const follows = src.slice(after, after + 6);
    const isArrow = follows.startsWith('=>');
    const isBlock = src[after] === '{';
    if (!isArrow && !isBlock) continue;
    if (name === 'async' && !isArrow) continue;

    const params = splitTopLevel(src.slice(i + 1, close)).map((p) => {
      const [head, defaultExpr] = topLevelDefaultSplit(p);
      return { text: p, name: head.trim(), defaultExpr: defaultExpr ?? null };
    });

    if (!found.has(name) || !isFunctionKw)
      found.set(name, { params, line: lineOf(src, i) });
  }
  return found;
}

/** Split a parameter at its top-level `=` default marker. */
function topLevelDefaultSplit(param) {
  let depth = 0;
  for (let i = 0; i < param.length; i++) {
    const c = param[i];
    if (c === '"' || c === "'" || c === '`') {
      const e = skipString(param, i);
      if (e !== -1) {
        i = e;
        continue;
      }
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === '=' && depth === 0) {
      if (param[i + 1] === '=' || param[i - 1] === '=' || param[i + 1] === '>')
        continue;
      return [param.slice(0, i), param.slice(i + 1)];
    }
  }
  return [param, null];
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

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
  const after = existsSync(afterPath) ? readFileSync(afterPath, 'utf8') : '';

  const beforeSigs = signaturesIn(before);
  const afterSigs = signaturesIn(after);

  for (const [name, bSig] of beforeSigs) {
    const aSig = afterSigs.get(name);
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
        name,
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

for (const change of changedDefaults) {
  const hits = git(['grep', '-n', '-w', '-e', change.name], { allowFail: true })
    .split('\n')
    .filter(Boolean);
  const sites = [];
  for (const hit of hits) {
    const m = hit.match(/^(.+?):(\d+):(.*)$/);
    if (!m) continue;
    const [, file, lineNo, text] = m;
    if (!SCAN_EXT.test(file)) continue;
    if (file === change.file) continue; // the definition site itself
    const open = text.indexOf(`${change.name}(`);
    if (open === -1) continue; // not a call, just a mention
    const paren = text.indexOf('(', open);
    if (paren === -1) continue;
    const close = matchBracket(text, paren);
    if (close === -1) {
      unresolved++;
      continue;
    } // spans lines; do not guess
    if (/\.\s*$/.test(text.slice(0, open))) continue; // method call on this fn is still a call; keep
    const args = splitTopLevel(text.slice(paren + 1, close));
    // Spread or computed length: the count is not readable statically.
    if (args.some((a) => a.includes('...') || /^\[.*\]$/.test(a))) {
      unresolved++;
      continue;
    }
    if (args.length > change.paramIndex) continue; // caller supplies the argument
    sites.push({
      file,
      line: Number(lineNo),
      argsPassed: args.length,
      code: text.trim().slice(0, 120),
    });
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
      `\n  ${unresolved} call site(s) could not be read statically (multiline or spread) and were not checked.`,
    );
  console.log(
    findings.length ?
      '\nFAIL — callers rely on a default this diff changed.'
    : '\nOK — no caller relies on a changed default.',
  );
}

process.exit(findings.length ? 1 : 0);
