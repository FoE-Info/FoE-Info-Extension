import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
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

const SCRIPT = resolve('.agents/scripts/skill-memory.mjs');

// Point the script at a scratch .agents root so tests exercise the production
// skills/, agents/, and centralized memory/ layout without touching live data.
const ROOT = mkdtempSync(join(tmpdir(), 'skill-memory-'));
const SKILLS_DIR = join(ROOT, 'skills');
const MEMORY_DIR = join(ROOT, 'memory');
const FIXTURE_SKILL = 'fixture-skill';
const FIXTURE_DIR = join(SKILLS_DIR, FIXTURE_SKILL);
const FIXTURE_MEMORY = join(MEMORY_DIR, FIXTURE_SKILL);
const env = { ...process.env, SKILL_MEMORY_ROOT: ROOT };

function run(args) {
  return spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', env });
}

function ensureFixture() {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(
    join(FIXTURE_DIR, 'SKILL.md'),
    '---\nname: fixture-skill\ndescription: "test fixture"\n---\n\nFixture.\n',
  );
}

test('Skill Memory - log appends a structured JSONL entry', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();

  const result = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'pass',
    '--task',
    't-1',
    '--signal',
    'node --test tests/agents',
    '--signal',
    'npm run lint',
    '--lesson',
    'Fixture lesson one.',
  ]);
  assert.equal(result.status, 0, result.stderr);

  const entries = readFileSync(join(FIXTURE_MEMORY, 'worklog.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].skill, FIXTURE_SKILL);
  assert.equal(entries[0].outcome, 'pass');
  assert.equal(entries[0].task, 't-1');
  assert.deepEqual(entries[0].signals, [
    'node --test tests/agents',
    'npm run lint',
  ]);
  assert.equal(entries[0].lesson, 'Fixture lesson one.');
  assert.match(entries[0].ts, /^\d{4}-\d{2}-\d{2}T/);
});

test('Skill Memory - a novel lesson is promoted into the canonical skill', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();

  const result = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'pass',
    '--lesson',
    'Reuse the verified fixture path.',
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"lessonPromoted":true/);

  const skill = readFileSync(join(FIXTURE_DIR, 'SKILL.md'), 'utf8');
  assert.match(skill, /<!-- skill-memory:lessons:start -->/);
  assert.match(skill, /## Learned Improvements/);
  assert.match(skill, /- Reuse the verified fixture path\./);
  assert.match(skill, /<!-- skill-memory:lessons:end -->/);
});

test('Skill Memory - lessons.md consolidates and deduplicates lessons', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();

  run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'fail',
    '--lesson',
    'Dup lesson.',
  ]);
  const second = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'pass',
    '--lesson',
    'dup lesson.',
  ]);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /"lessonAdded":false/);
  assert.match(second.stdout, /"lessonPromoted":false/);

  const lessons = readFileSync(join(FIXTURE_MEMORY, 'lessons.md'), 'utf8');
  const occurrences = lessons.match(/dup lesson\./gi) || [];
  assert.equal(
    occurrences.length,
    1,
    'duplicate lesson should be recorded once',
  );

  // Worklog still records every run, including the duplicate-lesson one.
  const runs = readFileSync(join(FIXTURE_MEMORY, 'worklog.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean);
  assert.equal(runs.length, 2);

  const skill = readFileSync(join(FIXTURE_DIR, 'SKILL.md'), 'utf8');
  assert.equal((skill.match(/- Dup lesson\./gi) || []).length, 1);
});

test('Skill Memory - multiline lessons stay one safe bullet and deduplicate case-insensitively', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();

  const first = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'fail',
    '--lesson',
    'Keep the fixture stable.\n- Do not create another bullet.\n## Not a heading',
  ]);
  const second = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'pass',
    '--lesson',
    'keep the fixture stable.\n- do not create another bullet.\n## not a heading',
  ]);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(
    {
      lessonAdded: JSON.parse(second.stdout).lessonAdded,
      lessonPromoted: JSON.parse(second.stdout).lessonPromoted,
    },
    { lessonAdded: false, lessonPromoted: false },
  );

  const expected =
    '- Keep the fixture stable. - Do not create another bullet. ## Not a heading';
  const lessons = readFileSync(join(FIXTURE_MEMORY, 'lessons.md'), 'utf8');
  const skill = readFileSync(join(FIXTURE_DIR, 'SKILL.md'), 'utf8');
  assert.equal(lessons.split(expected).length - 1, 1);
  assert.equal(skill.split(expected).length - 1, 1);
  assert.doesNotMatch(lessons, /^## Not a heading$/m);
  assert.doesNotMatch(skill, /^## Not a heading$/m);
});

