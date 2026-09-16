import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const SCRIPT = resolve('.agents/scripts/project-curator.mjs');

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'project-curator-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function write(path, content = '') {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, content);
}

function definition(name) {
  return `---\nname: ${name}\ndescription: test\n---\n`;
}

function run(root, args = ['status']) {
  return spawnSync('node', [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { ...process.env, PROJECT_CURATOR_ROOT: root },
  });
}

test('Project Curator - discovers nested skills and flat agents in sorted order', (t) => {
  const root = fixture(t);
  write(join(root, 'skills', 'zeta', 'SKILL.md'), definition('zeta'));
  write(
    join(root, 'skills', 'category', 'alpha', 'SKILL.md'),
    definition('alpha'),
  );
  write(join(root, 'agents', 'beta.md'), definition('beta'));
  write(join(root, 'agents', 'nested', 'ignored.md'), definition('ignored'));

  const result = run(root);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.command, 'status');
  assert.deepEqual(report.counts, {
    agents: 1,
    definitions: 3,
    skills: 2,
    tracked: 0,
    worklogEntries: 0,
    storedLessons: 0,
    missingStoredLessons: 0,
    lessonsPromoted: 0,
    staleDefinitions: 0,
    duplicateLessonGroups: 0,
    duplicateReferenceGroups: 0,
    warnings: 0,
  });
  assert.deepEqual(
    report.definitions.map(({ name, type, path }) => ({ name, type, path })),
    [
      { name: 'alpha', type: 'skill', path: 'skills/category/alpha/SKILL.md' },
      { name: 'beta', type: 'agent', path: 'agents/beta.md' },
      { name: 'zeta', type: 'skill', path: 'skills/zeta/SKILL.md' },
    ],
  );
  assert.deepEqual(report.candidates, {
    missingStoredLessons: [],
    staleDefinitions: [],
    duplicateLessons: [],
    duplicateReferences: [],
  });
  assert.deepEqual(report.warnings, []);
});

test('Project Curator - reports stored lessons missing from managed sections', (t) => {
  const root = fixture(t);
  write(
    join(root, 'skills', 'alpha', 'SKILL.md'),
    `${definition('alpha')}\n<!-- skill-memory:lessons:start -->\n## Learned Improvements\n\n- Already promoted.\n<!-- skill-memory:lessons:end -->\n`,
  );
  write(
    join(root, 'memory', 'alpha', 'lessons.md'),
    '# Lessons\n\n- Already promoted.\n- Promote this lesson.\n',
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.counts.storedLessons, 2);
  assert.equal(report.counts.missingStoredLessons, 1);
  assert.deepEqual(report.candidates.missingStoredLessons, [
    { name: 'alpha', lessons: ['Promote this lesson.'] },
  ]);
});

test('Project Curator - run is dry by default and --apply promotes only stored lessons', (t) => {
  const root = fixture(t);
  const skillPath = join(root, 'skills', 'alpha', 'SKILL.md');
  write(skillPath, definition('alpha'));
  write(
    join(root, 'memory', 'alpha', 'lessons.md'),
    '# Lessons\n\n- Promote safely.\n',
  );

  const dry = run(root, ['run']);
  assert.equal(dry.status, 0, dry.stderr);
  assert.equal(JSON.parse(dry.stdout).counts.lessonsPromoted, 0);
  assert.doesNotMatch(readFileSync(skillPath, 'utf8'), /Promote safely/);

  const applied = run(root, ['run', '--apply']);
  assert.equal(applied.status, 0, applied.stderr);
  const report = JSON.parse(applied.stdout);
  assert.equal(report.applied, true);
  assert.equal(report.counts.lessonsPromoted, 1);
  assert.deepEqual(report.changedDefinitions, ['alpha']);
  assert.match(readFileSync(skillPath, 'utf8'), /- Promote safely\./);

  const repeated = run(root, ['run', '--apply']);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(JSON.parse(repeated.stdout).counts.lessonsPromoted, 0);
  assert.equal(
    (readFileSync(skillPath, 'utf8').match(/Promote safely\./g) ?? []).length,
    1,
  );
});

