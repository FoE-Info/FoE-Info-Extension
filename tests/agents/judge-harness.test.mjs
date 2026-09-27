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
    const ids = H.JUDGED_RULE_IDS;
    assert.ok(
      ids.length >= 9,
      `expected the domain rule bank, got ${ids.length}`,
    );
    // Every rule, judged or not, must be self-describing: a rule whose origin
    // is unrecorded is indistinguishable from one invented at the call site.
    for (const [id, r] of Object.entries(H.RULES)) {
      assert.equal(r.id, id);
      assert.ok(
        ['judged', 'deterministic'].includes(r.kind),
        `${id} has no kind`,
      );
      assert.ok(r.src, `${id} does not record what it was transcribed from`);
    }
    const q = H.domainQuestions();
    for (const id of ids) {
      assert.equal(H.RULES[id].inverted, true, `${id} is not inverted`);
      assert.equal(q[id].type, 'bool', `${id} question is not a bool`);
      assert.ok(
        q[id].instructions.includes('ADDED CODE'),
        `${id} lacks the added-code guard`,
      );
    }
    assert.throws(() => H.domainQuestions(['notARule']), /unknown rule/);
    // A deterministic rule has no `ask`, so letting one into the judge would
    // ship a question whose instruction ends in the string "undefined".
    for (const id of H.DETERMINISTIC_RULE_IDS) {
      assert.equal(
        H.RULES[id].inverted,
        undefined,
        `${id} is deterministic and must not claim judge polarity`,
      );
      assert.throws(
        () => H.domainQuestions([id]),
        /deterministic/,
        `${id} was allowed into the judge`,
      );
      assert.throws(() => H.sourceQuestions([id]), /deterministic/);
    }
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

test(
  'decision log records no judge model when none was observed',
  { skip: SKIP },
  () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-provenance-'));
    D.bind(dir, dir);
    const rec = D.record({
      id: 'unobserved',
      kind: 'triage',
      subject: 'a.js',
      verdict: 'something',
      confidence: 0.9,
    });

    // The old default wrote "openrouter/typesafe/jev-1.13" for every row, so a
    // log read as calibrated Jev output even when the judge role had fallen
    // back to a chat model. An unobserved model must stay unobserved.
    assert.equal(rec.model, null);
    assert.equal(D.recall().find((d) => d.id === 'unobserved').model, null);
    assert.match(
      fs.readFileSync(D.paths().md, 'utf8'),
      /judged by: _unverified/,
      'the roll-up must show the gap rather than hide it',
    );
    assert.match(D.brief(), /judge model unverified/);
  },
);

test(
  'decision log persists the observed judge model verbatim',
  { skip: SKIP },
  () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judge-provenance-'));
    D.bind(dir, dir);
    const observed = 'openrouter/typesafe/jev-1.13-20260917';
    D.record({
      id: 'observed',
      kind: 'triage',
      subject: 'a.js',
      verdict: 'yes',
      confidence: 0.95,
      model: observed,
    });

    assert.equal(D.recall().find((d) => d.id === 'observed').model, observed);
    const md = fs.readFileSync(D.paths().md, 'utf8');
    assert.match(md, /judged by: `openrouter\/typesafe\/jev-1\.13-20260917`/);
    assert.doesNotMatch(D.brief(), /judge model unverified/);
  },
);

test(
  'judgeAll reports the model the runtime served, not the one configured',
  { skip: SKIP },
  async () => {
    // judgeAll drains items carrying {key, answers, error, model}. Dropping
    // `model` is what let the log name a model nobody observed.
    const src = fs.readFileSync(HARNESS, 'utf8');
    assert.match(src, /if \(item\.model\) served\.add\(item\.model\)/);
    assert.match(src, /__provenance/);
    assert.match(src, /export const judgeProvenance/);
    assert.doesNotMatch(
      src,
      /out\[k\] = item\.answers \?\? \{ __error: String\(item\.error\) \};\s*\n\s*\}\s*\n\s*if/,
      'the drain loop must not discard the model field again',
    );
  },
);

