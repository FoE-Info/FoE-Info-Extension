import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

const SCRIPT_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '../..');
const AGENTS_DIR = join(PROJECT_ROOT, '.agents');
const SCRIPT = join(AGENTS_DIR, 'scripts', 'mcp-profile.mjs');
const REGISTRY = join(AGENTS_DIR, 'mcp-registry.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function makeFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'mcp-profile-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.agents'), { recursive: true });
  // The omp host reads .omp/mcp.json; there is no second config file.
  mkdirSync(join(root, '.omp'), { recursive: true });
  cpSync(REGISTRY, join(root, '.agents', 'mcp-registry.json'));
  writeFileSync(
    join(root, '.omp', 'mcp.json'),
    `${JSON.stringify({ mcpServers: { existing: { command: 'keep-me' } } }, null, 2)}\n`,
  );
  return root;
}

test('MCP profiles - registry defines lean and task-scoped server sets', () => {
  const registry = readJson(REGISTRY);
  const serializedRegistry = JSON.stringify(registry);
  assert.doesNotMatch(
    serializedRegistry,
    /\{env:[A-Z_][A-Z0-9_]*:-[^}]+\}/,
    'MCP registry supports {env:NAME}, not shell-style default expansion',
  );
  const allServers = Object.keys(registry.servers).sort();

  assert.deepEqual(registry.profiles.default, ['graphify-foe-info']);
  assert.deepEqual(registry.profiles.browser, [
    'graphify-foe-info',
    'chrome-devtools',
  ]);
  assert.deepEqual([...registry.profiles.full].sort(), allServers);

  for (const [profile, servers] of Object.entries(registry.profiles)) {
    assert.equal(
      new Set(servers).size,
      servers.length,
      `${profile} contains duplicate servers`,
    );
    for (const server of servers) {
      assert.ok(registry.servers[server], `${profile} references ${server}`);
    }
  }
});

test('MCP profiles - activation writes .omp/mcp.json', async (t) => {
  const root = makeFixture(t);
  const result = spawnSync('node', [SCRIPT, 'browser', '--root', root], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);

  const ompConfig = readJson(join(root, '.omp', 'mcp.json'));
  assert.deepEqual(Object.keys(ompConfig.mcpServers), [
    'graphify-foe-info',
    'chrome-devtools',
  ]);
  assert.equal(
    ompConfig.mcpServers['graphify-foe-info'].type,
    'stdio',
    'every server must declare the omp stdio transport',
  );

  const prettierConfig =
    (await resolveConfig(join(PROJECT_ROOT, 'package.json'))) ?? {};
  const target = join(root, '.omp', 'mcp.json');
  const generated = readFileSync(target, 'utf8');
  const formatted = await format(generated, {
    ...prettierConfig,
    filepath: target,
  });
  assert.equal(generated, formatted, `${target} must be Prettier-stable`);
});

test('MCP profiles - browser profile inherits provider settings without persisting credentials', (t) => {
  const root = makeFixture(t);
  const result = spawnSync('node', [SCRIPT, 'browser', '--root', root], {
    encoding: 'utf8',
    env: {
      ...process.env,
      OPENAI_BASE_URL: 'https://provider.example/v1',
      OPENAI_API_KEY: 'fixture-secret',
      GRAPHIFY_OPENAI_MODEL: 'fixture-model',
    },
  });
  assert.equal(result.status, 0, result.stderr);

  const ompConfig = readJson(join(root, '.omp', 'mcp.json'));
  const environment = ompConfig.mcpServers['graphify-foe-info'].env ?? {};
  for (const name of [
    'OPENAI_BASE_URL',
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'GRAPHIFY_OPENAI_MODEL',
    'GRAPHIFY_BACKEND',
  ]) {
    assert.equal(
      Object.hasOwn(environment, name),
      false,
      `${name} must be inherited`,
    );
  }
  assert.ok(!JSON.stringify(ompConfig).includes('fixture-secret'));
});

