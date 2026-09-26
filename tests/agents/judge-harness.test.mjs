import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const AGENTS_DIR = path.join(PROJECT_ROOT, '.agents');
const HARNESS = path.join(AGENTS_DIR, 'scripts', 'judge-harness.mjs');
const DECISION_LOG = path.join(AGENTS_DIR, 'scripts', 'decision-log.mjs');

// `.agents/` is git-ignored (see .gitignore), so this file cannot load on
// a fresh clone. The imports below must stay behind SKIP: node:test reports a
// top-level throw as a file failure, not as a skip, so guarding `test()` alone
// would not save the run.
const SKIP =
  fs.existsSync(HARNESS) ? false : (
    '.agents/scripts/ is not present (git-ignored)'
  );

const H = SKIP ? null : await import(HARNESS);
const D = SKIP ? null : await import(DECISION_LOG);

/** A throwaway git repo holding one committed file, so diffs are real. */
function seedRepo({ name = 'a.js', content = 'x\n' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-harness-'));
  const git = (cmd) => H.sh(cmd, dir);
  git('git init -q');
  git(`git -c user.email=t@e -c user.name=t commit -q --allow-empty -m seed`);
  fs.writeFileSync(path.join(dir, name), content);
  git('git add -A');
  git('git -c user.email=t@e -c user.name=t commit -q -m add');
  return { dir, git, file: name };
}

test(
  'sh() returns stdout when the command exits non-zero',
  { skip: SKIP },
  () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-sh-'));
    // `git diff --no-index` exits 1 whenever the files differ, which is every
    // untracked path. Treating that as failure silently empties the evidence.
    assert.equal(H.sh('echo hi; exit 3', dir), 'hi\n');
    assert.equal(H.sh('echo hi', dir), 'hi\n');
  },
);

test('sh() returns an empty string when nothing ran', { skip: SKIP }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-sh-'));
  assert.equal(H.sh('exit 1', dir), '');
  assert.equal(H.sh('echo hi', path.join(dir, 'does-not-exist')), '');
});

test(
  'evidenceFor() separates added code from removed code',
  { skip: SKIP },
  (t) => {
    // H.bind() is module-global; without this the next test inherits a
    // throwaway (and by then deleted) repo as its root.
    t.after(() => H.bind(PROJECT_ROOT));
    const { dir, file } = seedRepo({
      content: 'const v = Math.round(1.5);\n',
    });
    fs.writeFileSync(
      path.join(dir, file),
      'const v = new BigNumber(1.5).integerValue(BigNumber.ROUND_HALF_UP);\n',
    );
    H.bind(dir);
    const row = H.statusRows().find((r) => r.path === file);
    assert.ok(row, 'expected the file to show up in git status');

    const e = H.evidenceFor(row);
    assert.equal(e.added_lines, 1);
    assert.match(e.added_code, /new BigNumber/);
    // The deleted `Math.round` is the fix, not the defect: it must never reach a
    // rule question, or the judge reports remediations as violations.
    assert.match(e.removed_code, /Math\.round/);
    assert.doesNotMatch(e.added_code, /Math\.round/);
    assert.equal(e.state, 'MODIFIED tracked file');
  },
);

test(
  'evidenceFor() reads an untracked file as fully added',
  { skip: SKIP },
  (t) => {
    t.after(() => H.bind(PROJECT_ROOT));
    const { dir } = seedRepo();
    fs.writeFileSync(path.join(dir, 'new.js'), 'const a = 1;\nconst b = 2;\n');
    H.bind(dir);
    const e = H.evidenceFor({ path: 'new.js', untracked: true });
    assert.equal(e.state, 'UNTRACKED new file');
    assert.equal(e.added_lines, 2);
    assert.equal(e.removed_lines, 0);
  },
);

test(
  'ruleStates() drops paths whose diff adds nothing',
  { skip: SKIP },
  (t) => {
    t.after(() => H.bind(PROJECT_ROOT));
    const { dir, git, file } = seedRepo({ content: 'const a = 1;\n' });
    git('git config core.fileMode true');
    git('chmod +x ' + file); // mode-only change: shows in git status, adds no lines
    H.bind(dir);
    const row = H.statusRows().find((r) => r.path === file);
    assert.ok(row, 'a mode change must still show up in git status');

    const { states, skipped } = H.ruleStates([file]);
    assert.deepEqual(states, [], 'a mode-only change must not be judged');
    assert.deepEqual(skipped, [file]);
  },
);

