#!/usr/bin/env node
/**
 * Builds (or rebuilds) the extension for the requested env and zips it under
 * build/, together with a PROVENANCE.json that binds the archive to the exact
 * source revision.
 *
 * Usage: node scripts/package-extension.js --env=prod [--date=YYYY-MM-DD]
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(root, 'package.json'), 'utf8'),
);

// Parse CLI arguments (default: beta)
let targetEnv = 'beta';
let releaseDate;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--env=')) {
    targetEnv = arg.split('=')[1].toLowerCase();
  } else if (arg.startsWith('--date=')) {
    releaseDate = arg.split('=')[1];
  }
}

// Align with release.mjs — it computes the date once and passes it through so
// the zip filename never straddles UTC midnight across two scripts.
if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate || '')) {
  releaseDate = new Date().toISOString().slice(0, 10);
}

const isProd = targetEnv === 'prod' || targetEnv === 'production';
const targetDirName = isProd ? 'FoE-Info-Prod' : 'FoE-Info-Beta';
const targetDir = path.resolve(root, 'build', targetDirName);
// Refuse to package a version that already shipped. The zip name and
// PROVENANCE.json are both derived from pkg.version, so building here while
// still on a released number produces an artifact indistinguishable from the
// real one except by date — the failure that shipped 0.0.834 three times.
try {
  execFileSync('node', ['scripts/check-version.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
} catch {
  console.error(
    '\nRefusing to package: the version is already released, or commits have ' +
      'landed since the last release without a bump.\nBump package.json and ' +
      'src/chrome/manifest.json, then package again.',
  );
  process.exit(1);
}

// REBUILD EVERY TIME — a pre-existing output directory is NOT provenance:
// package:beta would otherwise zip a stale tree under a fresh version/date
// filename and silently re-publish the wrong bits.
const buildCmd = isProd ? 'build:prod' : 'build:beta';
console.log(`Packaging ${targetDirName}: rebuilding ${buildCmd}...`);
execFileSync('npm', ['run', buildCmd], { cwd: root, stdio: 'inherit' });

if (!fs.existsSync(targetDir)) {
  console.error(
    `Error: expected build output directory missing after ${buildCmd}: ${targetDir}`,
  );
  process.exit(1);
}

// Content-bound provenance record: bind the packaged bytes to the exact
// revision and build timestamp, so downstream consumers can audit it.
const provenanceInfo = {
  version: pkg.version,
  env: isProd ? 'prod' : 'beta',
  gitSha: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim(),
  gitClean:
    execFileSync('git', ['status', '--porcelain'], {
      cwd: root,
      encoding: 'utf8',
    }).trim().length === 0,
  builtAtUtc: new Date().toISOString(),
  webpackEnv: targetEnv,
};
fs.writeFileSync(
  path.join(targetDir, 'PROVENANCE.json'),
  JSON.stringify(provenanceInfo, null, 2),
  'utf8',
);
console.log(`  ✓ Provenance recorded: ${provenanceInfo.gitSha}`);

const zipFileName =
  isProd ?
    `FoE-Info_WEBSTORE_${pkg.version}_${releaseDate}.zip`
  : `FoE-Info_BETA_${pkg.version}_${releaseDate}.zip`;

const buildDir = path.resolve(root, 'build');
fs.mkdirSync(buildDir, { recursive: true });
const zipFilePath = path.resolve(buildDir, zipFileName);

fs.rmSync(zipFilePath, { force: true });

console.log(`Zipping ${targetDir} -> ${zipFilePath}`);
execFileSync(
  'zip',
  ['-r', '-q', '-X', zipFilePath, '.', '-x', '*.map', '^PROVENANCE.json$'],
  { cwd: targetDir, stdio: 'inherit' },
);

if (!fs.existsSync(zipFilePath)) {
  console.error(`Error: Failed to create package at ${zipFilePath}`);
  process.exit(1);
}

console.log(`Successfully created package: ${zipFilePath}`);
