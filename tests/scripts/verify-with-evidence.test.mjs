import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
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
import { sourceSnapshot } from '../../scripts/lib/source-snapshot.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'foe-verify-evidence-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'tests'));
  mkdirSync(join(root, 'scripts/lib'));
  copyFileSync(
    new URL('../../scripts/lib/source-snapshot.mjs', import.meta.url),
    join(root, 'scripts/lib/source-snapshot.mjs'),
  );
  for (const script of [
    'verify-with-evidence.mjs',
    'run-tests.mjs',
    'verify.mjs',
  ]) {
    copyFileSync(
      new URL(`../../scripts/${script}`, import.meta.url),
      join(root, 'scripts', script),
    );
  }
  copyFileSync(
    new URL('../../scripts/lib/validation-runner.mjs', import.meta.url),
    join(root, 'scripts/lib/validation-runner.mjs'),
  );
  writeFileSync(
    join(root, 'scripts/lib/validation-stages.mjs'),
    `
    export const profiles = ['docs', 'static', 'full'];
    export function validationStages() { return [
      { id: 'early', layer: 'repo', command: ['node', 'early-gate.mjs'] },
      { id: 'tests', layer: 'behavior', command: ['node', 'scripts/run-tests.mjs'] },
      { id: 'optional', layer: 'runtime', command: ['node', 'missing.mjs'], selected: false },
    ]; }
  `,
  );
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'evidence-fixture',
      private: true,
      scripts: { verify: 'node early-gate.mjs && node scripts/run-tests.mjs' },
    }),
  );
  writeFileSync(
    join(root, 'early-gate.mjs'),
    "console.log('early gate stdout'); console.error('early gate stderr'); process.exitCode = Number(process.env.FIXTURE_GATE_EXIT || 0); if (process.env.FIXTURE_MUTATE) { const fs = await import('node:fs'); fs.writeFileSync('changed.txt', 'changed during validation'); }",
  );
  writeFileSync(
    join(root, 'tests/example.test.mjs'),
    "import test from 'node:test'; import assert from 'node:assert/strict'; test('fixture assertion', () => assert.equal(process.env.FIXTURE_TEST_FAIL, undefined));",
  );
  return root;
}

function run(root, extraEnv = {}) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.CI_TEST_EVIDENCE_DIR;
  return spawnSync(process.execPath, ['scripts/verify-with-evidence.mjs'], {
    cwd: root,
    env: { ...env, ...extraEnv },
    encoding: 'utf8',
    timeout: 30_000,
  });
}

test('early gate failure retains both streams and the exact failure status without JUnit', (t) => {
  const root = fixture(t);
  const result = run(root, { FIXTURE_GATE_EXIT: '7' });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 7, result.stdout + result.stderr);
  const evidence = join(root, 'build/verify-evidence');
  const log = readFileSync(join(evidence, 'verify-console.log'), 'utf8');
  assert.match(log, /early gate stdout/);
  assert.match(log, /early gate stderr/);
  assert.doesNotMatch(log, /fixture assertion/);
  assert.equal(existsSync(join(evidence, 'junit.xml')), false);
});

test('an early failure removes a previous passing JUnit report and replaces its console log', (t) => {
  const root = fixture(t);
  const evidence = join(root, 'build/custom-evidence');
  const env = { CI_TEST_EVIDENCE_DIR: evidence };
  const passing = run(root, env);
  assert.equal(passing.status, 0, passing.stdout + passing.stderr);
  assert.match(
    readFileSync(join(evidence, 'junit.xml'), 'utf8'),
    /fixture assertion/,
  );

  const failing = run(root, { ...env, FIXTURE_GATE_EXIT: '7' });
  assert.equal(failing.status, 7, failing.stdout + failing.stderr);
  assert.equal(existsSync(join(evidence, 'junit.xml')), false);
  assert.doesNotMatch(
    readFileSync(join(evidence, 'verify-console.log'), 'utf8'),
    /fixture assertion/,
  );
});

test('test failure retains its console diagnostics and JUnit failure report', (t) => {
  const root = fixture(t);
  const result = run(root, { FIXTURE_TEST_FAIL: '1' });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const evidence = join(root, 'build/verify-evidence');
  assert.match(
    readFileSync(join(evidence, 'verify-console.log'), 'utf8'),
    /fixture assertion/,
  );
  assert.match(readFileSync(join(evidence, 'junit.xml'), 'utf8'), /<failure\b/);
});

function manifest(root, directory = 'build/verify-evidence') {
  return JSON.parse(
    readFileSync(join(root, directory, 'manifest.json'), 'utf8'),
  );
}

test('manifest identifies successful no-Git exports and replaces stale run results', (t) => {
  const root = fixture(t);
  assert.equal(run(root).status, 0);
  const passing = manifest(root);
  assert.equal(passing.result, 'passed');
  assert.equal(passing.exitCode, 0);
  assert.equal(passing.git.revision, null);
  assert.equal(passing.git.dirty, null);
  assert.deepEqual(passing.command, ['npm', 'run', 'verify']);
  assert.ok(Date.parse(passing.finishedAt) >= Date.parse(passing.startedAt));
  assert.equal(passing.sourceChanged, false);
  assert.equal(run(root, { FIXTURE_GATE_EXIT: '7' }).status, 7);
  const failing = manifest(root);
  assert.notEqual(failing.runId, passing.runId);
  assert.equal(failing.result, 'failed');
  assert.equal(failing.exitCode, 7);
  assert.equal(failing.source.digest, passing.source.digest);
});

