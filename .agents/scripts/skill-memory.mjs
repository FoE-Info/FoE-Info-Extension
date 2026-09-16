#!/usr/bin/env node
// Skill work log & memory — the persistence layer for the self-improvement loop.
//
// Every skill and subagent stores two artifacts under .agents/memory/<name>/:
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
//   node .agents/scripts/skill-memory.mjs sync --skill <name>
//   node .agents/scripts/skill-memory.mjs stats
//
// Exit codes: 0 ok · 1 usage error · 2 unknown skill · 3 bad outcome value.

import {
  appendFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const AGENTS_ROOT = process.env.SKILL_MEMORY_ROOT
  ? resolve(process.env.SKILL_MEMORY_ROOT)
  : join(ROOT, '.agents');
const SKILLS_DIR = join(AGENTS_ROOT, 'skills');
const SUBAGENTS_DIR = join(AGENTS_ROOT, 'agents');
const MEMORY_DIR = join(AGENTS_ROOT, 'memory');
const OUTCOMES = new Set(['pass', 'fail', 'partial']);
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LESSONS_START = '<!-- skill-memory:lessons:start -->';
const LESSONS_END = '<!-- skill-memory:lessons:end -->';

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

function isInsideAgents(path) {
  const root = realpathSync(AGENTS_ROOT);
  const target = realpathSync(path);
  const fromRoot = relative(root, target);
  return fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot);
}

function isSymlink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function assertProspectiveInsideAgents(path, label) {
  if (isSymlink(path)) fail(1, `Refusing symlinked ${label}: ${path}`);
  let ancestor = path;
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  if (!isInsideAgents(ancestor)) fail(1, `Refusing ${label} outside the configured agents root: ${path}`);
  if (existsSync(path) && !isInsideAgents(path)) {
    fail(1, `Refusing ${label} outside the configured agents root: ${path}`);
  }
  return path;
}

function skillMemoryDir(skill) {
  if (!NAME_PATTERN.test(skill)) {
    fail(1, `Invalid skill or subagent name "${skill}"`);
  }

  const skillPath = join(SKILLS_DIR, skill, 'SKILL.md');
  const subagentPath = join(SUBAGENTS_DIR, `${skill}.md`);
  if (!existsSync(skillPath) && !existsSync(subagentPath)) {
    fail(
      2,
      `Unknown skill or subagent "${skill}" — expected ${skillPath} or ${subagentPath}`,
    );
  }

  const memoryDir = join(MEMORY_DIR, skill);
  assertProspectiveInsideAgents(memoryDir, 'memory directory');
  mkdirSync(memoryDir, { recursive: true });
  assertProspectiveInsideAgents(memoryDir, 'memory directory');
  return memoryDir;
}

function memoryFile(memoryDir, name) {
  return assertProspectiveInsideAgents(join(memoryDir, name), 'memory file');
}

function definitionPath(skill) {
  const skillPath = join(SKILLS_DIR, skill, 'SKILL.md');
  const path = existsSync(skillPath) ? skillPath : join(SUBAGENTS_DIR, `${skill}.md`);
  const root = realpathSync(AGENTS_ROOT);
  const target = realpathSync(path);
  const fromRoot = relative(root, target);
  if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
    fail(1, `Refusing definition outside the configured agents root: ${path}`);
  }
  return path;
}

function readDefinition(skill) {
  const path = definitionPath(skill);
  const content = readFileSync(path, 'utf8');
  const startCount = content.split(LESSONS_START).length - 1;
  const endCount = content.split(LESSONS_END).length - 1;
  const start = content.indexOf(LESSONS_START);
  const end = content.indexOf(LESSONS_END);
  const residualMarkers = content
    .replaceAll(LESSONS_START, '')
    .replaceAll(LESSONS_END, '');
  const truncatedMarker = /<!--\s*skill-memory:lessons/i.test(residualMarkers);
  const absent = startCount === 0 && endCount === 0 && !truncatedMarker;
  const valid = startCount === 1 && endCount === 1 && start < end && !truncatedMarker;
  if (!absent && !valid) fail(1, `Malformed managed lesson section in ${path}`);
  return { path, content };
}

