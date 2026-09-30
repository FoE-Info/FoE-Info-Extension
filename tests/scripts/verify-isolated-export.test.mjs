import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  publishableFiles,
  verifyExport,
} from '../../scripts/verify-isolated-export.mjs';

function fixture(t) {
  const parent = mkdtempSync(join(tmpdir(), 'foe-export-test-'));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const root = join(parent, 'source');
  mkdirSync(root);
  const tracked = [
    'package.json',
    'graphify-out/graph.json',
    '.env',
    'build/stale.log',
    'private.pem',
    'private.key',
  ];
  const additions = [
    '.agents/skills/new/SKILL.md',
    '.codex/auth.json',
    'node_modules/example.js',
    '.audit-siblings/peer.md',
    'graphify-out/reflections/local.md',
  ];
  for (const path of [...tracked, ...additions]) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), path);
  }
  const git = (_command, args) =>
    args[0] === 'rev-parse' ?
      'fixture-head\n'
    : (args.includes('--others') ? [...tracked, ...additions] : tracked).join(
        '\0',
      ) + '\0';
  return { root, parent, git };
}

test('export includes pending harness and tracked graph references, excludes private and generated files', (t) => {
  const { root, parent, git } = fixture(t);
  assert.deepEqual(publishableFiles(root, git), [
    '.agents/skills/new/SKILL.md',
    'graphify-out/graph.json',
    'package.json',
  ]);
  const calls = [];
  const result = verifyExport(root, {
    parent,
    git,
    run: (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0, stdout: 'fixture output\n', stderr: '' };
    },
  });
  assert.equal(result.exitCode, 0);
  assert.equal(existsSync(join(result.directory, '.env')), false);
  assert.equal(
    existsSync(join(result.directory, '.agents/skills/new/SKILL.md')),
    true,
  );
  assert.deepEqual(
    calls.map(({ args }) => args),
    [['init', '--quiet'], ['add', '--all'], ['ci'], ['run', 'verify:evidence']],
  );
  const manifest = JSON.parse(
    readFileSync(join(result.evidence, 'export.json')),
  );
  assert.equal(manifest.source.head, 'fixture-head');
  assert.match(manifest.source.digest, /^[a-f0-9]{64}$/);
  assert.equal(manifest.steps.length, 4);
  assert.equal(calls[3].options.env.CI_TEST_EVIDENCE_DIR, result.evidence);
});

for (const failedStep of [3, 4]) {
  test(`child step ${failedStep} failure retains exact status and stops following steps`, (t) => {
    const { root, parent, git } = fixture(t);
    let count = 0;
    const result = verifyExport(root, {
      parent,
      git,
      run: () => ({
        status: ++count === failedStep ? 7 : 0,
        stdout: '',
        stderr: 'diagnostic\n',
      }),
    });
    assert.equal(result.exitCode, 7);
    assert.equal(count, failedStep);
    const manifest = JSON.parse(
      readFileSync(join(result.evidence, 'export.json')),
    );
    assert.equal(manifest.steps.at(-1).exitCode, 7);
    assert.equal(
      readFileSync(join(result.evidence, `step-${failedStep}.log`), 'utf8'),
      'diagnostic\n',
    );
  });
}

test('spawn error remains recorded and returns failure', (t) => {
  const { root, parent, git } = fixture(t);
  const result = verifyExport(root, {
    parent,
    git,
    run: () => ({
      status: null,
      signal: null,
      error: new Error('missing executable'),
    }),
  });
  assert.equal(result.exitCode, 1);
  assert.equal(
    JSON.parse(readFileSync(join(result.evidence, 'export.json'))).steps[0]
      .error,
    'missing executable',
  );
});

test('export refuses destinations inside source repository', (t) => {
  const { root, git } = fixture(t);
  assert.throws(
    () => verifyExport(root, { parent: root, git }),
    /outside the source repository/,
  );
});

test('changes in copied source fail identity verification before installing dependencies', (t) => {
  const { root, parent, git } = fixture(t);
  const incompleteGit = (command, args) =>
    args.includes('--others') ? 'package.json\0' : git(command, args);
  let started = false;
  assert.throws(
    () =>
      verifyExport(root, {
        parent,
        git: incompleteGit,
        run: () => {
          started = true;
          return { status: 0 };
        },
      }),
    /source identity mismatch/,
  );
  assert.equal(started, false);
});
