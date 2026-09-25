#!/usr/bin/env node
/**
 * setup.mjs — setup entrypoint for npm and mise.
 * Installs npm dependencies and verifies Node version against package.json.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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
console.log('setup complete: npm dependencies verified');
