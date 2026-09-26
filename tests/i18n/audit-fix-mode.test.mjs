/**
 * Tests for scripts/audit-i18n.mjs — the fix mode must report the REAL
 * remaining state and exit non-zero while any disparity (especially extra
 * orphaned keys) remains. A parity gate that prints success on failure is
 * worse than no gate.
 *
 * The script resolves its i18n dir relative to its own location
 * (`<dir>/../src/i18n`), so each test copies the script into a temp fixture
 * tree and runs it as a child process.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const SCRIPT = path.join(ROOT, 'scripts/audit-i18n.mjs');
const REAL_I18N = path.join(ROOT, 'src/i18n');

/** Copy the audit script + a fixture i18n dir into a fresh temp tree. */
function makeFixtureTree(files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-audit-'));
  fs.mkdirSync(path.join(tmp, 'src/i18n'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(tmp, 'scripts/audit-i18n.mjs'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(tmp, 'src/i18n', name), content);
  }
  return tmp;
}

function runAudit(tmp, args = []) {
  try {
    const stdout = execFileSync(
      process.execPath,
      [path.join(tmp, 'scripts/audit-i18n.mjs'), ...args],
      { encoding: 'utf8', cwd: tmp },
    );
    return { code: 0, stdout };
  } catch (err) {
    return { code: err.status ?? 1, stdout: String(err.stdout || '') };
  }
}

const LOCALES = ['de', 'el', 'es', 'fr', 'gr', 'it'];

function fixtureDictionaries(canonical, localeKeys) {
  const files = { 'en.json': JSON.stringify(canonical) };
  for (const loc of LOCALES) {
    files[`${loc}.json`] = JSON.stringify(localeKeys(loc));
  }
  return files;
}

describe('audit-i18n fix mode reports real remaining state', () => {
  it('exits non-zero and never claims parity when extra orphaned keys remain, even with --fix', () => {
    const canonical = { keep_me: 'Keep', also_kept: 'Also' };
    // Every locale keeps all canonical keys but de carries one ORPHANED key.
    const files = fixtureDictionaries(canonical, (loc) =>
      loc === 'de' ?
        { keep_me: 'x', also_kept: 'y', orphaned_key: 'z' }
      : { keep_me: 'x', also_kept: 'y' },
    );
    const tmp = makeFixtureTree(files);

    const { code, stdout } = runAudit(tmp, ['--fix']);

    assert.notEqual(
      code,
      0,
      'audit must exit non-zero while extra keys remain',
    );
    assert.match(
      stdout,
      /orphaned/i,
      'report must name the remaining extra-key problem',
    );
    assert.doesNotMatch(
      stdout,
      /full key parity/,
      'must NOT print the success message while a disparity remains',
    );
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('still exits non-zero without --fix on missing keys', () => {
    const canonical = { a: 'A', b: 'B' };
    const files = fixtureDictionaries(canonical, (loc) =>
      loc === 'fr' ? { a: 'x' } : { a: 'x', b: 'y' },
    );
    const tmp = makeFixtureTree(files);

    const { code, stdout } = runAudit(tmp);

    assert.notEqual(code, 0);
    assert.match(stdout, /Disparities found/);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('exits zero and prints parity only when dictionaries really match', () => {
    const canonical = { a: 'A', b: 'B' };
    const files = fixtureDictionaries(canonical, () => ({ a: 'x', b: 'y' }));
    const tmp = makeFixtureTree(files);

    const { code, stdout } = runAudit(tmp);

    assert.equal(code, 0);
    assert.match(stdout, /full key parity/);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('backfills missing keys in --fix mode, then exits non-zero if extras remain elsewhere', () => {
    const canonical = { a: 'A', b: 'B' };
    const files = fixtureDictionaries(canonical, (loc) =>
      loc === 'de' ?
        { a: 'x', stray: 'orphan' } // missing 'b', extra 'stray'
      : { a: 'x', b: 'y' },
    );
    const tmp = makeFixtureTree(files);

    const { code, stdout } = runAudit(tmp, ['--fix']);

    // de was backfilled (b added) but 'stray' remains -> non-zero.
    assert.notEqual(code, 0);
    const de = JSON.parse(
      fs.readFileSync(path.join(tmp, 'src/i18n/de.json'), 'utf8'),
    );
    assert.equal(de.b, 'B', 'fix mode must still backfill missing keys');
    assert.match(stdout, /orphaned|extra/i);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('the real repository dictionaries pass parity', () => {
    // Sanity: the shipped dictionaries are in parity, so the gate is green.
    const canonical = JSON.parse(
      fs.readFileSync(path.join(REAL_I18N, 'en.json'), 'utf8'),
    );
    const canonicalKeys = Object.keys(canonical)
      .filter((k) => k !== '@metadata')
      .sort();
    for (const loc of LOCALES) {
      const dict = JSON.parse(
        fs.readFileSync(path.join(REAL_I18N, `${loc}.json`), 'utf8'),
      );
      const keys = Object.keys(dict)
        .filter((k) => k !== '@metadata')
        .sort();
      assert.deepEqual(keys, canonicalKeys, `${loc}.json key parity`);
    }
  });
});