test('source identity includes pending files and excludes generated and private files', (t) => {
  const root = fixture(t);
  assert.equal(run(root).status, 0);
  const original = manifest(root).source.digest;
  writeFileSync(join(root, '.env'), 'TOKEN=private');
  writeFileSync(join(root, 'build/generated.txt'), 'generated');
  assert.equal(run(root).status, 0);
  assert.equal(manifest(root).source.digest, original);
  writeFileSync(join(root, 'pending.txt'), 'pending source');
  assert.equal(run(root).status, 0);
  const pending = manifest(root).source;
  assert.notEqual(pending.digest, original);
  assert.ok(pending.files.includes('pending.txt'));
  writeFileSync(join(root, 'pending.txt'), 'changed source');
  assert.equal(run(root).status, 0);
  assert.notEqual(manifest(root).source.digest, pending.digest);
});

test('Git manifest records the revision and uncommitted source', (t) => {
  const root = fixture(t);
  const git = (args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(git(['init', '-q']).status, 0);
  assert.equal(git(['add', '.']).status, 0);
  assert.equal(
    git([
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-qm',
      'fixture',
    ]).status,
    0,
  );
  writeFileSync(join(root, 'pending.txt'), 'uncommitted');
  assert.equal(run(root).status, 0);
  const result = manifest(root);
  assert.equal(result.git.revision, git(['rev-parse', 'HEAD']).stdout.trim());
  assert.equal(result.git.dirty, true);
  assert.ok(result.source.files.includes('pending.txt'));
});

test('Git selection excludes ignored source and matches a no-Git export of pending files', (t) => {
  const root = fixture(t);
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
  writeFileSync(join(root, '.gitignore'), 'ignored.txt\n');
  writeFileSync(join(root, 'pending.txt'), 'pending');
  const before = sourceSnapshot(root);
  writeFileSync(join(root, 'ignored.txt'), 'private ignored data');
  assert.equal(sourceSnapshot(root).digest, before.digest);
  const exported = mkdtempSync(join(tmpdir(), 'foe-source-export-'));
  t.after(() => rmSync(exported, { recursive: true, force: true }));
  for (const file of before.files) {
    const target = join(exported, file);
    mkdirSync(join(target, '..'), { recursive: true });
    cpSync(join(root, file), target);
  }
  assert.equal(sourceSnapshot(exported).digest, before.digest);
  writeFileSync(join(root, 'pending.txt'), 'changed pending');
  assert.notEqual(sourceSnapshot(root).digest, before.digest);
});

function stages(root) {
  return JSON.parse(
    readFileSync(join(root, 'build/verify-evidence/stages.json'), 'utf8'),
  );
}

test('stage reports retain exact failures, block later checks and distinguish unselected checks', (t) => {
  const root = fixture(t);
  const result = run(root, { FIXTURE_GATE_EXIT: '7' });
  assert.equal(result.status, 7);
  const report = stages(root);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.runId, manifest(root).runId);
  assert.equal(report.status, 'failed');
  assert.deepEqual(
    report.cases.map((c) => c.status),
    ['failed', 'blocked', 'skipped'],
  );
  assert.equal(report.cases[0].exitCode, 7);
  assert.equal(report.cases[1].reason, 'prior-stage-failed');
  assert.equal(report.cases[2].reason, 'not-selected');
  const xml = readFileSync(
    join(root, 'build/verify-evidence/gates.junit.xml'),
    'utf8',
  );
  assert.match(xml, /failures="1"/);
  assert.match(xml, /skipped="2"/);
  assert.match(xml, /exit=7/);
  assert.match(xml, /stages\/early.log/);
});

test('source mutation invalidates an otherwise successful captured gate', (t) => {
  const root = fixture(t);
  const result = run(root, { FIXTURE_MUTATE: '1' });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = manifest(root);
  assert.equal(report.exitCode, 0);
  assert.equal(report.sourceChanged, true);
  assert.equal(report.result, 'failed');
  assert.equal(report.reason, 'source-changed');
  assert.equal(stages(root).status, 'failed');
  assert.match(
    readFileSync(join(root, 'build/verify-evidence/gates.junit.xml'), 'utf8'),
    /<failure/,
  );
});

test('real readiness failure retains evidence before dependencies or Git are available', (t) => {
  const root = fixture(t);
  copyFileSync(
    new URL('../../scripts/doctor.mjs', import.meta.url),
    join(root, 'scripts/doctor.mjs'),
  );
  writeFileSync(
    join(root, 'scripts/lib/validation-stages.mjs'),
    `
    export const profiles = ['docs', 'static', 'full'];
    export function validationStages() { return [
      { id: 'readiness', layer: 'environment', command: ['node', 'scripts/doctor.mjs'] },
      { id: 'tests', layer: 'behavior', command: ['node', 'scripts/run-tests.mjs'] }
    ]; }
  `,
  );
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      engines: { node: '>=26.8.2', npm: '>=9.0.0' },
      dependencies: { example: '*' },
    }),
  );
  const result = run(root);
  assert.equal(result.status, 1);
  assert.equal(manifest(root).result, 'failed');
  assert.deepEqual(
    stages(root).cases.map((c) => c.status),
    ['failed', 'blocked'],
  );
  const log = readFileSync(
    join(root, 'build/verify-evidence/stages/readiness.log'),
    'utf8',
  );
  assert.match(log, /Missing dependencies: example/);
  assert.match(log, /Remedy: Run npm ci/);
  assert.match(
    readFileSync(join(root, 'build/verify-evidence/gates.junit.xml'), 'utf8'),
    /<failure/,
  );
  assert.equal(
    existsSync(join(root, 'build/verify-evidence/junit.xml')),
    false,
  );
});