test('Skill Memory - rejects reserved managed-section markers before writing', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();

  const result = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'fail',
    '--lesson',
    'Break <!-- skill-memory:lessons:end --> the section.',
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /reserved skill-memory marker/i);
  assert.ok(!existsSync(FIXTURE_MEMORY));
  assert.doesNotMatch(
    readFileSync(join(FIXTURE_DIR, 'SKILL.md'), 'utf8'),
    /Learned Improvements/,
  );
});

test('Skill Memory - rejects truncated or case-variant markers inside lessons', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();

  const result = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'fail',
    '--lesson',
    'Break <!-- SKILL-MEMORY:LESSONS:START the section.',
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /reserved skill-memory marker/i);
  assert.ok(!existsSync(FIXTURE_MEMORY));
});

test('Skill Memory - rejects malformed managed sections instead of appending another', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();
  const skillPath = join(FIXTURE_DIR, 'SKILL.md');
  writeFileSync(
    skillPath,
    `${readFileSync(skillPath, 'utf8')}\n<!-- skill-memory:lessons:start -->\n`,
  );
  const before = readFileSync(skillPath, 'utf8');

  const result = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'fail',
    '--lesson',
    'Do not compound malformed state.',
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /malformed managed lesson section/i);
  assert.equal(readFileSync(skillPath, 'utf8'), before);
});

test('Skill Memory - rejects truncated managed markers', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();
  const skillPath = join(FIXTURE_DIR, 'SKILL.md');
  writeFileSync(
    skillPath,
    `${readFileSync(skillPath, 'utf8')}\n<!-- skill-memory:lessons:start\n`,
  );
  const before = readFileSync(skillPath, 'utf8');

  const result = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'fail',
    '--lesson',
    'Reject truncated markers.',
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /malformed managed lesson section/i);
  assert.equal(readFileSync(skillPath, 'utf8'), before);
});

test('Skill Memory - retries promotion after a prior definition write failure', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();
  const skillPath = join(FIXTURE_DIR, 'SKILL.md');
  chmodSync(skillPath, 0o444);

  const args = [
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'fail',
    '--lesson',
    'Recover promotion after failure.',
  ];
  const failed = run(args);
  assert.notEqual(failed.status, 0);
  assert.match(
    readFileSync(join(FIXTURE_MEMORY, 'lessons.md'), 'utf8'),
    /Recover promotion after failure\./,
  );

  chmodSync(skillPath, 0o644);
  const recovered = run(args);

  assert.equal(recovered.status, 0, recovered.stderr);
  assert.equal(JSON.parse(recovered.stdout).lessonAdded, false);
  assert.equal(JSON.parse(recovered.stdout).lessonPromoted, true);
  assert.match(
    readFileSync(skillPath, 'utf8'),
    /- Recover promotion after failure\./,
  );
});

test('Skill Memory - refuses canonical definitions that escape through symlinks', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  const outside = mkdtempSync(join(tmpdir(), 'skill-memory-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  mkdirSync(FIXTURE_DIR, { recursive: true });
  const outsideDefinition = join(outside, 'SKILL.md');
  writeFileSync(outsideDefinition, 'OUTSIDE\n');
  symlinkSync(outsideDefinition, join(FIXTURE_DIR, 'SKILL.md'));

  const result = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'fail',
    '--lesson',
    'Never write outside the skill root.',
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /symlink|outside/i);
  assert.equal(readFileSync(outsideDefinition, 'utf8'), 'OUTSIDE\n');
  assert.ok(!existsSync(join(FIXTURE_MEMORY, 'worklog.jsonl')));
});

test('Skill Memory - refuses memory directories that escape through symlinks', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  const outside = mkdtempSync(join(tmpdir(), 'skill-memory-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  ensureFixture();
  mkdirSync(MEMORY_DIR, { recursive: true });
  symlinkSync(outside, FIXTURE_MEMORY);

  const result = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'pass',
    '--lesson',
    'Keep memory inside the agents root.',
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /symlink|memory.*outside|outside.*memory/i);
  assert.ok(!existsSync(join(outside, 'worklog.jsonl')));
  assert.ok(!existsSync(join(outside, 'lessons.md')));
});

