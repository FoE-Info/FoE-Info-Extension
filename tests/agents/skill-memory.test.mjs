import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
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
  ]);
  assert.equal(agentResult.status, 0, agentResult.stderr);

  assert.ok(
    existsSync(join(agentsRoot, 'memory', 'fixture-skill', 'worklog.jsonl')),
  );
  assert.ok(
    existsSync(join(agentsRoot, 'memory', 'fixture-agent', 'worklog.jsonl')),
  );
  assert.ok(!existsSync(join(agentsRoot, 'skills', 'fixture-skill', 'memory')));

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
