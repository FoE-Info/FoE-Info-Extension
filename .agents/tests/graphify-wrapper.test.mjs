import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'graphify wrapper '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts/graphify'), { recursive: true });
  mkdirSync(join(root, '.venv/bin'), { recursive: true });
  const script = join(root, 'scripts/graphify/graphify.sh');
  copyFileSync(
    new URL('../../scripts/graphify/graphify.sh', import.meta.url),
    script,
  );
  const runner = join(root, '.venv/bin/graphify');
  writeFileSync(
    runner,
    '#!/bin/bash\nprintf "%s\\n" "$PWD" "$GRAPHIFY_OUT" "$@"\nexit "${MOCK_EXIT:-0}"\n',
  );
  chmodSync(runner, 0o755);
  return {
    root,
    run: (...args) =>
      spawnSync('bash', [script, ...args], {
        encoding: 'utf8',
        env: { ...process.env, MOCK_EXIT: '0' },
      }),
    script,
  };
}

test('native commands preserve arguments, selected graph, and workspace paths with spaces', (t) => {
  const f = fixture(t);
  for (const command of [
    'query',
    'path',
    'explain',
    'god-nodes',
    'affected',
    '--help',
    'future-command',
    'update',
    'label',
    'export',
    'extract',
    'watch',
    'reflect',
    'save-result',
  ]) {
    const result = f.run('foe-info', command, 'two words', '', '--export');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.stdout.split('\n'), [
      f.root,
      join(f.root, 'graphify-out'),
      command,
      'two words',
      '',
      '--export',
      '',
    ]);
  }
});

test('cli bypasses overlapping maintenance actions and preserves failures', (t) => {
  const f = fixture(t);
  const result = f.run('foe-info', 'cli', 'export', 'svg', '--export');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n').slice(2), [
    'export',
    'svg',
    '--export',
  ]);
  const failed = spawnSync('bash', [f.script, 'foe-info', 'unknown'], {
    encoding: 'utf8',
    env: { ...process.env, MOCK_EXIT: '7' },
  });
  assert.equal(failed.status, 7);
});

test('default and explicit AST actions still invoke update without leaking target arguments', (t) => {
  const f = fixture(t);
  for (const args of [[], ['foe-info'], ['foe-info', 'ast']]) {
    const result = f.run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.stdout.trim().split('\n').slice(-2), [
      'update',
      '.',
    ]);
  }
});

test('reindex invokes only native extraction with the caller flags', (t) => {
  const f = fixture(t);
  const result = f.run(
    'foe-info',
    'reindex',
    '--token-budget',
    '1234',
    '--mode',
    'deep',
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n').slice(2), [
    'extract',
    '.',
    '--token-budget',
    '1234',
    '--mode',
    'deep',
  ]);
});

test('native commands preserve provider and proxy configuration', (t) => {
  const f = fixture(t);
  writeFileSync(
    join(f.root, '.venv/bin/graphify'),
    '#!/bin/bash\nprintf "%s\\n" "$OPENAI_BASE_URL" "$OPENAI_MODEL" "$ANTHROPIC_API_KEY" "$HTTPS_PROXY"\n',
  );
  writeFileSync(join(f.root, 'scripts/graphify/inference-env.sh'), 'exit 99\n');
  const result = spawnSync('bash', [f.script, 'foe-info', 'label'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      OPENAI_BASE_URL: 'https://provider.invalid/v1',
      OPENAI_MODEL: 'chosen-model',
      ANTHROPIC_API_KEY: 'fixture-only',
      HTTPS_PROXY: 'https://proxy.invalid',
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), [
    'https://provider.invalid/v1',
    'chosen-model',
    'fixture-only',
    'https://proxy.invalid',
  ]);
});

test('export-all is separate from native format selection', (t) => {
  const f = fixture(t);
  const result = f.run('foe-info', 'export-all');
  assert.equal(result.status, 0, result.stderr);
  for (const format of ['wiki', 'obsidian', 'svg', 'html']) {
    assert.ok(result.stdout.includes(`export\n${format}\n`), result.stdout);
  }
  assert.match(result.stdout, /\ntree\n/);
  assert.equal(f.run('foe-info', 'export-all', '--export').status, 2);
});

test('memory actions pass through without overriding upstream defaults', (t) => {
  const f = fixture(t);
  for (const action of ['save-result', 'reflect']) {
    for (const args of [[], ['--memory-dir', 'custom memory']]) {
      const result = f.run('foe-info', action, ...args);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(result.stdout.trim().split('\n').slice(2), [
        action,
        ...args,
      ]);
    }
  }
});

test('metadata maintenance passes the selected store to the builder', (t) => {
  const f = fixture(t);
  const store = join(f.root, 'custom metadata store');
  mkdirSync(store);
  writeFileSync(
    join(f.root, 'scripts/graphify/build-metadata-graph.mjs'),
    'console.log(JSON.stringify({store: process.env.METADATA_STORE_DIR, out: process.env.GRAPHIFY_OUT}));\n',
  );
  for (const action of ['metadata-build']) {
    const result = spawnSync('bash', [f.script, 'metadata-store', action], {
      encoding: 'utf8',
      env: {
        ...process.env,
        METADATA_DIR: store,
        METADATA_STORE_DIR: join(f.root, 'stale store'),
      },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout.trim().split('\n').at(-1)), {
      store,
      out: join(store, 'graphify-out'),
    });
  }
  assert.equal(f.run('foe-info', 'metadata-build').status, 2);
});

test('metadata-store selects a folder while native commands pass through unchanged', (t) => {
  const f = fixture(t);
  const store = join(f.root, 'assigned metadata-store');
  mkdirSync(store);
  const result = spawnSync(
    'bash',
    [f.script, 'metadata-store', 'query', 'entity metadata', '--budget', '700'],
    { encoding: 'utf8', env: { ...process.env, METADATA_DIR: store } },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), [
    store,
    join(store, 'graphify-out'),
    'query',
    'entity metadata',
    '--budget',
    '700',
  ]);
  assert.equal(f.run('metadata', 'query', 'entity').status, 1);
});

test('wrapper help succeeds without treating the flag as a target', (t) => {
  const f = fixture(t);
  for (const flag of ['--help', '-h']) {
    const result = f.run(flag);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage: bash scripts\/graphify\/graphify.sh/);
    assert.match(result.stdout, /Targets: foe-info/);
  }
});
