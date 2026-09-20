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
import { format, resolveConfig } from 'prettier';

const PROJECT_ROOT = resolve('.');
const SCRIPT = join(PROJECT_ROOT, '.agents', 'scripts', 'mcp-profile.mjs');
const REGISTRY = join(PROJECT_ROOT, '.agents', 'mcp-registry.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function makeFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'mcp-profile-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.agents'), { recursive: true });
  cpSync(REGISTRY, join(root, '.agents', 'mcp-registry.json'));
  writeFileSync(
    join(root, '.agents', 'mcp_config.json'),
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
  assert.deepEqual(registry.profiles.linux, [
    'graphify-foe-info',
    'linux-tools',
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

test('MCP profiles - activation writes Antigravity mcp_config.json', async (t) => {
  const root = makeFixture(t);
  const result = spawnSync('node', [SCRIPT, 'browser', '--root', root], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);

  const antigravity = readJson(join(root, '.agents', 'mcp_config.json'));
  assert.deepEqual(Object.keys(antigravity.mcpServers), [
    'graphify-foe-info',
    'chrome-devtools',
  ]);

  const prettierConfig =
    (await resolveConfig(join(PROJECT_ROOT, 'package.json'))) ?? {};
  const target = join(root, '.agents', 'mcp_config.json');
  const generated = readFileSync(target, 'utf8');
  const formatted = await format(generated, {
    ...prettierConfig,
    filepath: target,
  });
  assert.equal(generated, formatted, `${target} must be Prettier-stable`);
});

test('MCP profiles - Antigravity environment placeholders resolve at generation time', (t) => {
  const root = makeFixture(t);
  const result = spawnSync('node', [SCRIPT, 'linux', '--root', root], {
    encoding: 'utf8',
    env: { ...process.env, HOME: '/portable/home', USER: 'portable-user' },
  });
  assert.equal(result.status, 0, result.stderr);

  const antigravity = readJson(join(root, '.agents', 'mcp_config.json'));
  const environment = antigravity.mcpServers['linux-tools'].env;
  assert.equal(environment.LINUX_MCP_USER, 'portable-user');
  assert.equal(
    environment.LINUX_MCP_SSH_KEY_PATH,
    '/portable/home/.ssh/id_ed25519',
  );
});

test('MCP profiles - unknown profile fails without changing configs', (t) => {
  const root = makeFixture(t);
  const antigravityPath = join(root, '.agents', 'mcp_config.json');
  const before = readFileSync(antigravityPath, 'utf8');
  const result = spawnSync('node', [SCRIPT, 'missing', '--root', root], {
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown MCP profile "missing"/);
  assert.equal(readFileSync(antigravityPath, 'utf8'), before);
});

test('MCP profiles - predictable temp symlinks cannot overwrite another file', (t) => {
  const root = makeFixture(t);
  const victim = join(root, 'victim.json');
  const before = '{"protected":true}\n';
  writeFileSync(victim, before);
  symlinkSync(victim, join(root, '.agents', 'mcp_config.json.tmp'));

  const result = spawnSync('node', [SCRIPT, 'browser', '--root', root], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(victim, 'utf8'), before);
});

test('MCP profiles - symlinked destinations fail before config changes', (t) => {
  const root = makeFixture(t);
  const antigravityPath = join(root, '.agents', 'mcp_config.json');
  const victim = join(root, 'external-config.json');
  const victimBefore = readFileSync(antigravityPath, 'utf8');
  writeFileSync(victim, victimBefore);
  unlinkSync(antigravityPath);
  symlinkSync(victim, antigravityPath);

  const result = spawnSync('node', [SCRIPT, 'browser', '--root', root], {
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /symlink/i);
  assert.equal(readFileSync(victim, 'utf8'), victimBefore);
});
