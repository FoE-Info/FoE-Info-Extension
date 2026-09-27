import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const SCRIPT = path.join(root, 'scripts', 'audit-references.mjs');

/**
 * Run the real audit script against a throwaway project.
 *
 * ROOT is derived from the script's own location, so copying the script into a
 * temp tree points it at that tree. `read()` returns '' for absent files, so a
 * fixture only needs the files a given assertion depends on. This exercises the
 * shipped logic end to end rather than a re-implementation of it.
 */
function runAudit(files, siblings = {}) {
  // `siblings` are written NEXT TO the fixture, matching how the real script
  // resolves `../peer-repo` relative to its own repository root.
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-refs-'));
  const dir = path.join(parent, 'proj');
  fs.mkdirSync(dir, { recursive: true });
  try {
    fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
    fs.copyFileSync(SCRIPT, path.join(dir, 'scripts', 'audit-references.mjs'));
    for (const [rel, body] of Object.entries(files)) {
      const target = path.join(dir, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, body);
    }
    // Sibling repositories live NEXT TO the fixture, matching how the real
    // script resolves `../peer-repo` relative to its own repository root.
    for (const [rel, body] of Object.entries(siblings)) {
      const target = path.join(parent, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, body);
    }
    // A minimal but realistic project: the audit reads package.json for the npm
    // script surface, so a fixture without one is not a shape it must support.
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      `${JSON.stringify({ name: 'fixture', version: '0.0.0', scripts: {} }, null, 2)}\n`,
    );
    let stdout = '';
    try {
      stdout = execFileSync(
        process.execPath,
        [path.join(dir, 'scripts', 'audit-references.mjs'), '--json'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      // Exit 1 just means findings exist; the payload is still on stdout.
      stdout = error.stdout ?? '';
    }
    return JSON.parse(stdout).findings;
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

const tokens = (findings) => findings.map((f) => f.token);

test('env-var check: a code symbol that only reads as UPPER_SNAKE is not an env var', () => {
  // `MY_CODE_SYMBOL` is an ordinary const in the source, never assigned as a
  // variable. Before the assignment gate this was reported as an undefined
  // env var, which is what made RULES and VERSION_PATTERN show up.
  const findings = runAudit({
    'src/lib.js':
      'const MY_CODE_SYMBOL = { a: 1 };\nmodule.exports = MY_CODE_SYMBOL;\n',
    'README.md': 'The rule bank lives in `MY_CODE_SYMBOL`.\n',
  });
  assert.ok(
    !tokens(findings).includes('MY_CODE_SYMBOL'),
    'a code symbol must not be reported as an undefined env var',
  );
});

test('env-var check: a read-only override is not repo drift', () => {
  // `process.env.MY_OVERRIDE || fallback` is read but never written, so the
  // value is the developer's to supply. METADATA_STORE_DIR is this exact
  // shape: an optional path override for the metadata graph.
  const findings = runAudit({
    'src/lib.mjs':
      'const dir = process.env.MY_OVERRIDE || "/default";\nexport default dir;\n',
    'README.md': 'Point it elsewhere with `MY_OVERRIDE`.\n',
  });
  assert.ok(
    !tokens(findings).includes('MY_OVERRIDE'),
    'a read-only override must not be reported as undefined',
  );
});

test('env-var check: an assignment the repo never provides is still reported', () => {
  // The gate must not silence the class entirely. Prose that tells a reader to
  // set a variable, where nothing in the repo assigns one, is real drift.
  const findings = runAudit({
    'src/lib.mjs': 'export const x = 1;\n',
    'README.md': 'Disable it with `MY_UNDEFINED_SETTING=1`.\n',
  });
  assert.ok(
    tokens(findings).includes('MY_UNDEFINED_SETTING'),
    'an assignment-style reference to an undefined var must still be reported',
  );
});

test('url-path check: rooted external endpoints are not unresolved references', () => {
  // The old rule matched only InnoGames prefixes, so an OpenRouter API path
  // was reported. Any rooted path is a URL path unless it names a real
  // filesystem location.
  const findings = runAudit({
    'README.md':
      'Reachable only on OpenRouter’s `/api/alpha/decisions`, not the `/game/json` endpoint.\n',
  });
  assert.deepEqual(
    findings.filter((f) => f.kind === 'unresolved-path'),
    [],
    'rooted URL paths must not be reported',
  );
});

test('url-path check: a rooted filesystem path that is gone is still drift', () => {
  // The other half of the rule: `/var/...` is a real local path, so if it
  // stops existing that is worth reporting rather than excusing as a URL.
  const findings = runAudit({
    'README.md': 'The rebuild log lives at `/var/tmp/does-not-exist/log`.\n',
  });
  assert.ok(
    tokens(findings).includes('/var/tmp/does-not-exist/log'),
    'a missing absolute filesystem path must still be reported',
  );
});

test('sibling-repo check: a path in a documented fork resolves, not flagged', () => {
  // docs/TODO.md documents the peer-repo fork and its src/extras/ module. Those
  // paths are correct but live in another repository, so the auditor must
  // verify them against that repository rather than report them as unresolved.
  //
  // `src/` exists in the fixture on purpose. Without it the auditor
  // short-circuits before trying any candidate and the assertion holds
  // vacuously — so this asserts BOTH directions: the same prose is reported
  // when the fork is absent, and silent when it is present. That is what makes
  // it a test of sibling resolution rather than of the fixture.
  const readme = 'The fork keeps its module at `src/extras/index.js`.\n';
  const absent = runAudit({ 'README.md': readme, 'src/app.js': 'x\n' });
  assert.ok(
    tokens(absent).includes('src/extras/index.js'),
    'without the fork present, the path must be reported',
  );

  const present = runAudit(
    { 'README.md': readme, 'src/app.js': 'x\n' },
    { 'peer-repo/src/extras/index.js': 'export const x = 1;\n' },
  );
  assert.deepEqual(
    present.filter((f) => f.kind === 'unresolved-path'),
    [],
    'a path that exists in the sibling fork must not be reported',
  );
});

test('sibling-repo check: a bare fragment under the fork resolves too', () => {
  // `fn/extras.js` is written relative to src/extras/, so it only resolves
  // against the fork's extras root. Without that root it looks like a fragment
  // belonging to this repository's own src/js/fn.
  const findings = runAudit(
    { 'README.md': 'The live files are `fn/extras.js` and `fn/users.js`.\n' },
    {
      'peer-repo/src/extras/fn/extras.js': 'export const a = 1;\n',
      'peer-repo/src/extras/fn/users.js': 'export const b = 2;\n',
    },
  );
  assert.deepEqual(
    findings.filter((f) => f.kind === 'unresolved-path-fragment'),
    [],
    "a fragment existing under the fork's extras root must not be reported",
  );
});