test('Project Curator - atomic promotion ignores a pre-created predictable temporary symlink', (t) => {
  const root = fixture(t);
  const skillPath = join(root, 'skills', 'alpha', 'SKILL.md');
  const victimPath = join(root, 'victim.txt');
  const preloadPath = join(root, 'preload.cjs');
  write(skillPath, definition('alpha'));
  write(victimPath, 'victim must remain unchanged\n');
  write(
    join(root, 'memory', 'alpha', 'lessons.md'),
    '# Lessons\n\n- Promote without following attacker symlinks.\n',
  );
  write(
    preloadPath,
    "require('node:fs').symlinkSync(process.env.CURATOR_VICTIM, `${process.env.CURATOR_TARGET}.project-curator-${process.pid}.tmp`);\n",
  );

  const result = spawnSync('node', [SCRIPT, 'run', '--apply'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      CURATOR_TARGET: skillPath,
      CURATOR_VICTIM: victimPath,
      NODE_OPTIONS: `--require=${preloadPath}`,
      PROJECT_CURATOR_ROOT: root,
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    readFileSync(victimPath, 'utf8'),
    'victim must remain unchanged\n',
  );
  assert.match(
    readFileSync(skillPath, 'utf8'),
    /- Promote without following attacker symlinks\./,
  );
});

test('Project Curator - reports exact duplicate lessons and reference files', (t) => {
  const root = fixture(t);
  const learned =
    '\n<!-- skill-memory:lessons:start -->\n## Learned Improvements\n\n- Shared lesson.\n<!-- skill-memory:lessons:end -->\n';
  write(
    join(root, 'skills', 'alpha', 'SKILL.md'),
    definition('alpha') + learned,
  );
  write(join(root, 'skills', 'beta', 'SKILL.md'), definition('beta') + learned);
  write(
    join(root, 'skills', 'alpha', 'references', 'skill-memory.md'),
    'identical reference\n',
  );
  write(
    join(root, 'skills', 'beta', 'references', 'skill-memory.md'),
    'identical reference\n',
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.counts.duplicateLessonGroups, 1);
  assert.equal(report.counts.duplicateReferenceGroups, 1);
  assert.deepEqual(report.candidates.duplicateLessons, [
    { lesson: 'Shared lesson.', definitions: ['alpha', 'beta'] },
  ]);
  assert.deepEqual(report.candidates.duplicateReferences, [
    {
      sha256: report.candidates.duplicateReferences[0].sha256,
      paths: [
        'skills/alpha/references/skill-memory.md',
        'skills/beta/references/skill-memory.md',
      ],
    },
  ]);
  assert.match(
    report.candidates.duplicateReferences[0].sha256,
    /^[a-f0-9]{64}$/,
  );
});

test('Project Curator - deduplicates lesson candidates and duplicate owners case-insensitively', (t) => {
  const root = fixture(t);
  const alphaLessons =
    '\n<!-- skill-memory:lessons:start -->\n## Learned Improvements\n\n- Shared lesson.\n<!-- skill-memory:lessons:end -->\n';
  const betaLessons =
    '\n<!-- skill-memory:lessons:start -->\n## Learned Improvements\n\n- Shared lesson.\n- shared lesson.\n<!-- skill-memory:lessons:end -->\n';
  const betaPath = join(root, 'skills', 'beta', 'SKILL.md');
  write(
    join(root, 'skills', 'alpha', 'SKILL.md'),
    definition('alpha') + alphaLessons,
  );
  write(betaPath, definition('beta') + betaLessons);
  write(
    join(root, 'memory', 'beta', 'lessons.md'),
    '# Lessons\n\n- Promote first spelling.\n- promote first spelling.\n',
  );

  const status = run(root);

  assert.equal(status.status, 0, status.stderr);
  const statusReport = JSON.parse(status.stdout);
  assert.equal(statusReport.counts.missingStoredLessons, 1);
  assert.deepEqual(statusReport.candidates.missingStoredLessons, [
    { name: 'beta', lessons: ['Promote first spelling.'] },
  ]);
  assert.deepEqual(statusReport.candidates.duplicateLessons, [
    { lesson: 'Shared lesson.', definitions: ['alpha', 'beta'] },
  ]);

  const applied = run(root, ['run', '--apply']);

  assert.equal(applied.status, 0, applied.stderr);
  const appliedReport = JSON.parse(applied.stdout);
  assert.equal(appliedReport.counts.lessonsPromoted, 1);
  assert.equal(
    (readFileSync(betaPath, 'utf8').match(/Promote first spelling\./gi) ?? [])
      .length,
    1,
  );
  assert.deepEqual(appliedReport.candidates.duplicateLessons, [
    { lesson: 'Shared lesson.', definitions: ['alpha', 'beta'] },
  ]);
});

test('Project Curator - reports stale tracked definitions and invalid JSONL warnings', (t) => {
  const root = fixture(t);
  write(join(root, 'skills', 'alpha', 'SKILL.md'), definition('alpha'));
  write(join(root, 'agents', 'beta.md'), definition('beta'));
  write(
    join(root, 'memory', 'alpha', 'worklog.jsonl'),
    '{"ts":"2000-01-01T00:00:00.000Z","skill":"alpha","outcome":"pass"}\nnot-json\n',
  );
  const recent = new Date().toISOString();
  write(
    join(root, 'memory', 'beta', 'worklog.jsonl'),
    `${JSON.stringify({ ts: recent, skill: 'beta', outcome: 'pass' })}\n`,
  );

  const result = run(root, ['status', '--stale-days', '30']);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.staleDays, 30);
  assert.equal(report.counts.tracked, 2);
  assert.equal(report.counts.worklogEntries, 2);
  assert.equal(report.counts.staleDefinitions, 1);
  assert.deepEqual(report.candidates.staleDefinitions, [
    { name: 'alpha', lastUsed: '2000-01-01T00:00:00.000Z' },
  ]);
  assert.deepEqual(report.usage, [
    {
      name: 'alpha',
      runs: 1,
      outcomes: { pass: 1, fail: 0, partial: 0, other: 0 },
      lastUsed: '2000-01-01T00:00:00.000Z',
    },
    {
      name: 'beta',
      runs: 1,
      outcomes: { pass: 1, fail: 0, partial: 0, other: 0 },
      lastUsed: recent,
    },
  ]);
  assert.deepEqual(report.warnings, [
    {
      path: 'memory/alpha/worklog.jsonl',
      line: 2,
      warning: 'invalid JSONL line ignored',
    },
  ]);
  assert.equal(report.counts.warnings, 1);
});