test('Skill Memory - refuses memory files that escape through symlinks', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  const outside = mkdtempSync(join(tmpdir(), 'skill-memory-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  ensureFixture();
  mkdirSync(FIXTURE_MEMORY, { recursive: true });
  const outsideLessons = join(outside, 'lessons.md');
  writeFileSync(outsideLessons, 'OUTSIDE\n');
  symlinkSync(outsideLessons, join(FIXTURE_MEMORY, 'lessons.md'));

  const result = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'pass',
    '--lesson',
    'Keep memory files inside the agents root.',
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /symlink|memory.*outside|outside.*memory/i);
  assert.equal(readFileSync(outsideLessons, 'utf8'), 'OUTSIDE\n');
});

test('Skill Memory - refuses dangling memory-file symlinks', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  const outside = mkdtempSync(join(tmpdir(), 'skill-memory-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  ensureFixture();
  mkdirSync(FIXTURE_MEMORY, { recursive: true });
  const outsideWorklog = join(outside, 'missing', 'worklog.jsonl');
  const worklog = join(FIXTURE_MEMORY, 'worklog.jsonl');
  symlinkSync(outsideWorklog, worklog);

  const result = run(['log', '--skill', FIXTURE_SKILL, '--outcome', 'pass']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /symlink|memory.*outside|outside.*memory/i);
  assert.equal(lstatSync(worklog).isSymbolicLink(), true);
  assert.ok(!existsSync(outsideWorklog));
});

test('Skill Memory - an empty lesson does not modify the canonical definition', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();
  const skillPath = join(FIXTURE_DIR, 'SKILL.md');
  const before = readFileSync(skillPath, 'utf8');

  const result = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'pass',
    '--lesson',
    '   ',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    {
      lessonAdded: JSON.parse(result.stdout).lessonAdded,
      lessonPromoted: JSON.parse(result.stdout).lessonPromoted,
    },
    { lessonAdded: false, lessonPromoted: false },
  );
  assert.equal(readFileSync(skillPath, 'utf8'), before);
  assert.ok(!existsSync(join(FIXTURE_MEMORY, 'lessons.md')));
});

test('Skill Memory - lesson journal deduplicates whole bullets rather than substrings', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();

  run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'pass',
    '--lesson',
    'Use the fixture path.',
  ]);
  const result = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'pass',
    '--lesson',
    'Fixture path.',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).lessonAdded, true);
  const lessons = readFileSync(join(FIXTURE_MEMORY, 'lessons.md'), 'utf8');
  assert.match(lessons, /- Use the fixture path\./);
  assert.match(lessons, /- Fixture path\./);
});

test('Skill Memory - promotion deduplication is scoped to managed lesson bullets', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();

  const result = run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'pass',
    '--lesson',
    'Fixture.',
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).lessonPromoted, true);
  assert.match(
    readFileSync(join(FIXTURE_DIR, 'SKILL.md'), 'utf8'),
    /- Fixture\./,
  );
});

test('Skill Memory - sync promotes existing lessons without creating worklog entries', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();
  mkdirSync(FIXTURE_MEMORY, { recursive: true });
  writeFileSync(
    join(FIXTURE_MEMORY, 'lessons.md'),
    '# Lessons\n\n## 2026-09-14\n\n- Preserve the first behavior.\n\n## 2026-09-15\n\n- Preserve the second behavior.\n',
  );

  const result = run(['sync', '--skill', FIXTURE_SKILL]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    synced: true,
    skill: FIXTURE_SKILL,
    lessonsFound: 2,
    lessonsPromoted: 2,
  });

  const skill = readFileSync(join(FIXTURE_DIR, 'SKILL.md'), 'utf8');
  assert.match(skill, /- Preserve the first behavior\./);
  assert.match(skill, /- Preserve the second behavior\./);
  assert.ok(!existsSync(join(FIXTURE_MEMORY, 'worklog.jsonl')));

  const repeated = run(['sync', '--skill', FIXTURE_SKILL]);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(JSON.parse(repeated.stdout).lessonsPromoted, 0);
  assert.equal(
    (
      readFileSync(join(FIXTURE_DIR, 'SKILL.md'), 'utf8').match(
        /- Preserve the first behavior\./g,
      ) || []
    ).length,
    1,
  );
});

