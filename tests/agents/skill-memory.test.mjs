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

// Point the script at a scratch skills root: writing fixtures into the live
// .agents/skills tree races the config tests that scan the same directory.
const ROOT = mkdtempSync(join(tmpdir(), 'skill-memory-'));
const FIXTURE_SKILL = 'fixture-skill';
const FIXTURE_DIR = join(ROOT, FIXTURE_SKILL);
const FIXTURE_MEMORY = join(FIXTURE_DIR, 'memory');
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