test('MCP profiles - unknown profile fails without changing configs', (t) => {
  const root = makeFixture(t);
  const ompPath = join(root, '.omp', 'mcp.json');
  const before = readFileSync(ompPath, 'utf8');
  const result = spawnSync('node', [SCRIPT, 'missing', '--root', root], {
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown MCP profile "missing"/);
  assert.equal(readFileSync(ompPath, 'utf8'), before);
});

test('MCP profiles - predictable temp symlinks cannot overwrite another file', (t) => {
  const root = makeFixture(t);
  const victim = join(root, 'victim.json');
  const before = '{"protected":true}\n';
  writeFileSync(victim, before);
  symlinkSync(victim, join(root, '.omp', 'mcp.json.tmp'));

  const result = spawnSync('node', [SCRIPT, 'browser', '--root', root], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(victim, 'utf8'), before);
});

test('MCP profiles - symlinked destinations fail before config changes', (t) => {
  const root = makeFixture(t);
  const ompPath = join(root, '.omp', 'mcp.json');
  const victim = join(root, 'external-config.json');
  const victimBefore = readFileSync(ompPath, 'utf8');
  writeFileSync(victim, victimBefore);
  unlinkSync(ompPath);
  symlinkSync(victim, ompPath);

  const result = spawnSync('node', [SCRIPT, 'browser', '--root', root], {
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /symlink/i);
  assert.equal(readFileSync(victim, 'utf8'), victimBefore);
});

test('MCP profiles - reports which hosts were written', (t) => {
  const root = makeFixture(t);
  const result = spawnSync('node', [SCRIPT, 'browser', '--root', root], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.hosts, { written: ['omp'], skipped: [] });
});

test('MCP profiles - a missing host directory is a skip, not a failure', (t) => {
  const root = makeFixture(t);
  // No .omp/ in this fixture: this developer is not using the omp harness.
  rmSync(join(root, '.omp'), { recursive: true, force: true });
  const result = spawnSync('node', [SCRIPT, 'browser', '--root', root], {
    encoding: 'utf8',
  });
  // Every configured host is absent, so there is nothing to write and that
  // IS a failure — the point is that it is reported as a host problem, not
  // silently treated as success.
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No host config written/);
  assert.match(result.stderr, /omp/);
});

test('MCP profiles - an unsupported host slot fails loudly', (t) => {
  const root = makeFixture(t);
  const registry = readJson(REGISTRY);
  const server = registry.servers['graphify-foe-info'];
  server.antigrvuity = server.omp;
  delete server.omp;
  writeFileSync(
    join(root, '.agents', 'mcp-registry.json'),
    `${JSON.stringify(registry, null, 2)}\n`,
  );
  const result = spawnSync('node', [SCRIPT, 'browser', '--root', root], {
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported host slot "antigrvuity"/);
  assert.match(result.stderr, /Supported: omp/);
});

test('MCP profiles - shared default configuration matches generated registry output', (t) => {
  const root = makeFixture(t);
  const result = spawnSync(
    process.execPath,
    [SCRIPT, 'default', '--root', root],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    readJson(join(root, '.omp', 'mcp.json')),
    readJson(join(PROJECT_ROOT, '.omp', 'mcp.json')),
  );
});

test('MCP profiles - sibling profiles require explicit roots without changing configuration', (t) => {
  const root = makeFixture(t);
  const config = join(root, '.omp', 'mcp.json');
  const before = readFileSync(config, 'utf8');
  const env = { ...process.env };
  for (const name of [
    'FORGE_HAMMER_ROOT',
    'ORIGINAL_DIR',
    'METADATA_DIR',
    'LOW_TOOL_ROOT',
  ])
    delete env[name];
  const result = spawnSync(
    process.execPath,
    [SCRIPT, 'research', '--root', root],
    { encoding: 'utf8', env },
  );
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /Environment variable "FORGE_HAMMER_ROOT" is required/,
  );
  assert.equal(readFileSync(config, 'utf8'), before);
});

test('MCP profiles - explicit sibling roots resolve without fixed workspace paths', (t) => {
  const root = makeFixture(t);
  const env = {
    ...process.env,
    FORGE_HAMMER_ROOT: join(root, 'peer'),
    ORIGINAL_DIR: join(root, 'original'),
    METADATA_DIR: join(root, 'metadata'),
    LOW_TOOL_ROOT: join(root, 'low-tool'),
  };
  const result = spawnSync(
    process.execPath,
    [SCRIPT, 'research', '--root', root],
    { encoding: 'utf8', env },
  );
  assert.equal(result.status, 0, result.stderr);
  const servers = readJson(join(root, '.omp', 'mcp.json')).mcpServers;
  assert.equal(
    servers['graphify-forge-hammer'].args.at(-1),
    `${env.FORGE_HAMMER_ROOT}/graphify-out/graph.json`,
  );
  assert.equal(
    servers['graphify-foe-info-original'].args.at(-1),
    `${env.ORIGINAL_DIR}/graphify-out/graph.json`,
  );
  assert.equal(
    servers['graphify-metadata-store'].args.at(-1),
    `${env.METADATA_DIR}/graphify-out/graph.json`,
  );
  assert.equal(
    servers['graphify-low-tool'].args.at(-1),
    `${env.LOW_TOOL_ROOT}/graphify-out/graph.json`,
  );
});
