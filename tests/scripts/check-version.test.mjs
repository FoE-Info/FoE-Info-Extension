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
const SCRIPT = path.join(root, 'scripts', 'check-version.mjs');
const { checkVersion, newestTag } = await import(SCRIPT);

const git = (cwd, ...args) =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();

/**
 * A throwaway repository sitting at `version`.
 *
 * `orphanTag` reproduces the state a history rewrite leaves behind: the branch
 * no longer contains the tagged commit, so `git describe --tags` finds nothing
 * even though the release tag exists. A describe-based check passes silently
 * there, which is the bug this fixture pins.
 */
function fixture({ version, tagVersion, extraCommits = 0, orphanTag = false }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'version-check-'));
  const writePkg = (v) =>
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'x', version: v }, null, 2),
    );
  const commit = (msg) => {
    git(dir, 'add', '-A');
    git(dir, 'commit', '-qm', msg);
  };
  const touch = (name, body) => {
    fs.writeFileSync(path.join(dir, name), body);
    commit(name);
  };

  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 'T');

  writePkg(version);
  commit('state at the version under test');

  if (tagVersion && orphanTag) {
    // Tag a LATER commit, then branch off before it: the tag ends up on a
    // commit that is not an ancestor of HEAD.
    touch('side.txt', 'side');
    git(dir, 'tag', '-a', `v${tagVersion}`, '-m', `release ${tagVersion}`);
    git(dir, 'reset', '-q', '--hard', 'HEAD~1');
    touch('diverged.txt', 'diverged');
  } else {
    if (tagVersion)
      git(dir, 'tag', '-a', `v${tagVersion}`, '-m', `release ${tagVersion}`);
    for (let i = 0; i < extraCommits; i++) touch(`f${i}.txt`, String(i));
  }
  return dir;
}

test('passes when the version is ahead of the last release', () => {
  const dir = fixture({
    version: '0.0.835',
    tagVersion: '0.0.834',
    extraCommits: 1,
  });
  const { findings } = checkVersion(dir);
  assert.deepEqual(findings, []);
});

test('flags a version that is already released', () => {
  const dir = fixture({ version: '0.0.834', tagVersion: '0.0.834' });
  const { findings } = checkVersion(dir);
  assert.deepEqual(
    findings.map((f) => f.rule),
    ['already-tagged'],
  );
  assert.match(findings[0].detail, /already released as v0\.0\.834/);
});

test('flags commits landed on a released version', () => {
  const dir = fixture({
    version: '0.0.834',
    tagVersion: '0.0.834',
    extraCommits: 1,
  });
  const { findings } = checkVersion(dir);
  assert.deepEqual(
    findings.map((f) => f.rule),
    ['already-tagged', 'bump-first'],
  );
  assert.match(findings[1].detail, /1 commit\(s\) have landed/);
});

test('finds the release when the tag is not reachable from HEAD', () => {
  // git describe reports nothing here; the check must still see v0.0.834.
  const dir = fixture({
    version: '0.0.834',
    tagVersion: '0.0.834',
    orphanTag: true,
  });
  assert.throws(() => git(dir, 'describe', '--tags', '--abbrev=0'));
  assert.equal(newestTag(dir).version, '0.0.834');
  // The branch also carries a commit that is not the release, so both rules
  // fire: the version is shipped, and work landed on top of it.
  assert.deepEqual(
    checkVersion(dir).findings.map((f) => f.rule),
    ['already-tagged', 'bump-first'],
  );
});

test('picks the highest tag, not the first one listed', () => {
  const dir = fixture({ version: '0.0.835', tagVersion: '0.0.833' });
  git(dir, 'tag', '-a', 'v0.0.834', '-m', 'r');
  assert.equal(newestTag(dir).version, '0.0.834');
  assert.deepEqual(checkVersion(dir).findings, []);
});

test('passes when the repository has no tags yet', () => {
  const dir = fixture({ version: '0.0.1' });
  assert.equal(newestTag(dir), null);
  assert.deepEqual(checkVersion(dir).findings, []);
});
