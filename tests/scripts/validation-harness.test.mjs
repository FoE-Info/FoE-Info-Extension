import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { meetsMinimum, readiness } from '../../scripts/doctor.mjs';
import {
  gatesJUnit,
  runValidation,
} from '../../scripts/lib/validation-runner.mjs';
import { validationStages } from '../../scripts/lib/validation-stages.mjs';
import { parseProfile } from '../../scripts/verify.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'foe-validation-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      engines: { node: '>=26.8.2', npm: '>=9.0.0' },
      dependencies: { example: '*' },
    }),
  );
  writeFileSync(join(root, 'package-lock.json'), '{}');
  mkdirSync(join(root, 'node_modules/example'), { recursive: true });
  writeFileSync(
    join(root, 'node_modules/example/index.js'),
    'module.exports = {};',
  );
  return root;
}

const readyCommand = (name) => ({
  status: 0,
  stdout: name === 'npm' || name === 'npm.cmd' ? '11.19.1\n' : 'available\n',
});

test('readiness works with built-ins and does not mutate the fixture', (t) => {
  const root = fixture(t);
  const before = readFileSync(join(root, 'package.json'), 'utf8');
  const calls = [];
  const report = readiness({
    root,
    nodeVersion: '26.8.2',
    run: (name, args) => {
      calls.push([name, ...args]);
      return readyCommand(name);
    },
  });
  assert.equal(report.status, 'passed');
  assert.deepEqual(calls, [
    [process.platform === 'win32' ? 'npm.cmd' : 'npm', '--version'],
    ['git', 'rev-parse', '--show-toplevel'],
    ['git', 'ls-files', '--cached'],
    ['bash', '--version'],
  ]);
  assert.equal(readFileSync(join(root, 'package.json'), 'utf8'), before);
});

test('missing prerequisites name remedies and unavailable optional probes are recorded', (t) => {
  const root = fixture(t);
  rmSync(join(root, 'node_modules'), { recursive: true });
  rmSync(join(root, 'package-lock.json'));
  const report = readiness({
    root,
    nodeVersion: '26.8.1',
    probes: ['browser'],
    run: (name) =>
      name === process.execPath ? { status: 1 } : readyCommand(name),
  });
  assert.equal(report.status, 'failed');
  for (const id of ['node', 'dependencies', 'lockfile']) {
    const item = report.cases.find((c) => c.id === id);
    assert.equal(item.status, 'failed');
    assert.ok(item.remedy);
  }
  assert.equal(report.cases.at(-1).status, 'skipped');
  assert.equal(report.cases.at(-1).reason, 'browser-unavailable');
  const optional = readiness({
    root: fixture(t),
    nodeVersion: '26.8.2',
    probes: ['browser'],
    run: (name) =>
      name === process.execPath ?
        { error: new Error('missing browser') }
      : readyCommand(name),
  });
  assert.equal(optional.status, 'passed');
  assert.equal(optional.cases.at(-1).status, 'skipped');
});

test('version floors compare all components and invalid profiles fail closed', () => {
  assert.equal(meetsMinimum('26.8.1', '>=26.8.2'), false);
  assert.equal(meetsMinimum('26.9.0', '>=26.8.2'), true);
  assert.equal(meetsMinimum('27.0.0', '>=26.8.2'), true);
  assert.equal(meetsMinimum('25.99.99', '>=26.8.2'), false);
  assert.throws(() => meetsMinimum('26.8.2', '^26'), /Unsupported/);
  assert.throws(() => parseProfile(['--profile', 'unknown']), /Use/);
  assert.throws(() => readiness({ probes: ['unknown'] }), /Unknown/);
});

test('full profile preserves gate order and lightweight profiles exclude builds/tests', () => {
  const full = validationStages('full');
  assert.deepEqual(
    full.map((c) => c.id),
    [
      'readiness',
      'version',
      'references',
      'format',
      'lint',
      'types',
      'architecture',
      'rpc-contract',
      'i18n',
      'tests',
      'coverage',
      'build-dev',
      'bundle-budget',
    ],
  );
  assert.ok(full.every((c) => c.selected));
  assert.deepEqual(
    validationStages('docs')
      .filter((c) => c.selected)
      .map((c) => c.id),
    ['readiness', 'version', 'references', 'format'],
  );
  assert.deepEqual(
    validationStages('static')
      .filter((c) => c.selected)
      .map((c) => c.id),
    full.slice(0, 9).map((c) => c.id),
  );
});