test(
  'audit entrypoints surface provenance at the top level',
  { skip: SKIP },
  () => {
    // judgeAll() puts the observed model on answers.__provenance, but the
    // audit wrappers return their own object; without an explicit field the
    // observation is one level down where nobody looks.
    const src = fs.readFileSync(HARNESS, 'utf8');
    // Anchor on each exported audit function and read to its closing brace, so
    // a nested object literal inside the return cannot truncate the match.
    for (const fn of ['auditRules', 'auditSource']) {
      const start = src.indexOf(`export async function ${fn}(`);
      assert.notEqual(start, -1, `${fn} must exist`);
      const body = src.slice(start, src.indexOf('\n}', start));
      assert.match(
        body,
        /return \{[^\n]*provenance: answers\.__provenance/,
        `${fn}() must expose provenance at the top level of its result`,
      );
    }
  },
);

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

test('every scoped rule names a real path', { skip: SKIP }, () => {
  // A scope that matches nothing silently disables a rule for the whole repo.
  for (const id of Object.keys(H.RULES)) {
    const { scope, repos } = H.RULES[id];
    if (!scope) continue;
    // A rule scoped to a repo this checkout is not is not this test's business.
    if (repos && !repos.includes(path.basename(PROJECT_ROOT))) continue;
    for (const one of Array.isArray(scope) ? scope : [scope]) {
      // A scope may name a directory (`src/js/calc/`) or a file prefix
      // (`src/js/utils/i18n` -> i18n.js). Either way it must resolve to
      // something real, or the rule is silently disabled for the whole repo.
      const abs = path.join(PROJECT_ROOT, one);
      assert.ok(
        fs.existsSync(abs) || fs.existsSync(`${abs}.js`),
        `${id} scope ${one} does not exist`,
      );
    }
  }
});

test(
  'every rule declares which repositories it holds to',
  { skip: SKIP },
  () => {
    // Agent config is per-repository, so a rule transcribed from a rule file is
    // local to the repo owning that file unless it is deliberately promoted to a
    // domain-wide invariant. Measured 2026-09-27: leaving `repos` off the three
    // rules added from this repo's rule files produced 137 findings across 50
    // windows of FoE-Info-Extension-original, a 274% rate, because v1 predates
    // them — the judge was right about the code and wrong about the breach.
    const known = new Set([...H.DOMAIN_REPOS]);
    for (const [id, r] of Object.entries(H.RULES)) {
      assert.ok(
        Array.isArray(r.repos) && r.repos.length > 0,
        `${id} does not declare repos`,
      );
      for (const repo of r.repos) {
        assert.ok(known.has(repo), `${id} names unknown repo ${repo}`);
      }
    }
    // Forge-Hammer is an independent peer tool, not a fork: it shares the
    // BigNumber and dynamic-metadata principles but not passive observation,
    // because js/inject.js injects into the game page by design.
    assert.deepEqual(
      H.rulesForRepo('forge-hammer').sort(),
      [
        'arcMultiplierScope',
        'nativeFloats',
        'ownerSafeAdd',
        'rewardRounding',
        'roundingHybrid',
        'staticMetadata',
      ].sort(),
    );
    assert.ok(
      !H.rulesForRepo('forge-hammer').includes('debugLogging'),
      'a rule file local to FoE-Info-Extension leaked into a sibling',
    );
    assert.ok(
      !H.rulesForRepo('forge-hammer').includes('passiveOnly'),
      'passiveOnly was asserted against a repo that injects by design',
    );
    assert.ok(
      H.rulesForRepo('LoW-Tool').includes('passiveOnly'),
      'a fork of this repo must still be held to passive observation',
    );
    assert.equal(
      H.rulesForRepo('forge-hammer', H.DETERMINISTIC_RULE_IDS).length,
      0,
      'a FoE-Info-local deterministic rule leaked into a sibling',
    );
  },
);

// ---- candidate recall tier -------------------------------------------------
//
// These lock the calibration, not the plumbing. Each of the four below failed
// in a real run on 2026-09-27 and cost a re-measurement to diagnose.

test('every recall test is total and side-effect free', { skip: SKIP }, () => {
  for (const [id, recall] of Object.entries(H.CANDIDATE_RECALL)) {
    const sample = [
      '',
      'const x = 1;',
      'html += \'<p class="red">*** LOCKED ***</p>\';',
      'return Math.round(val * 100);',
      '  // console.debug(name, state);',
      "'</span>';",
    ];
    for (const line of sample) {
      const out = recall(line, sample, 0, 'src/js/ui/x.js');
      assert.equal(
        typeof out,
        'boolean',
        `${id} returned ${typeof out} for ${JSON.stringify(line)}`,
      );
    }
  }
});

test(
  'candidate states are line-anchored and never comment lines',
  { skip: SKIP },
  () => {
    const states = H.candidateStates(
      ['src/js/ui/incidentsPanel.js'],
      ['debugLogging', 'i18nBinding'],
    );
    assert.ok(states.length > 0, 'expected candidates in a real panel file');
    for (const s of states) {
      assert.equal(s.window, 0, 'a candidate is a line, not a window');
      assert.ok(s.line > 0, 'candidate has no line number');
      assert.ok(Array.isArray(s.lines) && s.lines.length === 2);
      assert.ok(s.lines[0] <= s.line && s.line <= s.lines[1]);
      const flagged = s.ADDED_CODE.split('\n').find((l) =>
        l.startsWith(`${s.line}|`),
      );
      assert.ok(flagged, `state does not contain its own line ${s.line}`);
      assert.ok(
        !/^\s*(?:\/\/|\*)/.test(flagged.replace(/^\d+\|\s*/, '')),
        'comment line became a candidate',
      );
    }
  },
);

test('candidate states honour scope and exempt', { skip: SKIP }, () => {
  // calcPurity is scoped to src/js/calc/; a DOM reference in ui/ is that layer
  // working correctly, and must not be raised as a calc violation.
  const uiStates = H.candidateStates(
    ['src/js/ui/gbgTargetGenerator.js'],
    ['calcPurity'],
  );
  assert.equal(uiStates.length, 0, 'scoped rule leaked outside its layer');
  // logger.js is where console calls belong.
  const logger = H.candidateStates(
    ['src/js/utils/logger.js'],
    ['debugLogging'],
  );
  assert.equal(logger.length, 0, 'logger.js was not exempt from debugLogging');
});

test(
  'every finding maps to a candidate of its own rule',
  { skip: SKIP },
  () => {
    // The routing regression: judgeAll is a full cross product, so passing all
    // rules at once asked calcPurity about every line in the repo and returned
    // 87 findings for a rule with zero candidates. planCandidateAudit is the
    // pure step that enforces the invariant, so it is testable without a model.
    const files = [
      'src/js/calc/GreatBuildingCalculator.js',
      'src/js/ui/gbgTargetGenerator.js',
    ];
    const rules = ['calcPurity', 'debugLogging', 'i18nBinding'];
    const plan = H.planCandidateAudit(files, rules);
    assert.equal(
      plan.askedRules.length,
      plan.byRule.size,
      'a rule is asked about without contributing candidates',
    );
    for (const r of plan.askedRules) {
      assert.ok(
        plan.byRule.get(r).length > 0,
        `${r} asked with an empty group`,
      );
      assert.ok(plan.questions[r], `${r} asked with no question`);
      assert.ok(
        plan.questions[r].instructions.includes(H.RULES[r].ask),
        `${r} question lost the rule text`,
      );
    }
    // calcPurity is scoped to src/js/calc/; the only calc file here contributes
    // nothing (it is pure), so it must not be asked at all.
    assert.ok(
      !plan.askedRules.includes('calcPurity'),
      'calcPurity was asked despite contributing no candidates',
    );
  },
);

test('i18n recall requires prose, not markup', { skip: SKIP }, () => {
  const f = H.CANDIDATE_RECALL.i18nBinding;
  // These are the exact lines that made i18nBinding 98% noise before
  // calibration. Assembling markup is what these files legitimately do.
  for (const line of [
    "  let html = '';",
    '  const alert = \'<div class="alert alert-danger" role="alert\'>\';',
    "  el.textContent = collapse ? '[+]' : '[-]';",
    '  return `<h3 class="popover-header">${title}</h3>`;',
    '  <span class="material-icons-outlined">settings</span>',
  ]) {
    assert.equal(f(line, [line], 0, 'x.js'), false, `markup matched: ${line}`);
  }
  // And these are the genuine violations it must still catch.
  for (const line of [
    '  html += \'<p class="red">*** LOCKED ***</p>\';',
    '      html += `<tr><td>${safeName}</td><td>Plunder</td></tr>`;',
    "  versionLabel.textContent = 'Game Version';",
    'aria-label="Close"',
  ]) {
    assert.equal(f(line, [line], 0, 'x.js'), true, `prose missed: ${line}`);
  }
});

test(
  'nativeFloats recall ignores operators inside string literals',
  { skip: SKIP },
  () => {
    const f = H.CANDIDATE_RECALL.nativeFloats;
    // "goods" is a quantity word and the path contains "/", which is not division.
    assert.equal(
      f(
        "const { SPECIAL_GOODS } = require('../goods/goodsClassification.js');",
        [],
        0,
        'x.js',
      ),
      false,
    );
    assert.equal(
      f(
        'return Math.round(Number(baseFp || 0) * (1 + Number(arcBonusPercent ?? 90) / 100));',
        [],
        0,
        'x.js',
      ),
      true,
    );
  },
);

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
  for (const id of H.JUDGED_RULE_IDS) {
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
    for (const id of H.JUDGED_RULE_IDS) {
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
