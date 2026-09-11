#!/usr/bin/env node
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(root, 'package.json'), 'utf8'),
);

// Parse --env argument (default: beta)
let targetEnv = 'beta';
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--env=')) {
    targetEnv = arg.split('=')[1].toLowerCase();
  }
}

const isProd = targetEnv === 'prod' || targetEnv === 'production';
const targetDirName = isProd ? 'FoE-Info-Prod' : 'FoE-Info-Beta';
const targetDir = path.resolve(root, 'build', targetDirName);

// Ensure build directory exists or build it
if (!fs.existsSync(targetDir)) {
  console.log(
    `Target build directory ${targetDirName} not found. Running build now...`,
  );
  const buildCmd = isProd ? 'npm run build:prod' : 'npm run build:beta';
  execSync(buildCmd, { cwd: root, stdio: 'inherit' });
}

const date = new Date().toISOString().slice(0, 10);
const zipFileName =
  isProd ?
    `FoE-Info_WEBSTORE_${pkg.version}_${date}.zip`
  : `FoE-Info_BETA_${pkg.version}_${date}.zip`;

const buildDir = path.resolve(root, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}
const zipFilePath = path.resolve(buildDir, zipFileName);

if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
}

console.log(`Packaging ${targetDirName} into ${zipFileName}...`);
execSync(`cd "${targetDir}" && zip -r -q "${zipFilePath}" . -x "*.map"`, {
  stdio: 'inherit',
});

if (!fs.existsSync(zipFilePath)) {
  console.error(`Error: Failed to create package at ${zipFilePath}`);
  process.exit(1);
}

console.log(`Successfully created package: ${zipFilePath}`);
