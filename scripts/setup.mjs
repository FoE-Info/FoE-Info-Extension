#!/usr/bin/env node
/**
 * setup.mjs — setup entrypoint for npm and mise.
 * Installs npm dependencies, applies the repository's git workflow defaults,
 * and verifies the Node version against package.json.
 *
 *   node scripts/setup.mjs          npm dependencies + git workflow defaults
 *   node scripts/setup.mjs --full   the above + uv Python environment for graphify
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyGitWorkflow } from './git-workflow.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FULL = process.argv.slice(2).includes('--full');

function run(cmd, args, options = {}) {
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...options });
}

function checkNodeEngine() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const range = pkg.engines?.node;
  if (!range) return;
  // This repository declares a minimum version, not a general semver range.
  const minimum = /^>=(\d+)\.(\d+)\.(\d+)$/.exec(range);
  if (!minimum) throw new Error(`Unsupported Node engine range: ${range}`);
  const current = process.versions.node.split('.').map(Number);
  const required = minimum.slice(1).map(Number);
  for (let i = 0; i < required.length; i++) {
    if (current[i] > required[i]) return;
    if (current[i] < required[i]) break;
    if (i === required.length - 1) return;
  }
  throw new Error(
    `setup requires Node ${range}; running ${process.versions.node}. Use mise, or install a supported Node.`,
  );
}

// Fail fast on an unsupported Node BEFORE installing dependencies —
// `npm ci` takes minutes and should never run just to be told the
// environment is wrong.
checkNodeEngine();

// Rebase-based local history. Runs before `npm ci` because it costs
// milliseconds and reports a bootstrap gap immediately. Never fatal: a source
// tarball has no .git, and that is not a reason to refuse to install.
const workflow = applyGitWorkflow(ROOT);
if (workflow.skipped) {
  console.log(`==> Git workflow defaults skipped: ${workflow.skipped}`);
} else if (workflow.applied.length > 0) {
  console.log(`==> Git workflow: ${workflow.applied.join(', ')} set to true`);
}
// Some npm versions export .npmrc's allow-scripts through npm run, then
// reject that inherited env setting as a CLI policy in the nested npm ci.
// Let npm read package.json#allowScripts and .npmrc directly instead.
const installEnv = { ...process.env };
for (const key of Object.keys(installEnv)) {
  if (key.toLowerCase() === 'npm_config_allow_scripts') delete installEnv[key];
}
run('npm', ['ci'], { env: installEnv });

if (!FULL) {
  console.log('setup complete: npm dependencies verified');
  console.log('optional: mise run setup-full adds the uv Graphify environment');
  process.exit(0);
}

console.log('==> Synchronizing uv environment for Graphify...');
execFileSync('uv', ['sync'], { cwd: ROOT, stdio: 'inherit' });
if (!workflow.skipped) {
  // Git invokes merge drivers through a shell; quote the clone path, including
  // apostrophes, and let uv select the repository's locked Python environment.
  const quotedRoot = "'" + ROOT.replaceAll("'", "'\\''") + "'";
  run('git', [
    'config',
    '--local',
    'merge.graphify.driver',
    `uv run --project ${quotedRoot} graphify merge-driver "%O" "%A" "%B"`,
  ]);
  console.log('==> Repository-local Graphify merge driver registered');
}
console.log('setup complete: npm deps and uv Graphify environment verified');
