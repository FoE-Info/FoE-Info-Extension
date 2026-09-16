#!/usr/bin/env node

import {
  closeSync,
  existsSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const AGENTS_ROOT = process.env.PROJECT_CURATOR_ROOT
  ? resolve(process.env.PROJECT_CURATOR_ROOT)
  : join(REPO_ROOT, '.agents');
const LESSONS_START = '<!-- skill-memory:lessons:start -->';
const LESSONS_END = '<!-- skill-memory:lessons:end -->';

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function relativePath(path) {
  return relative(AGENTS_ROOT, path).split(sep).join('/');
}

function assertInside(path, label) {
  const root = realpathSync(AGENTS_ROOT);
  const target = realpathSync(path);
  const fromRoot = relative(root, target);
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    fail(`Refusing ${label} outside the configured agents root: ${path}`);
  }
  return path;
}

function safeEntries(directory, label) {
  if (!existsSync(directory)) return [];
  assertInside(directory, label);
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function discoverSkills(directory, found = []) {
  for (const entry of safeEntries(directory, 'skills directory')) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) fail(`Refusing symlinked skill path: ${path}`);
    if (!entry.isDirectory()) continue;
    assertInside(path, 'skill directory');
    const definition = join(path, 'SKILL.md');
    if (existsSync(definition)) {
      if (lstatSync(definition).isSymbolicLink()) {
        fail(`Refusing symlinked definition: ${definition}`);
      }
      assertInside(definition, 'definition');
      found.push({
        name: entry.name,
        type: 'skill',
        path: relativePath(definition),
        absolutePath: definition,
      });
    } else {
      discoverSkills(path, found);
    }
  }
  return found;
}

function discoverAgents(directory) {
  return safeEntries(directory, 'agents directory').flatMap((entry) => {
    if (!entry.name.endsWith('.md')) return [];
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) fail(`Refusing symlinked agent definition: ${path}`);
    if (!entry.isFile()) return [];
    assertInside(path, 'definition');
    return [
      {
        name: entry.name.slice(0, -3),
        type: 'agent',
        path: relativePath(path),
        absolutePath: path,
      },
    ];
  });
}

function lessonBullets(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*-\s+(.+?)\s*$/)?.[1])
    .filter(Boolean);
}