test('Project Curator - classifies inherited outcome names as other', (t) => {
  const root = fixture(t);
  write(join(root, 'skills', 'alpha', 'SKILL.md'), definition('alpha'));
  write(
    join(root, 'memory', 'alpha', 'worklog.jsonl'),
    `${JSON.stringify({ ts: new Date().toISOString(), outcome: 'toString' })}\n`,
  );

  const result = run(root);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).usage[0].outcomes, {
    pass: 0,
    fail: 0,
    partial: 0,
    other: 1,
  });
});

test('Project Curator - selects last use by parsed epoch while preserving its timestamp', (t) => {
  const root = fixture(t);
  const hour = 3_600_000;
  const withOffset = (epoch, offsetHours) => {
    const local = new Date(epoch + offsetHours * hour)
      .toISOString()
      .slice(0, -1);
    const sign = offsetHours < 0 ? '-' : '+';
    return `${local}${sign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;
  };
  const recent = withOffset(Date.now() - 12 * hour, -12);
  const staleButLexicallyLater = withOffset(Date.now() - 36 * hour, 14);
  write(join(root, 'skills', 'alpha', 'SKILL.md'), definition('alpha'));
  write(
    join(root, 'memory', 'alpha', 'worklog.jsonl'),
    `${JSON.stringify({ ts: recent, outcome: 'pass' })}\n${JSON.stringify({ ts: staleButLexicallyLater, outcome: 'pass' })}\n`,
  );

  const result = run(root, ['status', '--stale-days', '1']);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.usage[0].lastUsed, recent);
  assert.deepEqual(report.candidates.staleDefinitions, []);
});

test('Project Curator - fails closed on malformed managed lesson markers', (t) => {
  const root = fixture(t);
  write(
    join(root, 'skills', 'alpha', 'SKILL.md'),
    `${definition('alpha')}\n<!-- skill-memory:lessons:start -->\n- incomplete\n`,
  );

  const result = run(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /malformed managed lesson section/i);
});

test('Project Curator - refuses symlinked flat agent definitions', (t) => {
  const root = fixture(t);
  const outside = mkdtempSync(join(tmpdir(), 'project-curator-agent-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const outsideAgent = join(outside, 'outside.md');
  write(outsideAgent, definition('outside'));
  mkdirSync(join(root, 'agents'), { recursive: true });
  symlinkSync(outsideAgent, join(root, 'agents', 'outside.md'));

  const result = run(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /refusing symlinked agent definition/i);
});

test('Project Curator - refuses skill paths that escape through symlinks', (t) => {
  const root = fixture(t);
  const outside = mkdtempSync(join(tmpdir(), 'project-curator-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  write(join(outside, 'SKILL.md'), definition('outside'));
  mkdirSync(join(root, 'skills'), { recursive: true });
  symlinkSync(outside, join(root, 'skills', 'outside'));

  const result = run(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /refusing symlinked skill path/i);
});
