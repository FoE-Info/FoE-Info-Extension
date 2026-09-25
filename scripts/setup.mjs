#!/usr/bin/env node
/**
 * setup.mjs — setup entrypoint for npm and mise.
 * Installs npm dependencies and verifies Node version against package.json.
 *
 *   node scripts/setup.mjs          npm dependencies only
 *   node scripts/setup.mjs --full   npm deps + uv Python environment for graphify
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE_ROOT = join(ROOT, '..');
const FULL = process.argv.slice(2).includes('--full');

function run(cmd, args, options = {}) {
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...options });
}

function checkNodeEngine() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const range = pkg.engines?.node;
  if (!range) return;
  const major = Number(process.versions.node.split('.')[0]);
  const min = Number(/(\d+)/.exec(range)?.[1]);
  if (Number.isNaN(min) || major >= min) return;
  throw new Error(
    `setup requires Node ${range}; running ${process.versions.node}. Use mise, or install a supported Node.`,
  );
}

run('npm', ['ci']);
checkNodeEngine();

if (!FULL) {
  console.log('setup complete: npm dependencies verified');
  console.log('optional: npm run setup:full adds the uv Graphify environment');
  process.exit(0);
}

console.log('==> Synchronizing uv environment for Graphify...');
execFileSync('uv', ['sync'], { cwd: WORKSPACE_ROOT, stdio: 'inherit' });
console.log('setup complete: npm deps and uv Graphify environment verified');
