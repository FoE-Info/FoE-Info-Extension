import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readProjectFile = (file) => readFile(path.join(projectRoot, file), 'utf8');

function miseTaskNames(miseConfig) {
  return [...miseConfig.matchAll(/^\[tasks\.(?:"([^"]+)"|([^\]]+))\]$/gm)].map(
    (match) => match[1] ?? match[2],
  );
}

test('keeps npm, mise, and VS Code task names in exact parity', async () => {
  const packageJson = JSON.parse(await readProjectFile('package.json'));
  const miseConfig = await readProjectFile('.mise.toml');
  const vscodeTasks = JSON.parse(await readProjectFile('.vscode/tasks.json'));
  const expected = Object.keys(packageJson.scripts).sort();
  const npmTasks = vscodeTasks.tasks
    .filter((task) => task.type === 'npm')
    .map((task) => task.script)
    .sort();

  assert.deepEqual(miseTaskNames(miseConfig).sort(), expected);
  assert.deepEqual(npmTasks, expected);

  const miseResult = spawnSync('mise', ['config', 'ls'], { cwd: projectRoot, encoding: 'utf8' });
  if (miseResult.error?.code !== 'ENOENT') {
    assert.equal(miseResult.status, 0, miseResult.stderr);
  }
});

test('uses build as the only production-build task name', async () => {
  const packageJson = JSON.parse(await readProjectFile('package.json'));
  const miseConfig = await readProjectFile('.mise.toml');
  const vscodeTasks = JSON.parse(await readProjectFile('.vscode/tasks.json'));
  const readme = await readProjectFile('README.md');
  const webpackRules = await readProjectFile('.agents/rules/webpack-build.md');

  assert.equal(packageJson.scripts['build-foe-info'], undefined);
  assert.doesNotMatch(miseConfig, /^\[tasks\.build-foe-info\]$/m);
  assert.equal(
    vscodeTasks.tasks.some((task) => task.script === 'build-foe-info'),
    false,
  );
  assert.doesNotMatch(readme, /build-foe-info/);
  assert.doesNotMatch(webpackRules, /build-foe-info/);
});

test('pins repository-managed tool and MCP package versions', async () => {
  const miseConfig = await readProjectFile('.mise.toml');
  const packageJson = JSON.parse(await readProjectFile('package.json'));
  const mcpConfig = JSON.parse(await readProjectFile('.agents/mcp_config.json'));
  const graphifySpec = 'graphifyy[gemini,mcp]==0.9.36';

  assert.match(miseConfig, /^uv = "0\.12\.3"$/m);
  assert.match(miseConfig, /^"npm:npm-check-updates" = "23\.0\.1"$/m);
  assert.match(packageJson.scripts.outdated, /npm-check-updates@23\.0\.1/);
  assert.equal(mcpConfig.mcpServers.graphify.args[1], graphifySpec);
  assert.equal(mcpConfig.mcpServers.chrome_devtools.args[1], 'chrome-devtools-mcp@1.6.0');

  const graphifyReferences = [
    'README.md',
    'package.json',
    '.mise.toml',
    '.agents/mcp_config.json',
    '.agents/rules/environment-paths.md',
    '.agents/rules/graphify.md',
    '.agents/workflows/graphify-sync.md',
    'docs/knowledgebase/agent-workflow-guide.md',
  ];
  for (const file of graphifyReferences) {
    const contents = await readProjectFile(file);
    assert.doesNotMatch(contents, /graphifyy\[gemini,mcp\](?!==0\.9\.36)/, file);
  }
});

test('keeps project agent configuration graphable and machine-portable', async () => {
  const graphifyIgnore = await readProjectFile('.graphifyignore');
  assert.match(graphifyIgnore, /^\.agents\/skills\/$/m);
  assert.doesNotMatch(graphifyIgnore, /^\.agents\/$/m);

  const rulesDir = path.join(projectRoot, '.agents/rules');
  for (const entry of await readdir(rulesDir)) {
    if (!entry.endsWith('.md')) continue;
    const contents = await readFile(path.join(rulesDir, entry), 'utf8');
    assert.doesNotMatch(contents, /file:\/\/\/var\/home\//, entry);
  }
});

test('keeps environment and dependency guidance aligned with the repository', async () => {
  const conventions = await readProjectFile('.agents/rules/codebase-conventions.md');
  const environmentLoader = await readProjectFile('.agents/env.sh');
  const webpackRules = await readProjectFile('.agents/rules/webpack-build.md');
  const workflowGuide = await readProjectFile('docs/knowledgebase/agent-workflow-guide.md');

  assert.match(conventions, /jQuery 4\.0/);
  assert.doesNotMatch(conventions, /jQuery 3\.7/);
  assert.doesNotMatch(webpackRules, /\.envrc/);
  assert.doesNotMatch(workflowGuide, /\*\*`\.envrc`\*\*/);
  assert.match(environmentLoader, /chmod 600 "\$AGENTS_ENV_FILE"/);

  for (const file of ['.env', '.env.local']) {
    const filePath = path.join(projectRoot, file);
    const fileStat = await stat(filePath).catch((error) => {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    });
    if (!fileStat) continue;
    const mode = fileStat.mode & 0o777;
    assert.equal(mode, 0o600, `${file} should only be readable and writable by its owner`);
  }
});
