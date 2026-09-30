import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  assess,
  collect,
  main,
  validateBaseline,
} from '../../scripts/quality/repo-contracts.mjs';

test('collects ESM, CommonJS, dynamic imports and reexports without comment matches', () => {
  const findings = collect(
    `// require('../ui/fake.js')
    import x from '../ui/x.js';
    export * from '../ui/x.js';
    export { y } from '../ui/y.js';
    require('../fn/helper.js');
    import('../ui/z.js');`,
    'src/js/calc/example.js',
  );
  assert.equal(findings.length, 4);
  assert.equal(
    findings.find((item) => item.detail.endsWith('/x.js')).current,
    2,
  );
});

test('normalized paths cannot bypass dependency direction; UI can import calculators', () => {
  assert.equal(
    collect(`require('../calc/../ui/x.js')`, 'src/js/calc/example.js').length,
    1,
  );
  assert.deepEqual(
    collect(`require('../calc/x.js')`, 'src/js/ui/example.js'),
    [],
  );
});

test('detects direct browser access in domain layers without matching strings', () => {
  assert.equal(
    collect(
      `document.createElement('div'); window.location; const text = 'document.body';`,
      'src/js/msg/example.js',
    ).length,
    2,
  );
});

test('allowances freeze occurrences and cannot allow another dependency', () => {
  const findings = collect(
    `require('../ui/x.js'); require('../ui/x.js'); require('../ui/y.js');`,
    'src/js/msg/example.js',
  );
  const assessed = assess(findings, [{ ...findings[0], maximum: 1 }]);
  assert.ok(assessed.every((item) => item.status === 'regression'));
  assert.equal(
    assess([findings[0]], [{ ...findings[0], maximum: 2 }])[0].status,
    'debt',
  );
});

test('baseline schema rejects missing repayment, duplicate entries and invalid counts', () => {
  const entry = {
    path: 'src/js/msg/x.js',
    rule: 'dependency-direction',
    detail: 'src/js/ui/x.js',
    maximum: 1,
    owner: 'services',
    reason: 'legacy',
    repayment: 'inject callback',
  };
  validateBaseline({ version: 1, entries: [entry] });
  assert.throws(() =>
    validateBaseline({ version: 1, entries: [{ ...entry, repayment: '' }] }),
  );
  assert.throws(() =>
    validateBaseline({ version: 1, entries: [entry, entry] }),
  );
  assert.throws(() =>
    validateBaseline({ version: 1, entries: [{ ...entry, maximum: -1 }] }),
  );
});