test('Skill Memory - lessons command returns recorded lessons', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();

  run([
    'log',
    '--skill',
    FIXTURE_SKILL,
    '--outcome',
    'pass',
    '--lesson',
    'Readable lesson.',
  ]);
  const result = run(['lessons', '--skill', FIXTURE_SKILL]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /# Lessons/);
  assert.match(result.stdout, /Readable lesson\./);
});

test('Skill Memory - unknown skill fails without writing anything', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));

  const result = run(['log', '--skill', 'no-such-skill', '--outcome', 'pass']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown skill/);
  assert.ok(!existsSync(join(ROOT, 'no-such-skill')));
});

test('Skill Memory - rejects traversal in skill names', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();

  const result = run([
    'log',
    '--skill',
    '../skills/fixture-skill',
    '--outcome',
    'pass',
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid skill or subagent name/);
  assert.ok(!existsSync(join(FIXTURE_DIR, 'memory')));
});

test('Skill Memory - rejects an invalid outcome value', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();

  const result = run(['log', '--skill', FIXTURE_SKILL, '--outcome', 'great']);
  assert.equal(result.status, 3);
  assert.match(result.stderr, /Invalid --outcome/);
  assert.ok(!existsSync(join(FIXTURE_MEMORY, 'worklog.jsonl')));
});

test('Skill Memory - stats summarizes recorded runs', (t) => {
  t.after(() => rmSync(ROOT, { recursive: true, force: true }));
  ensureFixture();

  run(['log', '--skill', FIXTURE_SKILL, '--outcome', 'pass']);
  run(['log', '--skill', FIXTURE_SKILL, '--outcome', 'fail']);

  const result = run(['stats']);
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  const row = parsed.summary.find((entry) => entry.skill === FIXTURE_SKILL);
  assert.ok(row, 'fixture skill should appear in stats');
  assert.equal(row.runs, 2);
  assert.equal(row.pass, 1);
  assert.equal(row.fail, 1);
});

test('Skill Memory - centralizes skill and flat-subagent memory', (t) => {
  const agentsRoot = mkdtempSync(join(tmpdir(), 'agent-memory-'));
  t.after(() => rmSync(agentsRoot, { recursive: true, force: true }));

  mkdirSync(join(agentsRoot, 'skills', 'fixture-skill'), { recursive: true });
  writeFileSync(
    join(agentsRoot, 'skills', 'fixture-skill', 'SKILL.md'),
    '---\nname: fixture-skill\ndescription: "test fixture"\n---\n',
  );
  mkdirSync(join(agentsRoot, 'agents'), { recursive: true });
  writeFileSync(
    join(agentsRoot, 'agents', 'fixture-agent.md'),
    '---\nname: fixture-agent\nsubagent: true\n---\n',
  );

  const canonicalEnv = { ...process.env, SKILL_MEMORY_ROOT: agentsRoot };
  const runCanonical = (args) =>
    spawnSync('node', [SCRIPT, ...args], {
      encoding: 'utf8',
      env: canonicalEnv,
    });

  const skillResult = runCanonical([
    'log',
    '--skill',
    'fixture-skill',
    '--outcome',
    'pass',
  ]);
  assert.equal(skillResult.status, 0, skillResult.stderr);

  const agentResult = runCanonical([
    'log',
    '--skill',
    'fixture-agent',
    '--outcome',
    'fail',
    '--lesson',
    'Keep the subagent definition current.',
  ]);
  assert.equal(agentResult.status, 0, agentResult.stderr);

  assert.ok(
    existsSync(join(agentsRoot, 'memory', 'fixture-skill', 'worklog.jsonl')),
  );
  assert.ok(
    existsSync(join(agentsRoot, 'memory', 'fixture-agent', 'worklog.jsonl')),
  );
  assert.ok(!existsSync(join(agentsRoot, 'skills', 'fixture-skill', 'memory')));
  assert.match(
    readFileSync(join(agentsRoot, 'agents', 'fixture-agent.md'), 'utf8'),
    /- Keep the subagent definition current\./,
  );

  const statsResult = runCanonical(['stats']);
  assert.equal(statsResult.status, 0, statsResult.stderr);
  const stats = JSON.parse(statsResult.stdout);
  assert.deepEqual(
    stats.summary.map(({ skill, runs }) => ({ skill, runs })),
    [
      { skill: 'fixture-agent', runs: 1 },
      { skill: 'fixture-skill', runs: 1 },
    ],
  );
});
