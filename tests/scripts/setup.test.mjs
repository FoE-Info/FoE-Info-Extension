import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

for (const [version, supported] of [
  ['25.9.0', false],
  ['26.0.0', false],
  ['26.8.1', false],
  ['26.8.2', true],
  ['26.9.0', true],
  ['27.0.0', true],
]) {
  test(`setup ${supported ? 'accepts' : 'rejects before installation'} Node ${version}`, (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'foe-setup-engine-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.mkdirSync(path.join(root, 'scripts'));
    fs.copyFileSync(
      new URL('../../scripts/setup.mjs', import.meta.url),
      path.join(root, 'scripts/setup.mjs'),
    );
    fs.writeFileSync(
      path.join(root, 'scripts/git-workflow.mjs'),
      'export function applyGitWorkflow() { console.log("git-setup-reached"); return { skipped: "fixture" }; }',
    );
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ engines: { node: '>=26.8.2' } }),
    );
    // Exercise the real entrypoint with a simulated version. Installation is
    // stubbed so the rejection cases prove no dependency or Git work started.
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
          import childProcess from 'node:child_process';
          import { syncBuiltinESMExports } from 'node:module';
          Object.defineProperty(process.versions, 'node', { value: process.argv[1] });
          childProcess.execFileSync = () => console.log('installation-reached');
          syncBuiltinESMExports();
          await import('./scripts/setup.mjs');
        `,
        version,
      ],
      { cwd: root, encoding: 'utf8', timeout: 10_000 },
    );
    assert.equal(result.error, undefined, result.error?.message);
    if (supported) {
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /installation-reached/);
    } else {
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /setup requires Node >=26\.8\.2/);
      assert.doesNotMatch(
        result.stdout,
        /installation-reached|git-setup-reached/,
      );
    }
  });
}

for (const key of ['npm_config_allow_scripts', 'NPM_CONFIG_ALLOW_SCRIPTS']) {
  test(`setup tolerates inherited ${key} while running lifecycle scripts`, (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'foe-setup-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.mkdirSync(path.join(root, 'scripts'));
    for (const script of ['setup.mjs', 'git-workflow.mjs']) {
      fs.copyFileSync(
        new URL(`../../scripts/${script}`, import.meta.url),
        path.join(root, 'scripts', script),
      );
    }
    const pkg = {
      name: 'setup-fixture',
      version: '1.0.0',
      private: true,
      scripts: {
        setup: 'node scripts/setup.mjs',
        prepare: 'node prepare.mjs',
      },
      allowScripts: { 'approved-dependency': true },
    };
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg));
    fs.writeFileSync(
      path.join(root, 'package-lock.json'),
      JSON.stringify({
        name: pkg.name,
        version: pkg.version,
        lockfileVersion: 3,
        packages: { '': { name: pkg.name, version: pkg.version } },
      }),
    );
    fs.writeFileSync(
      path.join(root, 'prepare.mjs'),
      "import fs from 'node:fs'; fs.writeFileSync('prepared', process.env.SETUP_TEST_MARKER);",
    );
    fs.writeFileSync(
      path.join(root, 'userrc'),
      'allow-scripts=msgpackr-extract\n',
    );
    const env = { ...process.env };
    // Keep developer npm settings out of this dependency-free, offline fixture.
    for (const name of Object.keys(env)) {
      if (name.toLowerCase().startsWith('npm_config_')) delete env[name];
    }
    Object.assign(env, {
      [key]: 'msgpackr-extract',
      npm_config_userconfig: path.join(root, 'userrc'),
      npm_config_cache: path.join(root, 'cache'),
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_update_notifier: 'false',
      SETUP_TEST_MARKER: 'preserved',
    });
    const result = spawnSync('npm', ['run', 'setup'], {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 30_000,
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /setup complete: npm dependencies verified/);
    assert.equal(
      fs.readFileSync(path.join(root, 'prepared'), 'utf8'),
      'preserved',
    );
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
        .allowScripts,
      pkg.allowScripts,
    );
  });
}

test('full setup registers a local driver with a shell-safe clone path', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foe setup's "));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.copyFileSync(
    new URL('../../scripts/setup.mjs', import.meta.url),
    path.join(root, 'scripts/setup.mjs'),
  );
  fs.writeFileSync(
    path.join(root, 'scripts/git-workflow.mjs'),
    'export function applyGitWorkflow() { return { applied: [] }; }',
  );
  fs.writeFileSync(path.join(root, 'package.json'), '{}');
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import cp from 'node:child_process';
    import { syncBuiltinESMExports } from 'node:module';
    cp.execFileSync = (cmd, args) => console.log(JSON.stringify({cmd, args}));
    syncBuiltinESMExports();
    process.argv.push('setup-fixture', '--full');
    await import('./scripts/setup.mjs');
  `,
    ],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const calls = result.stdout
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line));
  assert.deepEqual(
    calls.slice(0, 2).map((call) => call.cmd),
    ['npm', 'uv'],
  );
  const driver = calls.at(-1);
  assert.equal(driver.cmd, 'git');
  assert.deepEqual(driver.args.slice(0, 3), [
    'config',
    '--local',
    'merge.graphify.driver',
  ]);
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'uv'), '#!/bin/sh\nprintf "%s\\n" "$@"\n', {
    mode: 0o755,
  });
  const invocation = spawnSync('bash', ['-c', driver.args[3]], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
  });
  assert.equal(invocation.status, 0, invocation.stderr);
  assert.deepEqual(invocation.stdout.trim().split('\n'), [
    'run',
    '--project',
    root,
    'graphify',
    'merge-driver',
    '%O',
    '%A',
    '%B',
  ]);
});
