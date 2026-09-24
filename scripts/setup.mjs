#!/usr/bin/env node
/**
 * setup.mjs — single setup entrypoint for npm and mise.
 *
 * `npm run setup` and `mise run setup` execute this script, so both paths
 * produce the same environment: npm dependencies, uv-managed Python
 * environment (graphify-mcp backend), and the default MCP profile.
 * Repo-local except for a user-local uv install (~/.local) when uv is
 * missing and cannot be found on PATH.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, options = {}) {
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...options });
}

function haveArgs(cmd, args) {
  try {
    execFileSync(cmd, [...args, '--version'], { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function have(cmd) {
  return haveArgs(cmd, []);
}

function ensureUv() {
  if (have('uv')) return 'uv';
  const localUv = join(homedir(), '.local', 'bin', 'uv');
  if (existsSync(localUv)) return localUv;
  const pipVariants = [
    ['pip3', []],
    ['pip', []],
    ['python3', ['-m', 'pip']],
    ['python', ['-m', 'pip']],
  ];
  let pip = pipVariants.find(([cmd, args]) => haveArgs(cmd, args)) ?? null;
  if (!pip && have('python3')) {
    // System python without pip (e.g. split ensurepip distros): bootstrap it.
    try {
      run('python3', ['-m', 'ensurepip', '--user', '--default-pip']);
      pip = ['python3', ['-m', 'pip']];
    } catch {
      // Fall through to the error below.
    }
  }
  if (!pip) {
    throw new Error(
      'setup requires uv or pip on PATH to bootstrap the Python environment',
    );
  }
  try {
    run(pip[0], [...pip[1], 'install', '--user', 'uv']);
  } catch {
    // Homebrew/distro Pythons (PEP 668) refuse --user installs into the
    // managed prefix. Still user-local, so retry with the documented
    // override before giving up.
    run(pip[0], [
      ...pip[1],
      'install',
      '--user',
      '--break-system-packages',
      'uv',
    ]);
  }
  if (existsSync(localUv)) return localUv;
  if (have('uv')) return 'uv';
  throw new Error(
    `setup installed uv via ${pip[0]} but found no uv binary (checked PATH and ${localUv}); add ~/.local/bin to PATH and re-run`,
  );
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