test(
  'ruleStates() keeps added code and never ships the unified diff',
  { skip: SKIP },
  (t) => {
    t.after(() => H.bind(PROJECT_ROOT));
    const { dir, file } = seedRepo({ content: 'const v = Math.round(1.5);\n' });
    fs.writeFileSync(path.join(dir, file), 'const v = 2;\n');
    H.bind(dir);

    const { states, skipped } = H.ruleStates([file]);
    assert.deepEqual(skipped, []);
    assert.equal(states.length, 1);
    assert.equal(states[0].added_count, 1);
    assert.match(states[0].ADDED_CODE, /const v = 2/);
    assert.match(states[0].REMOVED_CODE, /Math\.round/);
    // The raw diff renders + and - identically; shipping it re-breaks the rule.
    assert.equal('diff' in states[0], false);
    assert.equal(states[0].diff_head, undefined);
  },
);

test(
  'every rule is phrased so true always means violated',
  { skip: SKIP },
  () => {
    const ids = Object.keys(H.RULES);
    assert.ok(
      ids.length >= 9,
      `expected the domain rule bank, got ${ids.length}`,
    );
    const q = H.domainQuestions();
    for (const id of ids) {
      assert.equal(H.RULES[id].id, id);
      assert.equal(H.RULES[id].inverted, true, `${id} is not inverted`);
      assert.equal(q[id].type, 'bool', `${id} question is not a bool`);
      assert.ok(
        q[id].instructions.includes('ADDED CODE'),
        `${id} lacks the added-code guard`,
      );
    }
    assert.throws(() => H.domainQuestions(['notARule']), /unknown rule/);
  },
);

test(
  'violations() honors the threshold and sorts by confidence',
  { skip: SKIP },
  () => {
    const answers = {
      0: { nativeFloats: { bool: 0.9 }, i18nBinding: { bool: 0.2 } },
      1: { nativeFloats: { bool: 0.4 }, i18nBinding: { bool: 0.7 } },
    };
    const v = H.violations(answers, ['nativeFloats', 'i18nBinding']);
    assert.deepEqual(
      v.map((x) => [x.index, x.rule, x.p]),
      [
        [0, 'nativeFloats', 0.9],
        [1, 'i18nBinding', 0.7],
      ],
    );
    assert.equal(H.violations(answers, ['nativeFloats'], 0.95).length, 0);
  },
);

test('decision log supersedes a re-recorded id', { skip: SKIP }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-decisions-'));
  D.bind(dir, dir);
  D.record({
    id: 'x',
    kind: 'domain-rule',
    subject: 'a.js',
    verdict: 'old',
    confidence: 0.5,
  });
  D.record({
    id: 'x',
    kind: 'domain-rule',
    subject: 'a.js',
    verdict: 'new',
    confidence: 0.9,
  });
  D.record({
    id: 'y',
    kind: 'commit-plan',
    subject: 'tree',
    verdict: 'split',
    confidence: 0.7,
  });

  const all = D.recall();
  assert.equal(all.length, 2, 'the superseded row must be dropped');
  assert.equal(all.find((d) => d.id === 'x').verdict, 'new');

  assert.deepEqual(
    D.recall({ kind: 'commit-plan' }).map((d) => d.id),
    ['y'],
  );
  const brief = D.brief();
  assert.match(brief, /new/);
  assert.doesNotMatch(brief, /old/);
  assert.ok(fs.existsSync(D.paths().jsonl));
  assert.match(fs.readFileSync(D.paths().md, 'utf8'), /new/);
});

// ---- whole-source review ----------------------------------------------------

test(
  'walkJs recurses, sorts, and skips dotdirs, node_modules and other extensions',
  { skip: SKIP },
  () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-walk-'));
    for (const rel of [
      'b.js',
      'a.js',
      'deep/nested/c.js',
      'deep/notes.md',
      '.hidden/secret.js',
      'node_modules/pkg/index.js',
    ]) {
      fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), 'x\n');
    }

    assert.deepEqual(H.walkJs('.', { root: dir }), [
      'a.js',
      'b.js',
      path.join('deep', 'nested', 'c.js'),
    ]);
    assert.deepEqual(
      H.walkJs('.', { root: dir, exts: ['.js', '.md'] }),
      [
        'a.js',
        'b.js',
        path.join('deep', 'nested', 'c.js'),
        path.join('deep', 'notes.md'),
      ],
      'exts must widen the match, and the result must stay sorted',
    );
  },
);

