import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs, {
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

const SCRIPT_DIR = resolve(new URL('.', import.meta.url).pathname);
const PROJECT_ROOT = resolve(SCRIPT_DIR, '../..');
const AGENTS_DIR = join(PROJECT_ROOT, '.agents');
const SCRIPT = join(AGENTS_DIR, 'scripts', 'mcp-profile.mjs');
const REGISTRY = join(AGENTS_DIR, 'mcp-registry.json');
// `.agents/` is git-ignored, so these tests cannot run on a fresh clone.
const SKIP =
  fs.existsSync(SCRIPT) ? false : '.agents/ is git-ignored (see .gitignore)';

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

test(
  'MCP profiles - registry defines lean and task-scoped server sets',
  { skip: SKIP },
  () => {
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
  },
);

test(
  'MCP profiles - activation writes .omp/mcp.json',
  { skip: SKIP },
  async (t) => {
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
  },
);

test(
  'MCP profiles - browser profile resolves graphify env at generation time',
  { skip: SKIP },
  (t) => {
    const root = makeFixture(t);
    const result = spawnSync('node', [SCRIPT, 'browser', '--root', root], {
      encoding: 'utf8',
      env: { ...process.env, HOME: '/portable/home', USER: 'portable-user' },
    });
    assert.equal(result.status, 0, result.stderr);

    const ompConfig = readJson(join(root, '.omp', 'mcp.json'));
    const environment = ompConfig.mcpServers['graphify-foe-info'].env;
    assert.equal(environment.OPENAI_BASE_URL, 'http://127.0.0.1:8080/v1');
    assert.equal(environment.GRAPHIFY_BACKEND, 'openai');
  },
);

test(
  'MCP profiles - unknown profile fails without changing configs',
  { skip: SKIP },
  (t) => {
    const root = makeFixture(t);
    const ompPath = join(root, '.omp', 'mcp.json');
    const before = readFileSync(ompPath, 'utf8');
    const result = spawnSync('node', [SCRIPT, 'missing', '--root', root], {
      encoding: 'utf8',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unknown MCP profile "missing"/);
    assert.equal(readFileSync(ompPath, 'utf8'), before);
  },
);

test(
  'MCP profiles - predictable temp symlinks cannot overwrite another file',
  { skip: SKIP },
  (t) => {
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
  },
);

test(
  'MCP profiles - symlinked destinations fail before config changes',
  { skip: SKIP },
  (t) => {
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
  },
);

test('MCP profiles - reports which hosts were written', { skip: SKIP }, (t) => {
  const root = makeFixture(t);
  const result = spawnSync('node', [SCRIPT, 'browser', '--root', root], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.hosts, { written: ['omp'], skipped: [] });
});

test(
  'MCP profiles - a missing host directory is a skip, not a failure',
  { skip: SKIP },
  (t) => {
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
  },
);

test(
  'MCP profiles - an unsupported host slot fails loudly',
  { skip: SKIP },
  (t) => {
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
  },
);
