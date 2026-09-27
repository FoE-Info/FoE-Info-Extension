#!/usr/bin/env node
/**
 * Enforce the release-version convention:
 *
 *   1. The current version must not already be tagged. Building or releasing a
 *      version that shipped weeks ago is how an artifact ends up labelled with a
 *      released number: the zip name and PROVENANCE.json are correct about the
 *      bytes and wrong about which release they belong to.
 *   2. If work has landed since the newest tag, the version must have moved off
 *      that tag. This is the "bump first" rule — the tree should never take new
 *      commits while still carrying a released version.
 *
 * Run: npm run version:check. Also runs inside `npm run verify`, and
 * `package-extension.js` refuses to build when check 1 fails.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/** The declared version, from the manifest the release pipeline reads. */
export function readVersion(root = ROOT) {
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
    .version;
}

/** `git` that never throws: no repo, no tag, or an orphan tag is a finding. */
function gitOut(root, args) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

/** Numeric semver compare, three parts. */
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/**
 * The highest existing tag by version, NOT `git describe --tags`.
 *
 * describe only sees tags reachable from HEAD. After a history rewrite the
 * release tags point at commits that are no longer on the branch, so describe
 * reports "no tags can describe" and this guard would pass with no reference to
 * the last release at all. The convention is written in version numbers, so
 * compare version numbers and read the commit count independently.
 */
export function newestTag(root = ROOT) {
  const tags = gitOut(root, ['tag', '-l', 'v*'])
    .split('\n')
    .filter(Boolean)
    .map((name) => ({ name, version: name.replace(/^v/, '') }))
    .filter((t) => /^\d+\.\d+\.\d+$/.test(t.version))
    .sort((a, b) => compareVersions(a.version, b.version));
  if (!tags.length) return null;
  const newest = tags[tags.length - 1];
  return { ...newest, sha: gitOut(root, ['rev-list', '-n', '1', newest.name]) };
}

export function checkVersion(root = ROOT) {
  const findings = [];
  const version = readVersion(root);
  const tag = newestTag(root);

  if (tag && tag.version === version) {
    findings.push({
      rule: 'already-tagged',
      detail:
        `version ${version} is already released as ${tag.name} ` +
        `(${tag.sha.slice(0, 7)}). Building or releasing it again produces an ` +
        'artifact labelled with a shipped version.',
    });
    const ahead = Number(
      gitOut(root, ['rev-list', '--count', `${tag.name}..HEAD`]),
    );
    if (Number.isFinite(ahead) && ahead > 0) {
      findings.push({
        rule: 'bump-first',
        detail:
          `${ahead} commit(s) have landed since ${tag.name} while the version ` +
          `is still ${version}. The first change after a release increments it.`,
      });
    }
  }

  return { version, tag, findings };
}

function main() {
  const { version, tag, findings } = checkVersion();

  if (findings.length === 0) {
    console.log(
      `  ✓ version ${version}` +
        (tag ?
          ` (newest release ${tag.name}, ${tag.sha.slice(0, 7)})`
        : ' (no tags yet)'),
    );
    return 0;
  }
  for (const f of findings) console.error(`  ✖ [${f.rule}] ${f.detail}`);
  return 1;
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(path.basename(process.argv[1]))
) {
  process.exit(main());
}
