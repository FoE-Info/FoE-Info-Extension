#!/usr/bin/env node
/** Read-only prerequisites. No installs, Git mutations or implicit network probes. */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { profiles } from './lib/validation-stages.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function meetsMinimum(version, range) {
  const match = /^>=(\d+)\.(\d+)\.(\d+)$/.exec(range || '');
  if (!match) throw new Error(`Unsupported engine range: ${range}`);
  const actual = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!actual) return false;
  for (let i = 1; i <= 3; i++) {
    if (Number(actual[i]) !== Number(match[i]))
      return Number(actual[i]) > Number(match[i]);
  }
  return true;
}

export function readiness({
  root = ROOT,
  profile = 'full',
  probes = [],
  nodeVersion = process.versions.node,
  run = spawnSync,
} = {}) {
  if (!profiles.includes(profile))
    throw new Error(`Unknown profile: ${profile}`);
  for (const probe of probes)
    if (!['browser', 'graphify', 'packaging', 'release'].includes(probe))
      throw new Error(`Unknown optional probe: ${probe}`);
  const cases = [];
  const check = (id, action, remedy, optional = false) => {
    try {
      const detail = action();
      cases.push({ id, status: 'passed', detail, remedy: null, reason: null });
    } catch (error) {
      cases.push({
        id,
        status: optional ? 'skipped' : 'failed',
        detail: error.message,
        remedy,
        reason: optional ? `${id}-unavailable` : 'prerequisite-unavailable',
      });
    }
  };
  const command = (name, args) => {
    const result = run(name, args, {
      cwd: root,
      encoding: 'utf8',
      timeout: 10_000,
      shell: process.platform === 'win32' && name === 'npm.cmd',
    });
    if (result.error || result.status !== 0)
      throw new Error(
        result.error?.message || `${name} exited ${result.status}`,
      );
    return result.stdout.trim();
  };
  let pkg;
  check(
    'package',
    () => {
      pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
      return 'package.json is readable';
    },
    'Restore a valid package.json.',
  );
  check(
    'node',
    () => {
      if (!meetsMinimum(nodeVersion, pkg?.engines?.node))
        throw new Error(`Node ${nodeVersion}; requires ${pkg?.engines?.node}`);
      return nodeVersion;
    },
    'Use the pinned mise runtime or install Node matching engines.node.',
  );
  check(
    'npm',
    () => {
      const version = command(
        process.platform === 'win32' ? 'npm.cmd' : 'npm',
        ['--version'],
      );
      if (!meetsMinimum(version, pkg?.engines?.npm))
        throw new Error(`npm ${version}; requires ${pkg?.engines?.npm}`);
      return version;
    },
    'Install npm matching engines.npm.',
  );
  check(
    'lockfile',
    () => {
      JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
      return 'package-lock.json is readable';
    },
    'Restore package-lock.json before npm ci.',
  );
  check(
    'git-index',
    () => {
      command('git', ['rev-parse', '--show-toplevel']);
      command('git', ['ls-files', '--cached']);
      return 'Git checkout/index is available (HEAD is not required)';
    },
    'Use a Git checkout or npm run verify:export from the source checkout.',
  );
  check(
    'dependencies',
    () => {
      if (!pkg) throw new Error('package.json unavailable');
      const names =
        profile === 'docs' ?
          [
            'prettier',
            '@ianvs/prettier-plugin-sort-imports',
            'prettier-plugin-packagejson',
          ]
        : Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
      const require = createRequire(join(root, 'package.json'));
      const missing = names.filter((name) => {
        if (!existsSync(join(root, 'node_modules', name))) return true;
        try {
          require.resolve(
            name.startsWith('@types/') ? `${name}/package.json` : name,
          );
          return false;
        } catch {
          return true;
        }
      });
      if (missing.length)
        throw new Error(`Missing dependencies: ${missing.join(', ')}`);
      return `${names.length} local dependencies resolve`;
    },
    'Run npm ci (or npm run setup).',
  );
  if (profile === 'full') {
    check(
      'bash',
      () => command('bash', ['--version']).split('\n')[0],
      'Install Bash for shared shell harness fixtures.',
    );
    check(
      'uvx',
      () => command('uvx', ['--version']),
      'Install uv (which provides uvx) for the font-subsetting tests; see CONTRIBUTING.md.',
    );
  }
  for (const probe of new Set(probes)) {
    const commands = {
      browser: [process.execPath, ['scripts/check-browser-cdp.mjs']],
      graphify: [join(root, '.venv/bin/graphify'), ['--version']],
      packaging: ['zip', ['-v']],
      release: ['gh', ['auth', 'status']],
    };
    const remedies = {
      browser: 'Enable CDP on your existing browser; see docs/debugging.md.',
      graphify: 'Run mise run setup-full for the local Graphify environment.',
      packaging: 'Install zip for archive packaging.',
      release: 'Install gh and authenticate before publishing a release.',
    };
    check(probe, () => command(...commands[probe]), remedies[probe], true);
  }
  return {
    schemaVersion: 1,
    profile,
    status: cases.some((c) => c.status === 'failed') ? 'failed' : 'passed',
    cases,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    let profile = 'full';
    let json = false;
    const probes = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--json') json = true;
      else if (args[i] === '--profile') {
        profile = args[++i];
        if (!profile) throw new Error('--profile requires docs|static|full');
      } else if (args[i] === '--probe') probes.push(args[++i]);
      else throw new Error(`Unknown argument: ${args[i]}`);
    }
    const report = readiness({ profile, probes });
    if (json) console.log(JSON.stringify(report, null, 2));
    else
      for (const c of report.cases) {
        console.log(`${c.status}: ${c.id}: ${c.detail}`);
        if (c.remedy) console.log(`  Remedy: ${c.remedy}`);
      }
    process.exitCode = report.status === 'passed' ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
