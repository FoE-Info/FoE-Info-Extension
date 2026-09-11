#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(
  readFileSync(resolve(root, 'src/chrome/manifest.json'), 'utf8'),
);

if (pkg.version !== manifest.version) {
  console.error(
    `Version mismatch: package.json (${pkg.version}) !== manifest.json (${manifest.version})`,
  );
  process.exit(1);
}

const version = pkg.version;
const tag = `v${version}`;

console.log(`=== Releasing FoE-Info ${tag} ===`);

// 1. Run full verification gate
console.log('\n[1/5] Running verification gate...');
run('npm run verify');

// 2. Build production assets
console.log('\n[2/5] Building production WebStore package...');
run('npm run build');

// 3. Find the generated zip
const today = new Date().toISOString().slice(0, 10);
const zipPath = `build/FoE-Info_WEBSTORE_${version}_${today}.zip`;
if (!existsSync(zipPath)) {
  console.error(`Expected zip asset not found at: ${zipPath}`);
  process.exit(1);
}
console.log(`\n[3/5] Verified build artifact: ${zipPath}`);

// 4. Git status & tag check
console.log('\n[4/5] Checking Git state & creating tag...');
const existingTags = execSync('git tag -l', { encoding: 'utf8' }).split('\n');
if (existingTags.includes(tag)) {
  console.warn(`Tag ${tag} already exists locally.`);
} else {
  run(`git tag -a ${tag} -m "Release ${tag}"`);
}

// 5. GitHub Release creation
console.log('\n[5/5] Creating GitHub Release...');
const changelogPath = resolve(root, 'CHANGELOG.md');
let releaseNotesArgs = '';
if (existsSync(changelogPath)) {
  // Extract the notes for this version if possible, or use the whole changelog
  releaseNotesArgs = `--notes "FoE-Info Extension ${tag} — see CHANGELOG.md for details"`;
}

run(
  `gh release create ${tag} "${zipPath}" --title "${tag}" ${releaseNotesArgs}`,
);
console.log(`\n Successfully published release ${tag} on GitHub!`);
