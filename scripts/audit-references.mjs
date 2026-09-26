#!/usr/bin/env node
/** Check extension documentation links, npm commands, and script entrypoints. */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const published = process.argv.includes('--scope=published');
const privatePath =
  /(?:^|\/)\.env(?:\.|$)|\.(?:pem|key)$|^(?:node_modules|build|dist|coverage)\//;
// Reject retired automation even if someone force-adds ignored files.
const retiredPath =
  /^(?:\.agents|\.codex|\.omp|\.opencode|\.claude|\.gemini|\.cursor|graphify-out|\.workspace|\.venv|\.uv|\.worktrees|worktrees)(?:\/|$)|^(?:AGENTS|CLAUDE|GEMINI)\.md$|^\.(?:graphifyignore|mise\.toml|audit-siblings)$|^(?:mise\.lock|pyproject\.toml|uv\.lock)$|^scripts\/graphify\//;
const files = [
  ...new Set(
    execFileSync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { cwd: root, encoding: 'utf8' },
    )
      .split('\0')
      .filter(Boolean),
  ),
].filter((file) => existsSync(resolve(root, file)));
const available = new Set(files);
const scripts =
  JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).scripts || {};
const findings = [];
function add(file, token, kind) {
  findings.push({ file, token, kind });
}
function checkPath(file, token, markdown = false) {
  let target = token.split('#')[0].split('?')[0];
  if (
    !target ||
    /^(?:[a-z]+:|\/\/)/i.test(target) ||
    target.includes('<') ||
    target.includes('*')
  )
    return;
  try {
    target = decodeURIComponent(target);
  } catch {
    add(file, token, 'invalid-path');
    return;
  }
  if (isAbsolute(target)) return;
  const candidates =
    markdown ?
      [resolve(root, dirname(file), target)]
    : [resolve(root, target), resolve(root, dirname(file), target)];
  const valid = candidates.some((path) => {
    if (!existsSync(path)) return false;
    const name = relative(root, path).replaceAll('\\', '/');
    if (
      name.startsWith('../') ||
      privatePath.test(name) ||
      retiredPath.test(name)
    )
      return false;
    if (!published) return true;
    return statSync(path).isDirectory() ?
        files.some((f) => f.startsWith(name + '/'))
      : available.has(name);
  });
  if (!valid) add(file, token, 'missing-path');
}
for (const file of files) {
  if (published && (privatePath.test(file) || retiredPath.test(file)))
    add(file, file, 'forbidden-publication');
  if (!file.endsWith('.md')) continue;
  const text = readFileSync(resolve(root, file), 'utf8');
  for (const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g))
    checkPath(file, match[1], true);
  for (const match of text.matchAll(/`([^`\n]+)`/g)) {
    const token = match[1];
    if (/^(?:src|scripts|tests|docs)\/[\w./-]+$/.test(token))
      checkPath(file, token);
    for (const command of token.matchAll(/\bnpm run ([\w:-]+)/g))
      if (!Object.hasOwn(scripts, command[1]))
        add(file, command[1], 'missing-npm-script');
  }
}
for (const [name, command] of Object.entries(scripts)) {
  for (const match of command.matchAll(
    /(?:\bnode\s+|--config\s+|-p\s+)([\w./-]+\.(?:json|[cm]?js)\b)/g,
  ))
    checkPath('package.json', match[1]);
  for (const match of command.matchAll(/\bnpm run ([\w:-]+)/g))
    if (!Object.hasOwn(scripts, match[1]))
      add('package.json', `${name}: ${match[1]}`, 'missing-npm-script');
}
if (process.argv.includes('--json'))
  console.log(JSON.stringify({ findings }, null, 2));
else {
  for (const item of findings)
    console.error(`${item.file}: ${item.kind}: ${item.token}`);
  console.log(
    `Reference audit: ${findings.length} findings across ${files.length} extension files.`,
  );
}
process.exitCode = findings.length ? 1 : 0;
