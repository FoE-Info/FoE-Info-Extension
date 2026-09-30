import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const SCRIPT = path.join(root, 'scripts', 'audit-references.mjs');

/**
 * Run the real audit script against a throwaway project.
 *
 * ROOT is derived from the script's own location, so copying the script into a
 * temp tree points it at that tree. `read()` returns '' for absent files, so a
 * fixture only needs the files a given assertion depends on. This exercises the
 * shipped logic end to end rather than a re-implementation of it.
 *
 * @param {Object} files - relative path -> file body
 * @param {Object} siblings - relative path (beside the fixture) -> file body
 * @param {Object} options
 * @param {'local'|'published'} options.scope
 * @param {boolean} options.git - when true, init a git repo and stage every
 *   file in `files` so published scope sees them as tracked. Untracked files
 *   are still written to disk so local scope can scan them.
 * @param {string[]} options.forceTracked - ignored files to force into the index
 * @returns {{ findings: any[], exitCode: number, scope: string }}
 */
function runAudit(files, siblings = {}, options = {}) {
  const scope = options.scope ?? 'local';
  const useGit = options.git ?? false;
  const tracked = options.tracked ?? Object.keys(files);

  // `siblings` are written NEXT TO the fixture, matching how the real script
  // resolves a `../<repo>` root relative to its own repository root.
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-refs-'));
  const dir = path.join(parent, 'proj');
  fs.mkdirSync(dir, { recursive: true });
  try {
    fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
    fs.copyFileSync(SCRIPT, path.join(dir, 'scripts', 'audit-references.mjs'));
    for (const [rel, body] of Object.entries(files)) {
      const target = path.join(dir, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, body);
    }
    // Sibling repositories live NEXT TO the fixture, matching how the real
    // script resolves a `../<repo>` root relative to its own repository root.
    for (const [rel, body] of Object.entries(siblings)) {
      const target = path.join(parent, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, body);
    }
    // A minimal but realistic project: the audit reads package.json for the npm
    // script surface, so a fixture without one is not a shape it must support.
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      `${JSON.stringify({ name: 'fixture', version: '0.0.0', scripts: {} }, null, 2)}\n`,
    );

    if (useGit) {
      execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
      execFileSync('git', ['config', 'user.email', 'test@example.com'], {
        cwd: dir,
        stdio: 'ignore',
      });
      execFileSync('git', ['config', 'user.name', 'Test'], {
        cwd: dir,
        stdio: 'ignore',
      });
      for (const rel of tracked) {
        if (files[rel] !== undefined) {
          const force = options.forceTracked?.includes(rel) ? ['-f'] : [];
          execFileSync('git', ['add', ...force, rel], {
            cwd: dir,
            stdio: 'ignore',
          });
        }
      }
    }

    const args = [path.join(dir, 'scripts', 'audit-references.mjs'), '--json'];
    if (scope !== 'local') args.push(`--scope=${scope}`);
    let stdout = '';
    let exitCode = 0;
    try {
      stdout = execFileSync(process.execPath, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      // Exit 1 means findings exist; exit 2 means bad args / no git repo.
      stdout = error.stdout ?? '';
      exitCode = error.status ?? 1;
    }
    const parsed = stdout ? JSON.parse(stdout) : { findings: [] };
    return {
      findings: parsed.findings ?? [],
      exitCode,
      scope: parsed.scope ?? scope,
    };
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

const tokens = (findings) => findings.map((f) => f.token);

test('MCP check: graph node IDs and ordinary symbols are not tool references', () => {
  const { findings, exitCode } = runAudit({
    'README.md': [
      'Why does `bignumber.js` connect to `ref_node_test` and `ref_node_assert`?',
      'The code uses `node_cache`, `graph_label`, and `calculate_stats`.',
    ].join('\n'),
  });
  assert.deepEqual(findings, []);
  assert.equal(exitCode, 0);
});

test('MCP check: documented tools resolve and unknown tool names are reported', () => {
  const { findings } = runAudit({
    'README.md': [
      'Graphify MCP tools: `query_graph`, `get_node`, `project_path`.',
      'Use the `missing_node` MCP tool.',
      'The graphify-foe-info server exposes `get_neigbors` and `retired_tool`.',
    ].join('\n'),
  });
  assert.deepEqual(
    findings.filter((f) => f.kind === 'unknown-mcp-tool').map((f) => f.token),
    ['missing_node', 'get_neigbors', 'retired_tool'],
  );
});

test('env-var check: a code symbol that only reads as UPPER_SNAKE is not an env var', () => {
  // `MY_CODE_SYMBOL` is an ordinary const in the source, never assigned as a
  // variable. Before the assignment gate this was reported as an undefined
  // env var, which is what made RULES and VERSION_PATTERN show up.
  const { findings } = runAudit({
    'src/lib.js':
      'const MY_CODE_SYMBOL = { a: 1 };\nmodule.exports = MY_CODE_SYMBOL;\n',
    'README.md': 'The rule bank lives in `MY_CODE_SYMBOL`.\n',
  });
  assert.ok(
    !tokens(findings).includes('MY_CODE_SYMBOL'),
    'a code symbol must not be reported as an undefined env var',
  );
});

test('env-var check: a read-only override is not repo drift', () => {
  // `process.env.MY_OVERRIDE || fallback` is read but never written, so the
  // value is the developer's to supply. METADATA_STORE_DIR is this exact
  // shape: an optional path override for the metadata graph.
  const { findings } = runAudit({
    'src/lib.mjs':
      'const dir = process.env.MY_OVERRIDE || "/default";\nexport default dir;\n',
    'README.md': 'Point it elsewhere with `MY_OVERRIDE`.\n',
  });
  assert.ok(
    !tokens(findings).includes('MY_OVERRIDE'),
    'a read-only override must not be reported as undefined',
  );
});

test('env-var check: an assignment the repo never provides is still reported', () => {
  // The gate must not silence the class entirely. Prose that tells a reader to
  // set a variable, where nothing in the repo assigns one, is real drift.
  const { findings } = runAudit({
    'src/lib.mjs': 'export const x = 1;\n',
    'README.md': 'Disable it with `MY_UNDEFINED_SETTING=1`.\n',
  });
  assert.ok(
    tokens(findings).includes('MY_UNDEFINED_SETTING'),
    'an assignment-style reference to an undefined var must still be reported',
  );
});

test('url-path check: rooted external endpoints are not unresolved references', () => {
  // The old rule matched only InnoGames prefixes, so an OpenRouter API path
  // was reported. Any rooted path is a URL path unless it names a real
  // filesystem location.
  const { findings } = runAudit({
    'README.md':
      'Reachable only on OpenRouter’s `/api/alpha/decisions`, not the `/game/json` endpoint.\n',
  });
  assert.deepEqual(
    findings.filter((f) => f.kind === 'unresolved-path'),
    [],
    'rooted URL paths must not be reported',
  );
});

test('url-path check: a rooted filesystem path that is gone is still drift', () => {
  // The other half of the rule: `/var/...` is a real local path, so if it
  // stops existing that is worth reporting rather than excusing as a URL.
  const { findings } = runAudit({
    'README.md': 'The rebuild log lives at `/var/tmp/does-not-exist/log`.\n',
  });
  assert.ok(
    tokens(findings).includes('/var/tmp/does-not-exist/log'),
    'a missing absolute filesystem path must still be reported',
  );
});

test('sibling-repo check: a path in a peer repo resolves, not flagged', () => {
  // Tracked docs can reference a peer repository's module by path. Those paths
  // are correct but live in another repository, so the auditor must verify
  // them against that repository rather than report them as unresolved.
  //
  // `src/` exists in the fixture on purpose. Without it the auditor
  // short-circuits before trying any candidate and the assertion holds
  // vacuously — so this asserts BOTH directions: the same prose is reported
  // when the peer is absent, and silent when it is present. That is what makes
  // it a test of sibling resolution rather than of the fixture.
  const readme = 'The peer repo keeps its module at `src/extras/index.js`.\n';
  const { findings: absent } = runAudit({
    'README.md': readme,
    'src/app.js': 'x\n',
  });
  assert.ok(
    tokens(absent).includes('src/extras/index.js'),
    'without the peer repo present, the path must be reported',
  );

  const { findings: present } = runAudit(
    { 'README.md': readme, 'src/app.js': 'x\n' },
    { 'forge-hammer/src/extras/index.js': 'export const x = 1;\n' },
  );
  assert.deepEqual(
    present.filter((f) => f.kind === 'unresolved-path'),
    [],
    'a path that exists in the sibling repo must not be reported',
  );
});

test('a local sibling registered in .audit-siblings resolves, not flagged', () => {
  // A private fork or a worktree beside this repository has paths that notes
  // cite, and naming it in a tracked file is what the local list exists to
  // avoid: the root comes from optional `.audit-siblings` configuration. The
  // resolution behaviour is identical to a built-in root, so this is the same
  // capability under a name the repository does not have to carry.
  //
  // `src/` exists in the fixture on purpose. Without it the auditor
  // short-circuits before trying any candidate and the assertion holds
  // vacuously — so both directions are asserted. That is what makes it a test
  // of sibling resolution rather than of the fixture.
  const readme = 'The peer keeps its module at `src/extras/index.js`.\n';
  const base = { 'README.md': readme, 'src/app.js': 'x\n' };
  const peer = { 'peer-repo/src/extras/index.js': 'export const x = 1;\n' };

  assert.ok(
    tokens(runAudit(base, peer).findings).includes('src/extras/index.js'),
    'with no root registered, the path must be reported',
  );
  // Assert on the token rather than on a finding `kind`: a token whose head is
  // a real directory reports as `unresolved-path` while a bare fragment
  // reports as `unresolved-path-fragment`, and filtering on one of the two
  // silently matches nothing.
  const resolved = tokens(
    runAudit({ ...base, '.audit-siblings': '# local\n../peer-repo\n' }, peer)
      .findings,
  );
  assert.ok(
    !resolved.includes('src/extras/index.js'),
    'a root registered in .audit-siblings must resolve',
  );
});

test('a bare fragment resolves against a local sibling extras root', () => {
  // `fn/users.js` is written relative to a module root, so it only resolves
  // against that root rather than this repository's own src/js/fn.
  const readme = 'See `fn/users.js` and `fn/extras.js`.\n';
  const files = {
    'README.md': readme,
    'src/app.js': 'x\n',
    '.audit-siblings': '../peer-repo/src/extras\n',
  };
  const peer = {
    'peer-repo/src/extras/fn/users.js': 'export const a = 1;\n',
    'peer-repo/src/extras/fn/extras.js': 'export const b = 2;\n',
  };

  assert.ok(
    tokens(
      runAudit({ 'README.md': readme, 'src/app.js': 'x\n' }, peer).findings,
    ).includes('fn/users.js'),
    'without an extras root the fragment must be reported',
  );
  const resolved = tokens(runAudit(files, peer).findings);
  assert.ok(!resolved.includes('fn/users.js'), 'fn/users.js must resolve');
  assert.ok(!resolved.includes('fn/extras.js'), 'fn/extras.js must resolve');
});

test('a path into a git-ignored root is reported, not read as a convention', () => {
  // `docs/roadmap.md` is the exact shape this rule exists for. Once `docs/` stops
  // being tracked its head is no longer a directory, so the `a.b/c` convention
  // heuristic used to skip the token — and every citation of the backlog went
  // unreported while still sitting in tracked files.
  const prose = 'The open items are listed in `docs/roadmap.md`.\n';

  assert.ok(
    !tokens(runAudit({ 'README.md': prose }).findings).includes(
      'docs/roadmap.md',
    ),
    'with no exclusion on record the convention heuristic still applies',
  );
  assert.ok(
    tokens(
      runAudit({ 'README.md': prose, '.gitignore': '/docs/\n' }).findings,
    ).includes('docs/roadmap.md'),
    'an excluded root turns the token into a broken reference that is reported',
  );
});

test('a documented build output is not a broken reference', () => {
  // The same rule must not fire on `build/FoE-Info-DEV`, which README and
  // CONTRIBUTING name as the unpacked extension a contributor produces with
  // `npm run dev`. It is absent from every clone by design, so reporting it
  // would make a correct document look broken.
  const { findings } = runAudit({
    'README.md': 'Load `build/FoE-Info-DEV` as an unpacked extension.\n',
    '.gitignore': 'build/\n',
  });
  assert.deepEqual(
    findings.filter((f) => f.kind === 'unresolved-path'),
    [],
    'a generated output directory named in setup instructions is not drift',
  );
});

test('published scope accepts a generated Graphify executable with or without a local venv', () => {
  const files = {
    'README.md':
      'Run `.venv/bin/graphify` after synchronizing the Python environment.\n',
    '.gitignore': '.venv/\n',
  };
  for (const installed of [false, true]) {
    const fixture =
      installed ?
        { ...files, '.venv/bin/graphify': '#!/usr/bin/env python\n' }
      : files;
    const { findings, exitCode } = runAudit(
      fixture,
      {},
      { scope: 'published', git: true, tracked: Object.keys(files) },
    );
    assert.deepEqual(findings, [], `installed=${installed}`);
    assert.equal(exitCode, 0);
  }
});

test('scope isolation: published scope ignores untracked local-only surfaces', () => {
  // A local-only agent note references a missing file. In local scope that is
  // a real finding; in published scope the surface is not part of the repo,
  // so it must not influence the result.
  const files = {
    'README.md': 'See the agent notes.\n',
    '.gitignore': '/.agents/\n',
    '.agents/notes.md': 'The helper is `.agents/helpers/missing-helper.mjs`.\n',
    'src/app.js': 'x\n',
  };
  const local = runAudit(
    files,
    {},
    { git: true, tracked: ['README.md', 'src/app.js'] },
  );
  assert.ok(
    tokens(local.findings).includes('.agents/helpers/missing-helper.mjs'),
    'local scope must scan the untracked agent surface',
  );

  const published = runAudit(
    files,
    {},
    {
      scope: 'published',
      git: true,
      tracked: ['README.md', 'src/app.js'],
    },
  );
  assert.ok(
    !tokens(published.findings).includes('missing-helper.mjs'),
    'published scope must ignore untracked local-only surfaces',
  );
  assert.equal(published.exitCode, 0, 'published scope must exit clean');
});

test('scope isolation: published scope still reports broken tracked references', () => {
  // Excluding local surfaces must not suppress real drift in tracked files.
  const files = {
    'README.md': 'The manifest is `src/manifests/missing-manifest.json`.\n',
    'src/app.js': 'x\n',
  };
  const published = runAudit(
    files,
    {},
    {
      scope: 'published',
      git: true,
      tracked: Object.keys(files),
    },
  );
  assert.ok(
    tokens(published.findings).includes('src/manifests/missing-manifest.json'),
    'published scope must report a missing reference in a tracked surface',
  );
  assert.equal(
    published.exitCode,
    1,
    'published scope must exit with findings',
  );
});

test('publication policy: AGENTS.md is scanned before and after staging', () => {
  const files = {
    'README.md': 'See [agent instructions](AGENTS.md).\n',
    'AGENTS.md': 'See [missing guide](docs/missing-guide.md).\n',
  };
  for (const tracked of [['README.md'], Object.keys(files)]) {
    const published = runAudit(
      files,
      {},
      { scope: 'published', git: true, tracked },
    );
    assert.ok(
      published.findings.some(
        (f) => f.file === 'AGENTS.md' && f.token === 'docs/missing-guide.md',
      ),
      'the canonical entrypoint must not be silently excluded',
    );
    assert.equal(published.exitCode, 1);
    assert.ok(!tokens(published.findings).includes('AGENTS.md'));
  }
});

test('publication policy: shared agent configuration, plans, and backlog are accepted before and after staging', () => {
  const files = {
    'README.md':
      'See [agents](.agents/notes.md), [design](docs/feature-design.md), and [backlog](docs/roadmap.md).\n',
    '.agents/notes.md': 'Shared specialist guidance.\n',
    '.codex/config.toml': 'approval_policy = "never"\n',
    'docs/feature-design.md': 'Shared design.\n',
    'conductor/notes.md': 'Shared guidance.\n',
    'docs/roadmap.md': 'Shared backlog.\n',
  };
  for (const tracked of [['README.md'], Object.keys(files)]) {
    const published = runAudit(
      files,
      {},
      { scope: 'published', git: true, tracked },
    );
    assert.equal(published.exitCode, 0);
    assert.deepEqual(published.findings, []);
  }
});

test('publication policy: shared agent references are checked before and after staging', () => {
  const files = {
    'README.md': 'Shared entrypoint.\n',
    '.agents/notes.md': 'See [missing guide](missing-guide.md).\n',
  };
  for (const tracked of [['README.md'], Object.keys(files)]) {
    const published = runAudit(
      files,
      {},
      { scope: 'published', git: true, tracked },
    );
    assert.equal(published.exitCode, 1);
    assert.ok(
      published.findings.some(
        (f) => f.file === '.agents/notes.md' && f.kind === 'broken-md-link',
      ),
    );
  }
});

test('publication policy: accidentally publishable credentials and runtime state are findings', () => {
  const privateFiles = {
    '.audit-siblings': '../private-fixture-peer\n',
    '.env': 'DUMMY_KEY=fixture\n',
    '.env.local': 'DUMMY_KEY=fixture\n',
    '.envrc': 'private\n',
    '.agents/.env.local': 'DUMMY_KEY=fixture\n',
    '.codex/auth.json': '{"token":"fixture-value"}\n',
    '.agents/.last_graph_query_stamp': 'runtime timestamp\n',
    '.husky/.graphify-python': '/machine-specific/python\n',
  };
  const files = { 'README.md': 'Shared instructions.\n', ...privateFiles };
  for (const tracked of [['README.md'], Object.keys(files)]) {
    const published = runAudit(
      files,
      {},
      { scope: 'published', git: true, tracked },
    );
    assert.equal(published.exitCode, 1);
    assert.deepEqual(
      published.findings
        .filter((f) => f.kind === 'publication-policy')
        .map((f) => f.file)
        .sort(),
      Object.keys(privateFiles).sort(),
    );
    assert.ok(!JSON.stringify(published).includes('private-fixture-peer'));
    assert.ok(!JSON.stringify(published).includes('DUMMY_KEY=fixture'));
    assert.ok(!JSON.stringify(published).includes('fixture-value'));
  }
});

test('publication policy: ignore rules retain shared harness sources and exclude credentials', () => {
  const files = {
    '.gitignore': fs.readFileSync(path.join(root, '.gitignore'), 'utf8'),
    'README.md':
      'See [agent instructions](AGENTS.md), [specialist](.agents/notes.md), [config](.omp/mcp.json), and [backlog](docs/roadmap.md).\n',
    'AGENTS.md': 'See [README](README.md).\n',
    '.agents/notes.md': 'Shared notes.\n',
    '.codex/config.toml': 'approval_policy = "never"\n',
    '.omp/mcp.json': '{"mcpServers":{}}\n',
    'docs/roadmap.md': 'Shared backlog.\n',
    '.env': 'DUMMY_KEY=fixture\n',
    '.agents/.env.local': 'DUMMY_KEY=fixture\n',
    '.codex/auth.json': '{"token":"fixture-value"}\n',
    '.agents/.last_graph_query_stamp': 'timestamp\n',
    '.husky/.graphify-python': 'private\n',
    '.audit-siblings': '../private-fixture-peer\n',
  };
  const published = runAudit(
    files,
    {},
    {
      scope: 'published',
      git: true,
      tracked: ['README.md', '.gitignore', 'AGENTS.md'],
    },
  );
  assert.equal(published.exitCode, 0);
  assert.deepEqual(published.findings, []);
});

test('publication policy: forcibly tracked credential files are reported without values', () => {
  const config = '.codex/auth.json';
  const files = {
    '.gitignore': fs.readFileSync(path.join(root, '.gitignore'), 'utf8'),
    'README.md': 'Shared entrypoint.\n',
    [config]: '{"token":"fixture-value"}\n',
  };
  const published = runAudit(
    files,
    {},
    {
      scope: 'published',
      git: true,
      tracked: Object.keys(files),
      forceTracked: [config],
    },
  );
  assert.equal(published.exitCode, 1);
  assert.deepEqual(
    published.findings.map((f) => [f.kind, f.file]),
    [['publication-policy', config]],
  );
  assert.ok(!JSON.stringify(published).includes('fixture-value'));
});

test('scope isolation: published scope requires a git repository', () => {
  // Outside a git repo the published scope has no source of truth for tracked
  // files, so it must fail fast with exit code 2 rather than silently pass.
  const published = runAudit(
    { 'README.md': 'No git repo here.\n', 'src/app.js': 'x\n' },
    {},
    { scope: 'published', git: false },
  );
  assert.equal(
    published.exitCode,
    2,
    'published scope outside a git repo must exit 2',
  );
});

test('scope isolation: an ignored local file cannot satisfy a tracked published reference', () => {
  // A tracked README links to a file that exists on disk but lives under a
  // git-ignored agent directory. Local scope resolves it; published scope must
  // not, because the file is not part of the tracked tree.
  const files = {
    'README.md': 'See [secret](.agents/secret.md).\n',
    '.gitignore': '/.agents/\n',
    '.agents/secret.md': 'local-only\n',
    'src/app.js': 'x\n',
  };
  const tracked = ['README.md', 'src/app.js'];
  const local = runAudit(files, {}, { git: true, tracked });
  assert.deepEqual(
    local.findings.filter((f) => f.kind === 'broken-md-link'),
    [],
    'local scope may resolve a locally-present git-ignored file',
  );

  const published = runAudit(
    files,
    {},
    { scope: 'published', git: true, tracked },
  );
  assert.ok(
    tokens(published.findings).includes('.agents/secret.md'),
    'published scope must reject a git-ignored resolution target',
  );
});

test('scope isolation: an ignored ordinary file cannot satisfy a tracked published reference', () => {
  // A tracked README links to a file that exists on disk but is ignored
  // by this fixture's .gitignore. Local scope
  // resolves it; published scope must report it because it is not publishable.
  const files = {
    'README.md': 'See [secret](.agents/secret.md).\n',
    '.gitignore': '/.agents/\n',
    '.agents/secret.md': 'local-only\n',
    'src/app.js': 'x\n',
  };
  const tracked = ['README.md', '.gitignore', 'src/app.js'];
  const local = runAudit(files, {}, { git: true, tracked });
  assert.deepEqual(
    local.findings.filter((f) => f.kind === 'broken-md-link'),
    [],
    'local scope may resolve a locally-present ignored file',
  );

  const published = runAudit(
    files,
    {},
    { scope: 'published', git: true, tracked },
  );
  assert.ok(
    tokens(published.findings).includes('.agents/secret.md'),
    'published scope must reject an ignored/local-only resolution target',
  );
});

test('scope isolation: a nonignored untracked addition resolves in published scope', () => {
  // In-progress user work that is not ignored should be included in the
  // publishable set without forcing the user to stage it.
  const files = {
    'README.md': 'See `src/extra.js`.\n',
    'src/extra.js': 'export const x = 1;\n',
    'src/app.js': 'x\n',
  };
  const tracked = ['README.md', 'src/app.js'];
  const published = runAudit(
    files,
    {},
    { scope: 'published', git: true, tracked },
  );
  assert.deepEqual(
    published.findings.filter((f) => f.kind === 'unresolved-path'),
    [],
    'published scope must resolve a nonignored untracked addition',
  );
  assert.equal(published.exitCode, 0, 'published scope exits clean');
});

test('scope isolation: unknown scope exits with code 2', () => {
  const { exitCode } = runAudit(
    { 'README.md': 'x\n', 'src/app.js': 'x\n' },
    {},
    { scope: 'invalid' },
  );
  assert.equal(exitCode, 2, 'an unknown scope must exit 2');
});

for (const scope of ['local', 'published']) {
  test(`illustrative guidance: marked examples are excluded in ${scope} scope`, () => {
    const skill = [
      '# Generic skill',
      'Compare `.github/copilot-instructions.md`. <!-- audit-refs: illustrative -->',
      '`src/generated/` is produced by `npm run generate`. <!-- audit-refs: illustrative -->',
      'Use `src/missing.js` and `npm run missing`.',
      '[Required guide](missing-guide.md) <!-- audit-refs: illustrative -->',
    ].join('\n');
    const { findings, exitCode } = runAudit(
      {
        '.agents/skills/generic/SKILL.md': skill,
        '.github/workflows/ci.yml': '',
        'src/app.js': '',
      },
      {},
      { scope, git: scope === 'published' },
    );
    assert.equal(exitCode, 1);
    assert.deepEqual(
      tokens(findings).sort(),
      ['src/missing.js', 'npm run missing', 'missing-guide.md'].sort(),
    );
  });
}