test('audit fails on repaid debt; diff includes untracked additions and honors base', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-contracts-'));
  const previous = process.cwd();
  const log = console.log;
  try {
    fs.mkdirSync(path.join(root, 'src/js/calc'), { recursive: true });
    fs.mkdirSync(path.join(root, 'scripts/quality'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'scripts/quality/repo-contracts-baseline.json'),
      JSON.stringify({ version: 1, entries: [] }),
    );
    execFileSync('git', ['init', '-q', root]);
    execFileSync('git', [
      '-C',
      root,
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '--allow-empty',
      '-qm',
      'initial',
    ]);
    process.chdir(root);
    console.log = () => {};
    fs.writeFileSync('src/js/calc/new.js', "require('../ui/x.js');");
    assert.equal(main(['--mode', 'diff']), 1);
    assert.equal(main(['--mode', 'audit']), 1);
    fs.writeFileSync(
      'scripts/quality/repo-contracts-baseline.json',
      JSON.stringify({
        version: 1,
        entries: [
          {
            path: 'src/js/calc/new.js',
            rule: 'dependency-direction',
            detail: 'src/js/ui/x.js',
            maximum: 1,
            owner: 'calc',
            reason: 'legacy',
            repayment: 'inject',
          },
        ],
      }),
    );
    assert.equal(main(['--mode', 'audit']), 0);
    execFileSync('git', ['add', '.']);
    execFileSync('git', [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-qm',
      'baseline',
    ]);
    const policy = JSON.parse(
      fs.readFileSync('scripts/quality/repo-contracts-baseline.json', 'utf8'),
    );
    policy.entries[0].maximum = 2;
    fs.writeFileSync(
      'scripts/quality/repo-contracts-baseline.json',
      JSON.stringify(policy),
    );
    assert.equal(
      main(['--mode', 'diff']),
      1,
      'baseline-only edit checks unchanged source',
    );
    let report;
    console.log = (value) => {
      report = JSON.parse(value);
    };
    main(['--mode', 'diff', '--base', 'HEAD', '--json']);
    assert.equal(report.fullScan, true);
    assert.equal(report.base, 'HEAD');
    assert.match(report.sourceCommand, /HEAD/);
    assert.equal(report.stale.length, 1);
    policy.entries[0].maximum = 1;
    fs.writeFileSync(
      'scripts/quality/repo-contracts-baseline.json',
      JSON.stringify(policy),
    );
    fs.writeFileSync(
      'src/js/calc/new.js',
      "require('../ui/x.js'); require('../ui/x.js');",
    );
    main(['--mode', 'audit', '--json']);
    assert.equal(report.findings[0].status, 'regression');
    assert.equal(report.stale.length, 0, 'increased debt is not repaid debt');
    console.log = () => {};
    fs.writeFileSync('src/js/calc/new.js', 'const x = 1;');
    assert.equal(main(['--mode', 'audit']), 1);
    assert.throws(() => main(['--mode', 'other']));
  } finally {
    console.log = log;
    process.chdir(previous);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('policy edits scan unchanged runtime modules of every supported JS extension', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-contracts-policy-'));
  const previous = process.cwd();
  const log = console.log;
  try {
    fs.mkdirSync(path.join(root, 'src/js/calc'), { recursive: true });
    fs.mkdirSync(path.join(root, 'scripts/quality'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'scripts/quality/repo-contracts-baseline.json'),
      JSON.stringify({ version: 1, entries: [] }),
    );
    fs.writeFileSync(
      path.join(root, 'scripts/quality/repo-contracts.mjs'),
      '// policy',
    );
    for (const extension of ['js', 'mjs', 'cjs'])
      fs.writeFileSync(
        path.join(root, `src/js/calc/example.${extension}`),
        "require('../ui/x.js');",
      );
    execFileSync('git', ['init', '-q', root]);
    process.chdir(root);
    execFileSync('git', ['add', '.']);
    execFileSync('git', [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-qm',
      'initial',
    ]);
    let report;
    console.log = (value) => {
      report = JSON.parse(value);
    };
    assert.equal(main(['--mode', 'diff', '--json']), 0);
    assert.equal(report.files, 0);
    fs.appendFileSync(
      'scripts/quality/repo-contracts.mjs',
      '\n// changed policy',
    );
    assert.equal(main(['--mode', 'diff', '--json']), 1);
    assert.equal(report.fullScan, true);
    assert.equal(report.findings.length, 3);
    execFileSync('git', [
      'rm',
      '--cached',
      '-q',
      'scripts/quality/repo-contracts.mjs',
    ]);
    execFileSync('git', [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-qm',
      'untrack policy',
    ]);
    assert.equal(main(['--mode', 'diff', '--json']), 1);
    assert.equal(report.fullScan, true, 'untracked policy triggers full scan');
    fs.writeFileSync('src/js/calc/example.mjs', 'import {');
    assert.throws(
      () => main(['--mode', 'audit']),
      /src\/js\/calc\/example\.mjs: contract scan failed/,
    );
  } finally {
    console.log = log;
    process.chdir(previous);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('baseline rejects null policy and null entries with actionable errors', () => {
  assert.throws(() => validateBaseline(null), /Baseline requires/);
  assert.throws(
    () => validateBaseline({ version: 1, entries: [null] }),
    /entries must be objects/,
  );
});