test('a scoped rule only applies inside its own layer', { skip: SKIP }, () => {
  // calcPurity is only true of src/js/calc/. A DOM reference in ui/ is that
  // layer working, so an unscoped whole-tree run reported it as a breach.
  assert.equal(H.RULES.calcPurity.scope, 'src/js/calc/');
  assert.equal(
    H.ruleApplies('calcPurity', 'src/js/calc/prod/ProductionCalculator.js'),
    true,
  );
  assert.equal(H.ruleApplies('calcPurity', 'src/js/ui/gbgPanel.js'), false);
  assert.equal(
    H.ruleApplies('calcPurity', 'src/js/msg/StartupService.js'),
    false,
  );
  for (const id of [
    'i18nBinding',
    'nativeFloats',
    'passiveOnly',
    'staticMetadata',
  ]) {
    assert.equal(
      H.ruleApplies(id, 'src/js/ui/gbgPanel.js'),
      true,
      `${id} must apply everywhere`,
    );
  }
  assert.throws(() => H.domainQuestions(['notARule']), /unknown rule/);
});

test('every scoped rule names a real directory', { skip: SKIP }, () => {
  // A scope that matches nothing silently disables a rule for the whole repo.
  for (const id of Object.keys(H.RULES)) {
    const scope = H.RULES[id].scope;
    if (!scope) continue;
    assert.ok(
      fs.existsSync(path.join(PROJECT_ROOT, scope)),
      `${id} scope ${scope} does not exist`,
    );
  }
});

test(
  'sourceStates covers every line and never splits one',
  { skip: SKIP },
  () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-source-'));
    const body = Array.from(
      { length: 400 },
      (_, i) => `const v${i} = ${i};`,
    ).join('\n');
    fs.writeFileSync(path.join(dir, 'big.js'), body + '\n');

    const { states, skipped } = H.sourceStates(['big.js'], {
      chars: 500,
      root: dir,
    });
    assert.deepEqual(skipped, []);
    assert.ok(
      states.length > 1,
      'a 400-line file must split into several windows',
    );

    const rejoined = states.map((s) => s.ADDED_CODE).join('\n');
    assert.equal(
      rejoined,
      body,
      'windows must rejoin to the exact file content',
    );

    for (const s of states) {
      const [a, b] = s.lines;
      assert.ok(b >= a, 'line range must be ordered');
      assert.equal(
        s.ADDED_CODE.split('\n').length,
        b - a + 1,
        'window size must match its line range',
      );
      assert.equal(
        s.ADDED_CODE.split('\n')[0],
        body.split('\n')[a - 1],
        'window must start on the line it claims',
      );
      assert.match(s.state, /SOURCE WINDOW/);
    }
    assert.equal(
      states[1].lines[0],
      states[0].lines[1] + 1,
      'windows must be contiguous, not overlapping',
    );
  },
);

test(
  'sourceStates skips unreadable and empty files instead of judging nothing',
  { skip: SKIP },
  () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-source-'));
    fs.writeFileSync(path.join(dir, 'empty.js'), '   \n\n');
    const { states, skipped } = H.sourceStates(['empty.js', 'nope.js'], {
      root: dir,
    });
    assert.deepEqual(states, []);
    assert.deepEqual(skipped, ['empty.js', 'nope.js']);
  },
);

test('no diff phrasing survives source mode', { skip: SKIP }, () => {
  // A judge asked "does this diff..." about a source window answers FALSE for
  // everything. That is a silent total false negative, so this fails loudly.
  const q = H.sourceQuestions();
  for (const id of Object.keys(H.RULES)) {
    const text = q[id].instructions;
    assert.doesNotMatch(
      text,
      /\bdiff\b/i,
      `${id} still says "diff" in source mode`,
    );
    assert.doesNotMatch(
      text,
      /ADDED CODE/,
      `${id} still says "ADDED CODE" in source mode`,
    );
    assert.doesNotMatch(
      text,
      /REMOVED CODE/,
      `${id} still says "REMOVED CODE" in source mode`,
    );
    assert.ok(
      text.includes(H.RULES[id].text),
      `${id} lost its invariant statement`,
    );
  }
});

test(
  'both question sets ship the rule ask, so the false-positive guards reach the judge',
  { skip: SKIP },
  () => {
    // The `ask` strings carry the exclusions ("answer FALSE for Math.max on
    // indices", "a logger call does not count"). If they never reach the judge
    // the audit runs on the bare invariant alone and over-reports.
    for (const id of Object.keys(H.RULES)) {
      assert.ok(
        H.domainQuestions()[id].instructions.includes(H.RULES[id].ask),
        `diff: ${id} question does not carry its rule ask`,
      );
      assert.ok(
        H.sourceQuestions()[id].instructions.includes(
          H.toSourceWording(H.RULES[id].ask),
        ),
        `source: ${id} question does not carry its rule ask`,
      );
    }
  },
);