function normalizeLesson(lesson) {
  return lesson
    .trim()
    .split(/\r\n?|\n|\u2028|\u2029/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
}

function validateLesson(lesson) {
  const normalized = normalizeLesson(lesson);
  if (/<!--\s*skill-memory:lessons/i.test(normalized)) {
    fail(1, 'Lesson contains a reserved skill-memory marker');
  }
  return normalized;
}

function promoteLesson(skill, lesson) {
  const { path, content: existing } = readDefinition(skill);
  const normalized = validateLesson(lesson);
  const start = existing.indexOf(LESSONS_START);
  const end = existing.indexOf(LESSONS_END, start + LESSONS_START.length);
  const promotedLessons =
    start >= 0 && end > start
      ? existing
          .slice(start + LESSONS_START.length, end)
          .split(/\r?\n/)
          .map((line) => line.match(/^\s*-\s+(.+?)\s*$/)?.[1]?.toLowerCase())
          .filter(Boolean)
      : [];
  if (promotedLessons.includes(normalized.toLowerCase())) return false;

  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  let next;
  if (existing.includes(LESSONS_START) && existing.includes(LESSONS_END)) {
    next = existing.replace(LESSONS_END, `- ${normalized}${eol}${LESSONS_END}`);
  } else {
    const section = [
      LESSONS_START,
      '## Learned Improvements',
      '',
      `- ${normalized}`,
      LESSONS_END,
      '',
    ].join(eol);
    next = `${existing.trimEnd()}${eol}${eol}${section}`;
  }
  writeFileSync(path, next);
  return true;
}

function appendLesson(memoryDir, lesson) {
  const path = memoryFile(memoryDir, 'lessons.md');
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const normalized = validateLesson(lesson);
  // Dedupe whole lesson bullets; substrings can be distinct guidance.
  const recordedLessons = existing
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-\s+(.+?)\s*$/)?.[1]?.toLowerCase())
    .filter(Boolean);
  if (recordedLessons.includes(normalized.toLowerCase())) return false;

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

  const rawLesson = typeof args.lesson === 'string' ? args.lesson.trim() : null;
  if (rawLesson) validateLesson(rawLesson);

  const memoryDir = skillMemoryDir(args.skill);
  if (rawLesson) readDefinition(args.skill);
  const entry = {
    ts: new Date().toISOString(),
    skill: args.skill,
    task: typeof args.task === 'string' ? args.task : null,
    outcome: args.outcome,
    signals: args.signals,
    lesson: rawLesson ? normalizeLesson(rawLesson) : null,
    note: typeof args.note === 'string' ? args.note.trim() : null,
  };
  appendFileSync(memoryFile(memoryDir, 'worklog.jsonl'), `${JSON.stringify(entry)}\n`);

  let lessonAdded = false;
  let lessonPromoted = false;
  if (entry.lesson) {
    lessonAdded = appendLesson(memoryDir, entry.lesson);
    lessonPromoted = promoteLesson(args.skill, entry.lesson);
  }

  process.stdout.write(
    `${JSON.stringify({ logged: true, skill: args.skill, outcome: args.outcome, lessonAdded, lessonPromoted })}\n`,
  );
}

function commandLessons(args) {
  if (!args.skill) fail(1, 'lessons requires --skill <name>');
  const memoryDir = skillMemoryDir(args.skill);
  const path = memoryFile(memoryDir, 'lessons.md');
  if (!existsSync(path)) {
    process.stdout.write(`No recorded lessons for "${args.skill}" yet.\n`);
    return;
  }
  process.stdout.write(readFileSync(path, 'utf8'));
}

function commandSync(args) {
  if (!args.skill) fail(1, 'sync requires --skill <name>');
  const memoryDir = skillMemoryDir(args.skill);
  const path = memoryFile(memoryDir, 'lessons.md');
  const lessons = existsSync(path)
    ? readFileSync(path, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*-\s+(.+?)\s*$/)?.[1])
        .filter(Boolean)
    : [];
  let lessonsPromoted = 0;
  for (const lesson of lessons) {
    if (promoteLesson(args.skill, lesson)) lessonsPromoted += 1;
  }
  process.stdout.write(
    `${JSON.stringify({ synced: true, skill: args.skill, lessonsFound: lessons.length, lessonsPromoted })}\n`,
  );
}

function commandStats() {
  const tracked = existsSync(MEMORY_DIR)
    ? readdirSync(MEMORY_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : [];

  const summary = [];
  for (const skill of tracked) {
    const memoryDir = assertProspectiveInsideAgents(
      join(MEMORY_DIR, skill),
      'memory directory',
    );
    const path = memoryFile(memoryDir, 'worklog.jsonl');
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
      has_lessons: existsSync(memoryFile(memoryDir, 'lessons.md')),
    });
  }
  summary.sort((a, b) => b.runs - a.runs || a.skill.localeCompare(b.skill));
  process.stdout.write(`${JSON.stringify({ skills_tracked: summary.length, summary }, null, 2)}\n`);
}

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

if (command === 'log') commandLog(args);
else if (command === 'lessons') commandLessons(args);
else if (command === 'sync') commandSync(args);
else if (command === 'stats') commandStats();
else {
  fail(
    1,
    'Usage: skill-memory.mjs log --skill <name> --outcome pass|fail|partial [--task <id>] [--signal <cmd>]... [--lesson <text>] [--note <text>]\n' +
      '       skill-memory.mjs lessons --skill <name>\n' +
      '       skill-memory.mjs sync --skill <name>\n' +
      '       skill-memory.mjs stats',
  );
}