function uniqueLessons(lessons) {
  const seen = new Set();
  return lessons.filter((lesson) => {
    const key = lesson.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function managedSection(content, path) {
  const startCount = content.split(LESSONS_START).length - 1;
  const endCount = content.split(LESSONS_END).length - 1;
  const residualMarkers = content
    .replaceAll(LESSONS_START, '')
    .replaceAll(LESSONS_END, '');
  const truncatedMarker = /<!--\s*skill-memory:lessons/i.test(residualMarkers);
  const start = content.indexOf(LESSONS_START);
  const end = content.indexOf(LESSONS_END);
  const absent = startCount === 0 && endCount === 0 && !truncatedMarker;
  const valid = startCount === 1 && endCount === 1 && start < end && !truncatedMarker;
  if (!absent && !valid) fail(`Malformed managed lesson section in ${path}`);
  return { absent, start, end };
}

function managedLessons(content, path) {
  const { absent, start, end } = managedSection(content, path);
  if (absent) return [];
  return lessonBullets(content.slice(start + LESSONS_START.length, end));
}

function atomicWrite(path, content) {
  const temporary = join(
    dirname(path),
    `.${randomBytes(16).toString('hex')}.project-curator.tmp`,
  );
  let descriptor;
  let owned = false;
  try {
    descriptor = openSync(temporary, 'wx', statSync(path).mode);
    owned = true;
    writeFileSync(descriptor, content);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, path);
    owned = false;
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (owned) {
      try {
        unlinkSync(temporary);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') throw cleanupError;
      }
    }
    throw error;
  }
}

function promoteLessons(path, lessons) {
  const existing = readFileSync(path, 'utf8');
  const section = managedSection(existing, path);
  const promoted = new Set(managedLessons(existing, path).map((lesson) => lesson.toLowerCase()));
  const novel = uniqueLessons(lessons).filter(
    (lesson) => !promoted.has(lesson.toLowerCase()),
  );
  if (!novel.length) return 0;
  if (novel.some((lesson) => /<!--\s*skill-memory:lessons/i.test(lesson))) {
    fail(`Stored lesson contains a reserved skill-memory marker for ${path}`);
  }
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  let next;
  if (section.absent) {
    const block = [
      LESSONS_START,
      '## Learned Improvements',
      '',
      ...novel.map((lesson) => `- ${lesson}`),
      LESSONS_END,
      '',
    ].join(eol);
    next = `${existing.trimEnd()}${eol}${eol}${block}`;
  } else {
    next = existing.replace(
      LESSONS_END,
      `${novel.map((lesson) => `- ${lesson}`).join(eol)}${eol}${LESSONS_END}`,
    );
  }
  atomicWrite(path, next);
  return novel.length;
}

function emptyReport(command, staleDays, definitions) {
  return {
    command,
    applied: false,
    changedDefinitions: [],
    staleDays,
    counts: {
      agents: definitions.filter(({ type }) => type === 'agent').length,
      definitions: definitions.length,
      skills: definitions.filter(({ type }) => type === 'skill').length,
      tracked: 0,
      worklogEntries: 0,
      storedLessons: 0,
      missingStoredLessons: 0,
      lessonsPromoted: 0,
      staleDefinitions: 0,
      duplicateLessonGroups: 0,
      duplicateReferenceGroups: 0,
      warnings: 0,
    },
    definitions: definitions.map(({ absolutePath: _absolutePath, ...item }) => item),
    candidates: {
      missingStoredLessons: [],
      staleDefinitions: [],
      duplicateLessons: [],
      duplicateReferences: [],
    },
    usage: [],
    warnings: [],
  };
}

function audit(command, staleDays) {
  if (!existsSync(AGENTS_ROOT)) fail(`Configured agents root does not exist: ${AGENTS_ROOT}`);
  if (lstatSync(AGENTS_ROOT).isSymbolicLink()) fail(`Refusing symlinked agents root: ${AGENTS_ROOT}`);
  const definitions = [
    ...discoverSkills(join(AGENTS_ROOT, 'skills')),
    ...discoverAgents(join(AGENTS_ROOT, 'agents')),
  ].sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
  const duplicateNames = definitions.filter(
    (definition, index) => definitions.findIndex(({ name }) => name === definition.name) !== index,
  );
  if (duplicateNames.length) {
    fail(`Duplicate definition name: ${duplicateNames[0].name}`);
  }
  const report = emptyReport(command, staleDays, definitions);
  const lessonOwners = new Map();
  const referenceOwners = new Map();
  for (const definition of definitions) {
    const definitionContent = readFileSync(definition.absolutePath, 'utf8');
    for (const lesson of managedLessons(definitionContent, definition.absolutePath)) {
      const key = lesson.toLowerCase();
      const group = lessonOwners.get(key) ?? { lesson, definitions: [] };
      if (!group.definitions.includes(definition.name)) {
        group.definitions.push(definition.name);
      }
      lessonOwners.set(key, group);
    }
    if (definition.type === 'skill') {
      const referencePath = join(
        dirname(definition.absolutePath),
        'references',
        'skill-memory.md',
      );
      if (existsSync(referencePath)) {
        if (lstatSync(referencePath).isSymbolicLink()) {
          fail(`Refusing symlinked reference file: ${referencePath}`);
        }
        assertInside(referencePath, 'reference file');
        const sha256 = createHash('sha256')
          .update(readFileSync(referencePath))
          .digest('hex');
        const paths = referenceOwners.get(sha256) ?? [];
        paths.push(relativePath(referencePath));
        referenceOwners.set(sha256, paths);
      }
    }

    const lessonsPath = join(AGENTS_ROOT, 'memory', definition.name, 'lessons.md');
    if (existsSync(lessonsPath)) {
      if (lstatSync(lessonsPath).isSymbolicLink()) {
        fail(`Refusing symlinked memory file: ${lessonsPath}`);
      }
      assertInside(lessonsPath, 'memory file');
      const stored = uniqueLessons(lessonBullets(readFileSync(lessonsPath, 'utf8')));
      report.counts.storedLessons += stored.length;
      const promoted = new Set(
        managedLessons(definitionContent, definition.absolutePath).map((lesson) =>
          lesson.toLowerCase(),
        ),
      );
      const missing = stored.filter((lesson) => !promoted.has(lesson.toLowerCase()));
      if (missing.length) {
        report.counts.missingStoredLessons += missing.length;
        report.candidates.missingStoredLessons.push({ name: definition.name, lessons: missing });
      }
    }

    const worklogPath = join(AGENTS_ROOT, 'memory', definition.name, 'worklog.jsonl');
    if (!existsSync(worklogPath)) continue;
    if (lstatSync(worklogPath).isSymbolicLink()) {
      fail(`Refusing symlinked memory file: ${worklogPath}`);
    }
    assertInside(worklogPath, 'memory file');
    const entries = [];
    for (const [index, line] of readFileSync(worklogPath, 'utf8').split(/\r?\n/).entries()) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line));
      } catch {
        report.warnings.push({
          path: relativePath(worklogPath),
          line: index + 1,
          warning: 'invalid JSONL line ignored',
        });
      }
    }
    if (!entries.length) continue;
    report.counts.tracked += 1;
    report.counts.worklogEntries += entries.length;
    const lastUsed = entries
      .map((entry) =>
        entry && typeof entry === 'object' && typeof entry.ts === 'string' ? entry.ts : null,
      )
      .filter((ts) => ts !== null && Number.isFinite(Date.parse(ts)))
      .reduce(
        (latest, timestamp) =>
          latest === null || Date.parse(timestamp) > Date.parse(latest) ? timestamp : latest,
        null,
      );
    const outcomes = { pass: 0, fail: 0, partial: 0, other: 0 };
    for (const entry of entries) {
      if (
        entry &&
        typeof entry === 'object' &&
        Object.hasOwn(outcomes, entry.outcome)
      ) {
        outcomes[entry.outcome] += 1;
      } else {
        outcomes.other += 1;
      }
    }
    report.usage.push({
      name: definition.name,
      runs: entries.length,
      outcomes,
      lastUsed,
    });
    if (lastUsed && Date.now() - Date.parse(lastUsed) > staleDays * 86_400_000) {
      report.candidates.staleDefinitions.push({ name: definition.name, lastUsed });
    }
  }
  report.candidates.duplicateLessons = [...lessonOwners.values()]
    .filter(({ definitions: owners }) => owners.length > 1)
    .map(({ lesson, definitions: owners }) => ({
      lesson,
      definitions: owners.sort(),
    }))
    .sort((a, b) => a.lesson.localeCompare(b.lesson));
  report.candidates.duplicateReferences = [...referenceOwners.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([sha256, paths]) => ({ sha256, paths: paths.sort() }))
    .sort((a, b) => a.sha256.localeCompare(b.sha256));
  report.counts.staleDefinitions = report.candidates.staleDefinitions.length;
  report.counts.duplicateLessonGroups = report.candidates.duplicateLessons.length;
  report.counts.duplicateReferenceGroups = report.candidates.duplicateReferences.length;
  report.counts.warnings = report.warnings.length;
  return report;
}

