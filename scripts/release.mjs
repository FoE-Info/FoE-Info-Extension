#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const VERSION_PATTERN = /^\d+\.\d+\.\d+([-+][\w.-]+)?$/;

/**
 * Compute the UTC-midnight release date once so release.mjs and
 * package-extension.js agree on the artifact filename.
 */
function releaseDateUtc() {
  return new Date().toISOString().slice(0, 10);
}

function run(cmd, args, options = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...options });
}

function git(...args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const manifest = JSON.parse(
  readFileSync(join(ROOT, 'src/chrome/manifest.json'), 'utf8'),
);

if (pkg.version !== manifest.version) {
  fail(
    `Version mismatch: package.json (${pkg.version}) !== manifest.json (${manifest.version})`,
  );
}

const version = pkg.version;
if (!VERSION_PATTERN.test(version)) {
  fail(
    `Refusing to release: version "${version}" does not match expected semver pattern.`,
  );
}

const tag = `v${version}`;
const releaseDate = releaseDateUtc();

console.log(`=== Releasing FoE-Info ${tag} ===\n`);
console.log(`Release date (UTC): ${releaseDate}`);
console.log(`Release root      : ${ROOT}`);

// 0. Preconditions — clean tree, branch rules, CLI availability.
console.log('\n[0/5] Verifying Preconditions...');

const dirty = git('status', '--porcelain');
if (dirty.length > 0) {
  console.error(
    'The worktree is dirty. Release builds must be produced from a clean tree.\n' +
      'Commit or stash your changes, then re-run.\n\nDirty path(s):',
  );
  for (const line of dirty.split('\n').filter(Boolean)) {
    console.error(`  ${line}`);
  }
  process.exit(1);
}
console.log('  ✓ Worktree is clean.');

const headSha = git('rev-parse', 'HEAD');
console.log(`  ✓ HEAD @ ${headSha}`);

// Refuse to reuse a tag that points at a different source revision.
const tagSha = (() => {
  try {
    return git('rev-list', '-n', '1', `refs/tags/${tag}`);
  } catch {
    return null;
  }
})();
if (tagSha) {
  if (tagSha !== headSha) {
    fail(
      `Tag ${tag} already exists and points at ${tagSha}, not HEAD (${headSha}).\n` +
        'Delete the stale local tag or bump the version, then retry.',
    );
  }
  console.log(`  ✓ Tag ${tag} already exists at ${tagSha}; will reuse it.`);
} else {
  console.log(`  ✓ Tag ${tag} is free.`);
}

run('gh', ['auth', 'status']);

// 1. Run full verification gate
console.log('\n[1/5] Running verification gate...');
run('npm', ['run', 'verify']);

// 2. Build production assets and package zip
console.log('\n[2/5] Building and packaging production WebStore archive...');
run('npm', ['run', 'build:prod']);
run('node', [
  'scripts/package-extension.js',
  '--env=prod',
  `--date=${releaseDate}`,
]);

// 3. Find the generated zip
const zipPath = join(
  ROOT,
  'build',
  `FoE-Info_WEBSTORE_${version}_${releaseDate}.zip`,
);
if (!existsSync(zipPath)) {
  console.error(`Expected zip asset not found at: ${zipPath}`);
  process.exit(1);
}
console.log(`\n[3/5] Verified build artifact: ${zipPath}`);

// Bind the packaged artifact to the revision we verified. package-extension.js
// re-writes PROVENANCE.json inside the built tree; this cached copy lets the
// tag step cross-check that the zipped bytes really came from HEAD.
const provenancePath = resolve(
  ROOT,
  'build',
  'FoE-Info-Prod',
  'PROVENANCE.json',
);
if (!existsSync(provenancePath)) {
  console.error(`Missing build/PROVENANCE.json for ${tag}`);
  process.exit(1);
}
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'));
if (provenance.gitSha !== headSha) {
  fail(
    `Provenance mismatch: package was built from ${provenance.gitSha}, ` +
      `but HEAD is ${headSha}.\n` +
      'Rebuild a fresh artifact or fix the version and retry.',
  );
}
console.log(`  ✓ Provenance bound to ${provenance.gitSha}`);

// 4. Create / reuse the tag. Only push AFTER the GitHub Release succeeds, so a
// failed upload leaves the remote without a dangling ref.
console.log('\n[4/5] Preparing Git tag...');
const tmpNotesPath = resolve(ROOT, '.release-notes.tmp.md');
let notesFileArg = null;

const changelogPath = resolve(ROOT, 'CHANGELOG.md');
if (existsSync(changelogPath)) {
  const changelog = readFileSync(changelogPath, 'utf8');
  // Escape the dot so semver dots don't span unintended characters.
  const versionPattern = version.replace(/\./g, '\\.');
  const sectionMatch = changelog.match(
    new RegExp(`## \\[${versionPattern}\\][^\n]*\n([\\s\\S]*?)(?=\\n## \\[|$)`),
  );
  const releaseNotes = sectionMatch ? sectionMatch[1].trim() : `Release ${tag}`;
  writeFileSync(tmpNotesPath, releaseNotes, 'utf8');
  notesFileArg = tmpNotesPath;
}

const ghCliArgs = [
  'release',
  'create',
  tag,
  zipPath,
  '--title',
  `FoE-Info ${tag}`,
];
if (notesFileArg) ghCliArgs.push('--notes-file', notesFileArg);

try {
  console.log('\n[5/5] Creating GitHub Release...');
  run('gh', ghCliArgs);
} catch (err) {
  if (existsSync(tmpNotesPath)) {
    try {
      rmSync(tmpNotesPath, { force: true });
    } catch {
      // Non-fatal: assuming tmp notes file already cleaned up.
    }
  }
  fail(`gh release create failed: ${err.message}`);
}

// GitHub Release is live — now push the tag so the remote is consistent.
const wasCreated = tagSha === null;
if (wasCreated) {
  run('git', ['tag', '-a', tag, '-m', `Release ${tag}`]);
}
run('git', ['push', 'origin', `refs/tags/${tag}`]);

if (existsSync(tmpNotesPath)) {
  try {
    rmSync(tmpNotesPath, { force: true });
  } catch (err) {
    console.warn(`[release] Could not remove ${tmpNotesPath}: ${err.message}`);
  }
}

console.log(`\n Successfully published release ${tag} on GitHub!`);
console.log(`  Artifact : ${zipPath}`);
console.log(`  SHA      : ${provenance.gitSha}`);
