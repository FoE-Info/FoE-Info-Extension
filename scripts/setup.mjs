#!/usr/bin/env node
/**
 * setup.mjs — single setup entrypoint for npm and mise.
 *
 * `npm run setup` and `mise run setup` execute this script, so both paths
 * produce the same environment: npm dependencies, uv-managed Python
 * environment (graphify-mcp backend), and the default MCP profile.
 * Sandbox-safe: only reads/writes inside the repository.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, options = {}) {
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...options });
}

function have(cmd) {
  try {
    execFileSync(cmd, ['--version'], { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function ensureUv() {
  if (have('uv')) return 'uv';
  const viaPython =
    have('python3') ? 'python3'
    : have('python') ? 'python'
    : null;
  if (!viaPython) {
    throw new Error(
      'setup requires uv or python3 on PATH to bootstrap the Python environment',
    );
  }
  run(viaPython, ['-m', 'pip', 'install', '--user', 'uv']);
  return 'uv';
}

run('npm', ['ci']);

const uv = ensureUv();
run(uv, ['sync']);

const graphifyBin = join(ROOT, '.venv', 'bin', 'graphify-mcp');
if (!existsSync(graphifyBin)) {
  throw new Error('setup failed: .venv/bin/graphify-mcp missing after uv sync');
}

run('node', [
  join(ROOT, '.agents', 'scripts', 'mcp-profile.mjs'),
  'default',
  '--root',
  ROOT,
]);

console.log(
  'setup complete: npm deps, uv env (graphify-mcp), default MCP profile',
);