function parseArgs(argv) {
  const command = argv[0];
  let staleDays = 30;
  let apply = false;
  for (let index = 1; index < argv.length; index += 1) {
    if (argv[index] === '--apply') apply = true;
    else if (argv[index] === '--stale-days') {
      staleDays = Number(argv[index + 1]);
      index += 1;
    } else fail(`Unknown option: ${argv[index]}`);
  }
  if (!Number.isInteger(staleDays) || staleDays < 0) {
    fail('--stale-days must be a non-negative integer');
  }
  return { command, staleDays, apply };
}

function execute(command, staleDays, apply) {
  let report = audit(command, staleDays);
  if (command !== 'run' || !apply) return report;

  let lessonsPromoted = 0;
  const changedDefinitions = [];
  const definitionsByName = new Map(report.definitions.map((item) => [item.name, item]));
  for (const candidate of report.candidates.missingStoredLessons) {
    const definition = definitionsByName.get(candidate.name);
    if (!definition) fail(`Missing definition for candidate: ${candidate.name}`);
    const path = join(AGENTS_ROOT, definition.path);
    assertInside(path, 'definition');
    const promoted = promoteLessons(path, candidate.lessons);
    if (promoted > 0) {
      lessonsPromoted += promoted;
      changedDefinitions.push(candidate.name);
    }
  }

  report = audit(command, staleDays);
  report.applied = true;
  report.counts.lessonsPromoted = lessonsPromoted;
  report.changedDefinitions = changedDefinitions.sort();
  return report;
}

const { command, staleDays, apply } = parseArgs(process.argv.slice(2));
if (command !== 'status' && command !== 'run') {
  fail('Usage: project-curator.mjs status [--stale-days N]\n       project-curator.mjs run [--stale-days N] [--apply]');
}
if (command === 'status' && apply) fail('status does not accept --apply');
process.stdout.write(`${JSON.stringify(execute(command, staleDays, apply), null, 2)}\n`);
