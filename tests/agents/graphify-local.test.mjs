import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const runner = resolve('.agents/scripts/run-graphify-local.sh');
const localEnv = resolve('.agents/scripts/graphify-local-env.sh');
const forced = {
  OPENAI_BASE_URL: 'http://127.0.0.1:8081/v1',
  OPENAI_API_KEY: 'local',
  GRAPHIFY_BACKEND: 'openai',
  OPENAI_MODEL: 'qwen2.5-vl-7b',
  GRAPHIFY_OPENAI_MODEL: 'qwen2.5-vl-7b',
  GRAPHIFY_NO_TIPS: '1',
};
const cloudKeys = [
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'MOONSHOT_API_KEY',
  'ANTHROPIC_API_KEY',
];

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'foe-graphify-local-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const capture = join(root, 'invocation.json');
  const log = join(root, 'graphify.log');
  const fake = `#!${process.execPath}
require('node:fs').writeFileSync(process.env.FOE_TEST_CAPTURE, JSON.stringify({
  args: process.argv.slice(2), env: process.env
}));
process.stdout.write(process.env.FOE_TEST_STDOUT || 'fixture output\\n');
process.stderr.write('fixture diagnostic\\n');
process.exit(Number(process.env.FOE_TEST_EXIT || 0));
`;
  for (const executable of ['graphify', 'graphify-mcp'])
    writeFileSync(join(root, executable), fake, { mode: 0o700 });
  const env = {
    ...process.env,
    ...Object.fromEntries(Object.keys(forced).map((key) => [key, 'hostile'])),
    ...Object.fromEntries(cloudKeys.map((key) => [key, 'not-a-real-key'])),
    PATH: `${root}:${process.env.PATH}`,
    GRAPHIFY_LOG: log,
    FOE_TEST_CAPTURE: capture,
  };
  return {
    root,
    log,
    env,
    invocation: () => JSON.parse(readFileSync(capture, 'utf8')),
    run: (args, extra = {}) =>
      spawnSync('bash', [runner, ...args], {
        encoding: 'utf8',
        env: { ...env, ...extra },
      }),
  };
}

function assertLocal(env) {
  for (const [key, expected] of Object.entries(forced))
    assert.equal(env[key], expected, key);
  for (const key of cloudKeys) assert.equal(env[key], undefined, key);
}

test('local Graphify environment can be sourced by POSIX sh without output', (t) => {
  const f = fixture(t);
  const result = spawnSync(
    'sh',
    ['-c', '. "$1"; graphify probe', 'sh', localEnv],
    {
      encoding: 'utf8',
      env: f.env,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'fixture output\n');
  assertLocal(f.invocation().env);
});

test('CLI forces local inference, preserves arguments, and logs quietly on success', (t) => {
  const f = fixture(t);
  const args = ['update', 'a path with spaces', '--verbose'];
  const result = f.run(args);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
  assert.deepEqual(f.invocation().args, args);
  assertLocal(f.invocation().env);
  const log = readFileSync(f.log, 'utf8');
  assert.match(log, /fixture output/);
  assert.match(log, /fixture diagnostic/);
});

test('CLI failure propagates exit status and surfaces diagnostics with the log path', (t) => {
  const f = fixture(t);
  const result = f.run(['watch', '.'], { FOE_TEST_EXIT: '7' });
  assert.equal(result.status, 7);
  assert.equal(result.stdout, '');
  assert.ok(result.stderr.includes(f.log));
  assert.match(result.stderr, /fixture diagnostic/);
});

test('MCP preserves protocol stdout exactly and redirects diagnostics to its log', (t) => {
  const f = fixture(t);
  const protocol = '{"jsonrpc":"2.0","id":1,"result":{}}\n';
  const result = f.run(['--mcp', '/graph directory/graph.json'], {
    FOE_TEST_STDOUT: protocol,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, protocol);
  assert.equal(result.stderr, '');
  assert.ok(f.invocation().args.includes('/graph directory/graph.json'));
  assertLocal(f.invocation().env);
  assert.match(readFileSync(f.log, 'utf8'), /fixture diagnostic/);
});

test('default CLI log is created under the user cache without console noise', (t) => {
  const f = fixture(t);
  const result = f.run(['update', '.'], { HOME: f.root, GRAPHIFY_LOG: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout + result.stderr, '');
  assert.match(
    readFileSync(join(f.root, '.cache/foe-info/graphify-watch.log'), 'utf8'),
    /fixture output/,
  );
});

test('missing local server skips semantic work without invoking Graphify', (t) => {
  const f = fixture(t);
  writeFileSync(join(f.root, 'curl'), '#!/bin/sh\nexit 7\n', { mode: 0o700 });
  const result = f.run(['extract', '.']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout + result.stderr, '');
  assert.throws(() => f.invocation(), /ENOENT/);
  assert.match(readFileSync(f.log, 'utf8'), /unavailable.*skipped/);
});

test('explicit cloud backend override is rejected before execution', (t) => {
  const f = fixture(t);
  const result = f.run(['extract', '.', '--backend', 'gemini']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /overrides are disabled/);
  assert.throws(() => f.invocation(), /ENOENT/);
});
