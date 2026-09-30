#!/usr/bin/env node
/** Verify pending publishable files with freshly installed dependencies. */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { sourceSnapshot } from './lib/source-snapshot.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OMIT =
  /^(?:\.git|node_modules|build|dist|coverage|scratch|metadata-store|\.venv|\.uv|\.vscode|\.idea|\.worktrees|worktrees|\.audit-siblings)(?:\/|$)|(?:^|\/)\.env(?:\.[^/]*)?$|^\.envrc$|^\.codex\/auth\.json$|^\.agents\/\.last_graph_query_stamp$|^\.husky\/\.graphify-python$|\.(?:zip|crx|pem|key)$/;

export function publishableFiles(root, git = execFileSync) {
  const tracked = new Set(
    git('git', ['ls-files', '--cached', '-z'], { cwd: root, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean),
  );
  const paths = git(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8' },
  )
    .split('\0')
    .filter(Boolean);
  return [...new Set(paths)]
    .filter(
      (path) =>
        !OMIT.test(path) &&
        (!path.startsWith('graphify-out/') || tracked.has(path)) &&
        existsSync(join(root, path)),
    )
    .sort();
}

export function verifyExport(
  root,
  { parent = tmpdir(), run = spawnSync, git = execFileSync } = {},
) {
  const destinationParent = resolve(parent);
  if (
    destinationParent === resolve(root) ||
    destinationParent.startsWith(resolve(root) + sep)
  )
    throw new Error('Export destination must be outside the source repository');
  const files = publishableFiles(root, git);
  const directory = mkdtempSync(join(destinationParent, 'foe-verify-export-'));
  const source = {
    root: resolve(root),
    head: git('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim(),
    ...sourceSnapshot(root),
  };
  for (const path of files) {
    const origin = join(root, path);
    if (!lstatSync(origin).isFile())
      throw new Error(`Export requires regular files: ${path}`);
    const target = join(directory, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(origin, target);
  }
  const exportedSource = sourceSnapshot(directory);
  if (source.digest !== exportedSource.digest)
    throw new Error(`Export source identity mismatch: ${directory}`);
  const evidence = join(directory, 'build/export-evidence');
  mkdirSync(evidence, { recursive: true });
  const manifest = {
    source,
    directory,
    files,
    startedAt: new Date().toISOString(),
    steps: [],
  };
  const save = () =>
    writeFileSync(
      join(evidence, 'export.json'),
      JSON.stringify(manifest, null, 2) + '\n',
    );
  save();
  const env = {
    ...process.env,
    HUSKY: '0',
    CI_TEST_EVIDENCE_DIR: evidence,
  };
  for (const key of Object.keys(env)) {
    if (key.toLowerCase() === 'npm_config_allow_scripts') delete env[key];
  }
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  // The published-reference gate queries Git. This fresh index has no source history.
  for (const [command, args] of [
    ['git', ['init', '--quiet']],
    ['git', ['add', '--all']],
    [npm, ['ci']],
    [npm, ['run', 'verify:evidence']],
  ]) {
    const result = run(command, args, {
      cwd: directory,
      env,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      shell: process.platform === 'win32' && command === npm,
    });
    const step = {
      command,
      args,
      exitCode: result.status ?? 1,
      signal: result.signal ?? null,
      error: result.error?.message ?? null,
    };
    manifest.steps.push(step);
    const log = `${result.stdout || ''}${result.stderr || ''}${result.error ? result.error.message + '\n' : ''}`;
    writeFileSync(join(evidence, `step-${manifest.steps.length}.log`), log);
    process.stdout.write(log);
    save();
    if (step.exitCode !== 0) {
      manifest.finishedAt = new Date().toISOString();
      save();
      return { directory, evidence, exitCode: step.exitCode };
    }
  }
  manifest.finishedAt = new Date().toISOString();
  save();
  return { directory, evidence, exitCode: 0 };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = verifyExport(ROOT);
    console.log(`Isolated export evidence: ${result.evidence}`);
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
