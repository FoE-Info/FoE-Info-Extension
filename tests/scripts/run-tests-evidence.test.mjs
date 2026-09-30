import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
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

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'foe-test-evidence-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'tests'));
  copyFileSync(
    new URL('../../scripts/run-tests.mjs', import.meta.url),
    join(root, 'scripts/run-tests.mjs'),
  );
  writeFileSync(
    join(root, 'tests/failure.test.mjs'),
    "import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('evidence regression failure', () => assert.equal(1, 2));\n",
  );
  return root;
}

function run(root, args, evidence) {
  const env = { ...process.env };
  delete env.CI_TEST_EVIDENCE_DIR;
  // A nested Node test runner must not inherit its parent's runner context.
  delete env.NODE_TEST_CONTEXT;
  if (evidence) env.CI_TEST_EVIDENCE_DIR = 'build/evidence';
  return spawnSync(process.execPath, ['scripts/run-tests.mjs', ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 30000,
  });
}

for (const args of [
  ['--test-reporter=dot', '--test-reporter-destination=ignored.txt'],
  ['--test-reporter', 'dot', '--test-reporter-destination', 'ignored.txt'],
]) {
  test(`evidence survives test failure with caller reporters: ${args.join(' ')}`, (t) => {
    const root = fixture(t);
    const result = run(root, args, true);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /evidence regression failure/);
    const xml = readFileSync(join(root, 'build/evidence/junit.xml'), 'utf8');
    assert.match(xml, /<failure\b/);
    assert.match(xml, /name="evidence regression failure"/);
    assert.equal(existsSync(join(root, 'ignored.txt')), false);
  });
}

test('without evidence mode the caller reporter writes its requested destination', (t) => {
  const root = fixture(t);
  const result = run(
    root,
    ['--test-reporter=junit', '--test-reporter-destination=caller.xml'],
    false,
  );
  assert.equal(result.status, 1, result.stderr);
  assert.match(readFileSync(join(root, 'caller.xml'), 'utf8'), /<failure\b/);
  assert.equal(existsSync(join(root, 'build/evidence/junit.xml')), false);
});

test('test discovery includes shared harness cases alongside application cases', (t) => {
  const root = fixture(t);
  mkdirSync(join(root, '.agents/tests'), { recursive: true });
  writeFileSync(
    join(root, '.agents/tests/harness.test.mjs'),
    "import test from 'node:test'; test('shared harness fixture', () => {});\n",
  );
  const result = run(root, [], true);
  assert.equal(result.status, 1, result.stderr);
  const xml = readFileSync(join(root, 'build/evidence/junit.xml'), 'utf8');
  assert.match(xml, /shared harness fixture/);
  assert.match(xml, /evidence regression failure/);
});
