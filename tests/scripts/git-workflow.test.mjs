import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const SCRIPT = path.join(root, 'scripts', 'git-workflow.mjs');
const { applyGitWorkflow, WORKFLOW_SETTINGS } = await import(SCRIPT);

/**
 * A git invocation that cannot see the developer's own `~/.gitconfig`.
 *
 * Isolation is the point, not hygiene: a `pull.rebase` left in the global
 * config would satisfy every assertion below even if this script wrote
 * nothing at all, and the test would pass for the wrong reason.
 */
let env = null;
function gitEnv() {
  if (env === null) {
    const blank = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'git-workflow-cfg-')),
      'gitconfig',
    );
    fs.writeFileSync(blank, '');
    env = { ...process.env, GIT_CONFIG_GLOBAL: blank };
  }
  return env;
}

function run(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    env: gitEnv(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

function git(cwd, ...args) {
  return run(cwd, args).trim();
}

/** Untrimmed: `git status --porcelain` is column-aligned and leading space
 *  is the staged/unstaged column. */
function gitColumns(cwd, ...args) {
  return run(cwd, args).trimEnd();
}

const tempDirs = [];
function temp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

test.after(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

/**
 * A bare origin plus a clone that has diverged from it: `local` holds one
 * unpushed commit, `seed` holds one published commit. That is exactly the
 * state `git pull` meets on a busy `development`.
 */
function divergedFixture() {
  const base = temp('git-workflow-');
  const origin = path.join(base, 'origin.git');
  const seed = path.join(base, 'seed');
  const local = path.join(base, 'local');

  git(base, 'init', '-q', '--bare', '-b', 'main', origin);
  git(base, 'clone', '-q', origin, seed);
  for (const repo of [seed]) {
    git(repo, 'config', 'user.email', 't@example.com');
    git(repo, 'config', 'user.name', 'T');
  }
  fs.writeFileSync(path.join(seed, 'base.txt'), 'base\n');
  git(seed, 'add', '-A');
  git(seed, 'commit', '-qm', 'chore: base');
  git(seed, 'push', '-q', 'origin', 'main');

  git(base, 'clone', '-q', origin, local);
  git(local, 'config', 'user.email', 't@example.com');
  git(local, 'config', 'user.name', 'T');
  return { base, origin, seed, local };
}

test('a pull after apply rebases instead of writing a merge commit', () => {
  const { local, seed } = divergedFixture();

  // Published after the clone: origin moves under `local`.
  fs.writeFileSync(path.join(seed, 'upstream.txt'), 'upstream\n');
  git(seed, 'add', '-A');
  git(seed, 'commit', '-qm', 'feat: upstream work');
  git(seed, 'push', '-q', 'origin', 'main');

  // Unpushed: `local` has work of its own to replay.
  fs.writeFileSync(path.join(local, 'local.txt'), 'local\n');
  git(local, 'add', '-A');
  git(local, 'commit', '-qm', 'fix: local work');

  assert.equal(applyGitWorkflow(local).skipped, null);
  git(local, 'pull');

  assert.equal(
    git(local, 'rev-list', '--count', '--merges', 'HEAD'),
    '0',
    'pull must not create a merge commit',
  );
  assert.equal(
    git(local, 'log', '-1', '--pretty=%s'),
    'fix: local work',
    'local commits must land on top of the upstream ones',
  );
  assert.equal(git(local, 'rev-list', '--count', 'HEAD'), '3');
});

test('an explicit rebase survives an uncommitted change', () => {
  const { local, seed } = divergedFixture();

  fs.writeFileSync(path.join(seed, 'upstream.txt'), 'upstream\n');
  git(seed, 'add', '-A');
  git(seed, 'commit', '-qm', 'feat: upstream work');
  git(seed, 'push', '-q', 'origin', 'main');

  fs.writeFileSync(path.join(local, 'local.txt'), 'local\n');
  git(local, 'add', '-A');
  git(local, 'commit', '-qm', 'fix: local work');
  git(local, 'fetch', '-q', 'origin');

  assert.equal(applyGitWorkflow(local).skipped, null);

  // A modification to a TRACKED file is the case that can tell this setting
  // apart: untracked files never block a rebase, and `git pull --rebase`
  // stashes implicitly (git >= 2.27). A bare `git rebase` does neither, so
  // without rebase.autoStash it aborts on the very next line.
  fs.writeFileSync(path.join(local, 'base.txt'), 'work in progress\n');

  git(local, 'rebase', 'origin/main');

  assert.equal(
    fs.readFileSync(path.join(local, 'base.txt'), 'utf8'),
    'work in progress\n',
  );
  assert.equal(gitColumns(local, 'status', '--porcelain'), ' M base.txt');
  assert.equal(git(local, 'log', '-1', '--pretty=%s'), 'fix: local work');
});

test('an interactive rebase folds a fixup! commit into its target', () => {
  const { local } = divergedFixture();
  assert.equal(applyGitWorkflow(local).skipped, null);

  // The commit-msg hook already accepts `fixup!` subjects for exactly this
  // workflow, so the pair below has to be foldable without an explicit
  // --autosquash on the command line.
  git(local, 'commit', '-q', '--allow-empty', '-m', 'feat(x): real change');
  git(
    local,
    'commit',
    '-q',
    '--allow-empty',
    '-m',
    'fixup! feat(x): real change',
  );

  execFileSync('git', ['rebase', '-i', 'HEAD~2'], {
    cwd: local,
    // Accept the generated todo list as-is; only the ordering is under test.
    env: { ...gitEnv(), GIT_SEQUENCE_EDITOR: 'true' },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  assert.equal(git(local, 'rev-list', '--count', 'HEAD'), '2');
  assert.equal(git(local, 'log', '-1', '--pretty=%s'), 'feat(x): real change');
});

test('re-applying reports every setting as already set', () => {
  const { local } = divergedFixture();

  const first = applyGitWorkflow(local);
  assert.deepEqual(
    first.applied,
    WORKFLOW_SETTINGS.map(([key]) => key),
  );
  assert.deepEqual(first.unchanged, []);

  const second = applyGitWorkflow(local);
  assert.deepEqual(second.applied, []);
  assert.deepEqual(
    second.unchanged,
    WORKFLOW_SETTINGS.map(([key]) => key),
  );
});

test('a directory outside a repository is skipped, not crashed on', () => {
  const plain = temp('git-workflow-bare-');
  const result = applyGitWorkflow(plain);

  assert.equal(result.skipped, 'not-a-git-repository');
  assert.deepEqual(result.applied, []);
});
