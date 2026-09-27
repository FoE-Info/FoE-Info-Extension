import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

function fixture(t, entries) {
  const root = mkdtempSync(join(tmpdir(), 'foe-references-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  copyFileSync(
    new URL('../../scripts/audit-references.mjs', import.meta.url),
    join(root, 'scripts/audit-references.mjs'),
  );
  const files = {
    'package.json': JSON.stringify({
      scripts: { check: 'node scripts/audit-references.mjs' },
    }),
    '.gitignore': '.env.local\n',
    ...entries,
  };
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(root, name, '..'), { recursive: true });
    writeFileSync(join(root, name), text);
  }
  execFileSync('git', ['init', '-q'], { cwd: root });
  return root;
}
function audit(root) {
  const result = spawnSync(
    process.execPath,
    ['scripts/audit-references.mjs', '--scope=published', '--json'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(result.error, undefined);
  return {
    status: result.status,
    findings: JSON.parse(result.stdout).findings,
  };
}
test('nested documentation links and existing npm scripts resolve before staging', (t) => {
  const root = fixture(t, {
    'README.md': '[Guide](docs/guide.md)\n`npm run check`',
    'docs/guide.md': '[Home](../README.md)',
  });
  assert.equal(audit(root).status, 0);
});
test('missing documentation and commands fail the published check', (t) => {
  const root = fixture(t, {
    'README.md': '[Guide](docs/missing.md)\n`npm run missing`',
  });
  assert.deepEqual(
    audit(root).findings.map((item) => item.kind),
    ['missing-path', 'missing-npm-script'],
  );
});
test('ignored private files cannot satisfy published links', (t) => {
  const root = fixture(t, {
    'README.md': '[Private](.env.local)',
    '.env.local': 'FIXTURE=private',
  });
  assert.equal(audit(root).status, 1);
  execFileSync('git', ['add', '-f', '.env.local'], { cwd: root });
  assert.ok(
    audit(root).findings.some((item) => item.kind === 'forbidden-publication'),
  );
});
test('missing package script entrypoints fail', (t) => {
  const root = fixture(t, {
    'package.json': JSON.stringify({
      scripts: { check: 'node scripts/missing.mjs' },
    }),
  });
  assert.equal(audit(root).status, 1);
});
