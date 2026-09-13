#!/usr/bin/env node
// Skill work log & memory — the persistence layer for the self-improvement loop.
//
// Every skill gains two artifacts under .agents/skills/<name>/memory/:
//   worklog.jsonl  — one JSON object per use (append-only, machine-readable)
//   lessons.md     — accumulated, deduplicated lessons in prose
//
// A skill can only improve if its failures are recorded where the next run will
// read them. This script is the single writer so the format stays consistent
// across hosts (Antigravity, opencode, Hermes).
//
// Usage:
//   node .agents/scripts/skill-memory.mjs log --skill <name> --outcome pass|fail|partial \
//        [--task <id>] [--signal <cmd>]... [--lesson <text>] [--note <text>]
//   node .agents/scripts/skill-memory.mjs lessons --skill <name>
//   node .agents/scripts/skill-memory.mjs stats
//
// Exit codes: 0 ok · 1 usage error · 2 unknown skill · 3 bad outcome value.

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
// SKILL_MEMORY_ROOT lets tests (and other repos) point at a scratch skills dir
// instead of writing fixtures into the live .agents/skills tree.
const SKILLS_DIR = process.env.SKILL_MEMORY_ROOT
  ? resolve(process.env.SKILL_MEMORY_ROOT)
  : join(ROOT, '.agents', 'skills');
const OUTCOMES = new Set(['pass', 'fail', 'partial']);

function fail(code, message) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { signals: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      args[key] = true;
      continue;
    }
    i += 1;
    if (key === 'signal') args.signals.push(value);
    else args[key] = value;
  }
  return args;
}

function skillMemoryDir(skill) {
  const skillDir = join(SKILLS_DIR, skill);
  if (!existsSync(join(skillDir, 'SKILL.md'))) {
    fail(2, `Unknown skill "${skill}" — no ${skill}/SKILL.md under .agents/skills/`);
  }
  const memoryDir = join(skillDir, 'memory');
  mkdirSync(memoryDir, { recursive: true });
  return memoryDir;
}

function appendLesson(memoryDir, lesson) {
  const path = join(memoryDir, 'lessons.md');
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const normalized = lesson.trim();
  // Dedupe: repeating a lesson across runs adds no signal.
  if (existing.toLowerCase().includes(normalized.toLowerCase())) return false;

  const today = new Date().toISOString().slice(0, 10);
  const heading = `## ${today}`;
  let next;
  if (!existing.trim()) {
    next = `# Lessons\n\n${heading}\n\n- ${normalized}\n`;
  } else if (existing.includes(heading)) {
    next = `${existing.replace(heading, `${heading}\n\n- ${normalized}`)}`;
  } else {
    next = `${existing.trimEnd()}\n\n${heading}\n\n- ${normalized}\n`;
  }
  writeFileSync(path, next);
  return true;
}

function commandLog(args) {
  if (!args.skill) fail(1, 'log requires --skill <name>');
  if (!args.outcome) fail(1, 'log requires --outcome pass|fail|partial');
  if (!OUTCOMES.has(args.outcome)) {
    fail(3, `Invalid --outcome "${args.outcome}" (expected pass, fail, or partial)`);
  }

  const memoryDir = skillMemoryDir(args.skill);
  const entry = {
    ts: new Date().toISOString(),
    skill: args.skill,
    task: typeof args.task === 'string' ? args.task : null,
    outcome: args.outcome,
    signals: args.signals,
    lesson: typeof args.lesson === 'string' ? args.lesson.trim() : null,
    note: typeof args.note === 'string' ? args.note.trim() : null,
  };
  appendFileSync(join(memoryDir, 'worklog.jsonl'), `${JSON.stringify(entry)}\n`);

  let lessonAdded = false;
  if (entry.lesson) lessonAdded = appendLesson(memoryDir, entry.lesson);

  process.stdout.write(
    `${JSON.stringify({ logged: true, skill: args.skill, outcome: args.outcome, lessonAdded })}\n`,
  );
}

function commandLessons(args) {
  if (!args.skill) fail(1, 'lessons requires --skill <name>');
  const path = join(skillMemoryDir(args.skill), 'lessons.md');
  if (!existsSync(path)) {
    process.stdout.write(`No recorded lessons for "${args.skill}" yet.\n`);
    return;
  }
  process.stdout.write(readFileSync(path, 'utf8'));
}

function commandStats() {
  const skills = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const summary = [];
  for (const skill of skills) {
    const path = join(SKILLS_DIR, skill, 'memory', 'worklog.jsonl');
    if (!existsSync(path)) continue;
    const entries = readFileSync(path, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (!entries.length) continue;
    const byOutcome = { pass: 0, fail: 0, partial: 0 };
    for (const entry of entries) {
      if (byOutcome[entry.outcome] !== undefined) byOutcome[entry.outcome] += 1;
    }
    summary.push({
      skill,
      runs: entries.length,
      ...byOutcome,
      last_used: entries[entries.length - 1].ts,
      has_lessons: existsSync(join(SKILLS_DIR, skill, 'memory', 'lessons.md')),
    });
  }
  summary.sort((a, b) => b.runs - a.runs);
  process.stdout.write(`${JSON.stringify({ skills_tracked: summary.length, summary }, null, 2)}\n`);
}

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

if (command === 'log') commandLog(args);
else if (command === 'lessons') commandLessons(args);
else if (command === 'stats') commandStats();
else {
  fail(
    1,
    'Usage: skill-memory.mjs log --skill <name> --outcome pass|fail|partial [--task <id>] [--signal <cmd>]... [--lesson <text>] [--note <text>]\n' +
      '       skill-memory.mjs lessons --skill <name>\n' +
      '       skill-memory.mjs stats',
  );
}
