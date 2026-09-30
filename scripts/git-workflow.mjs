#!/usr/bin/env node
/**
 * git-workflow.mjs — apply this repository's git defaults to a clone.
 *
 * `development` is linear: it is fast-forwarded, work arrives through
 * short-lived branches, and no merge commit is ever authored on top of it.
 * These settings make a plain `git pull` behave that way instead of leaving it
 * to a convention every contributor has to remember:
 *
 *   pull.rebase       — `git pull` replays local commits onto the upstream
 *                       instead of creating a merge commit.
 *   rebase.autoStash  — a dirty working tree survives a `git rebase`. `git
 *                       pull --rebase` already stashes implicitly (git 2.27+),
 *                       so this extends the same safety to a rebase run by
 *                       hand.
 *   rebase.autosquash — `git rebase -i` folds `fixup!`/`squash!` commits,
 *                       which `scripts/validate-commit-msg.mjs` already
 *                       permits. Git applies it to `rebase -i` only; the
 *                       non-interactive rebase behind `git pull --rebase` does
 *                       not autosquash.
 *
 * Everything is written with `--local`, so a clone carries the workflow and one
 * developer's preference never leaks into anyone else's. Run: `npm run
 * setup:git`; `scripts/setup.mjs` applies the same settings during bootstrap.
 *
 * This does not touch history, tags, or the index — it is a config write, and
 * it belongs to no verification gate.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/** [key, value] pairs, in the order they are reported. */
export const WORKFLOW_SETTINGS = [
  ['pull.rebase', 'true'],
  ['rebase.autoStash', 'true'],
  ['rebase.autosquash', 'true'],
];

function git(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

/** Current local value of `key`, or `''` when unset (`--get` exits 1 then). */
function readLocal(root, key) {
  try {
    return git(root, ['config', '--local', '--get', key]);
  } catch {
    return '';
  }
}

/**
 * Apply the settings to the repository containing `root`.
 *
 * Idempotent: a key already holding the target value is reported as unchanged
 * rather than rewritten. Never throws — a missing `git`, or a directory that is
 * not a repository at all, is a `skipped` reason rather than a crash, because
 * `scripts/setup.mjs` calls this during bootstrap.
 *
 * @returns {{applied: string[], unchanged: string[], skipped: string|null}}
 */
export function applyGitWorkflow(root = ROOT) {
  const result = { applied: [], unchanged: [], skipped: null };

  try {
    git(root, ['rev-parse', '--git-dir']);
  } catch (err) {
    result.skipped =
      err?.code === 'ENOENT' ? 'git-not-installed' : 'not-a-git-repository';
    return result;
  }

  for (const [key, value] of WORKFLOW_SETTINGS) {
    if (readLocal(root, key) === value) {
      result.unchanged.push(key);
      continue;
    }
    git(root, ['config', '--local', key, value]);
    result.applied.push(key);
  }
  return result;
}

function main() {
  const { applied, unchanged, skipped } = applyGitWorkflow();
  if (skipped) {
    console.error(`  ✖ git workflow defaults not applied: ${skipped}`);
    return 1;
  }
  for (const key of applied) console.log(`  ✓ git ${key} = true`);
  for (const key of unchanged) console.log(`  · git ${key} already set`);
  return 0;
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(path.basename(process.argv[1]))
) {
  process.exit(main());
}