test('spawn failures produce stage evidence and block subsequent checks', async (t) => {
  const root = fixture(t);
  const evidenceDir = join(root, 'build/evidence');
  const result = await runValidation({
    root,
    evidenceDir,
    stages: [
      {
        id: 'missing',
        layer: 'environment',
        command: [join(root, 'missing-tool')],
      },
      {
        id: 'later',
        layer: 'behavior',
        command: ['node', '-e', "throw new Error('must not run')"],
      },
    ],
    output: () => {},
  });
  assert.equal(result.exitCode, 1);
  assert.equal(result.report.cases[0].exitCode, null);
  assert.match(result.report.cases[0].reason, /ENOENT/);
  assert.equal(result.report.cases[1].status, 'blocked');
  assert.match(
    readFileSync(join(evidenceDir, 'stages/missing.log'), 'utf8'),
    /Could not start/,
  );
  assert.equal(
    JSON.parse(readFileSync(join(evidenceDir, 'stages.json'), 'utf8')).status,
    'failed',
  );
});

test('JUnit escapes Unicode/special diagnostics and incomplete cases cannot appear passed', () => {
  const xml = gatesJUnit({
    profile: 'full',
    cases: [
      {
        id: 'unicode',
        layer: 'repo',
        command: ['node', 'α<&"\u0001'],
        status: 'failed',
        reason: 'failure < & "',
        exitCode: 7,
        signal: null,
        artifacts: ['stages/unicode.log'],
      },
      {
        id: 'pending',
        layer: 'repo',
        command: ['node'],
        status: 'pending',
        reason: null,
        exitCode: null,
        signal: null,
        artifacts: [],
      },
    ],
  });
  assert.match(xml, /α&lt;&amp;&quot;/);
  assert.equal(xml.includes(String.fromCharCode(1)), false);
  assert.match(xml, /<skipped message="pending"/);
  assert.match(xml, /failures="1" skipped="1"/);
});

test(
  'termination cancels a stage, kills its process group and retains JSON/JUnit',
  {
    skip:
      process.platform === 'win32' ? 'POSIX process-group regression' : false,
  },
  async (t) => {
    const root = fixture(t);
    const evidenceDir = join(root, 'evidence');
    const runner = new URL(
      '../../scripts/lib/validation-runner.mjs',
      import.meta.url,
    ).href;
    const script = join(root, 'signal.mjs');
    writeFileSync(
      script,
      `import { runValidation } from ${JSON.stringify(runner)};
    const result = await runValidation({ root: ${JSON.stringify(root)}, evidenceDir: ${JSON.stringify(evidenceDir)}, stages: [
      { id: 'long', layer: 'repo', command: ['node', '-e', 'console.log("READY"); setInterval(() => {}, 1000)'] },
      { id: 'later', layer: 'repo', command: ['node', '-e', 'process.exit(0)'] }
    ] }); process.exitCode = result.exitCode;`,
    );
    const child = spawn(process.execPath, [script], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    t.after(() => child.kill('SIGKILL'));
    const result = await new Promise((resolve, reject) => {
      let stdout = '';
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('signal fixture timed out'));
      }, 10_000);
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
        if (stdout.includes('READY')) child.kill('SIGTERM');
      });
      child.on('error', reject);
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve(code);
      });
    });
    assert.equal(result, 143);
    const report = JSON.parse(
      readFileSync(join(evidenceDir, 'stages.json'), 'utf8'),
    );
    assert.equal(report.status, 'cancelled');
    assert.equal(report.cases[0].status, 'cancelled');
    assert.equal(report.cases[0].signal, 'SIGTERM');
    assert.equal(report.cases[1].status, 'blocked');
    assert.match(
      readFileSync(join(evidenceDir, 'gates.junit.xml'), 'utf8'),
      /<failure/,
    );
  },
);
