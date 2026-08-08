import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(projectRoot, 'scripts/graphify-filter-surprises.mjs');

test('regenerates the architecture report from runtime source code only', async () => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), 'graphify-runtime-report-'));
  const graphPath = path.join(fixtureDir, 'graph.json');
  const reportPath = path.join(fixtureDir, 'GRAPH_REPORT.md');
  const graph = {
    nodes: [
      {
        id: 'request',
        label: 'handleRequest()',
        file_type: 'code',
        source_file: 'src/js/request.js',
        community: 1,
      },
      {
        id: 'dispatch',
        label: 'dispatchService()',
        file_type: 'code',
        source_file: 'src/js/dispatch.js',
        community: 2,
      },
      {
        id: 'documentation',
        label: 'DevTools Network Dispatch Architecture',
        file_type: 'concept',
        source_file: 'docs/domain-services.md',
        community: 3,
      },
      {
        id: 'agent-rule',
        label: 'Agent Workflow',
        file_type: 'document',
        source_file: '.agents/rules/workflow.md',
        community: 4,
      },
      {
        id: 'logo',
        label: 'Logo Asset',
        file_type: 'image',
        source_file: 'src/images/logo.png',
        community: 5,
      },
    ],
    links: [
      {
        source: 'request',
        target: 'dispatch',
        relation: 'calls',
        confidence: 'EXTRACTED',
      },
      {
        source: 'request',
        target: 'documentation',
        relation: 'documented_by',
        confidence: 'INFERRED',
      },
      {
        source: 'request',
        target: 'agent-rule',
        relation: 'governed_by',
        confidence: 'INFERRED',
      },
    ],
    hyperedges: [
      {
        label: 'Mixed Documentation Group',
        nodes: ['request', 'documentation', 'agent-rule'],
        confidence: 'INFERRED',
      },
    ],
  };
  await writeFile(graphPath, JSON.stringify(graph));
  await writeFile(
    reportPath,
    [
      '# Graph report',
      '## Summary',
      '- 5 nodes',
      '## Community Hubs',
      '- Documentation',
      '## God Nodes',
      '1. DevTools Network Dispatch Architecture',
      '## Surprising Connections',
      '- stale',
      '## Import Cycles',
      '- stale',
      '## Hyperedges',
      '- Mixed Documentation Group',
      '## Communities',
      '- Agent Workflow',
      '## Knowledge Gaps',
      '- docs/domain-services.md',
      '## Suggested Questions',
      '- stale',
    ].join('\n'),
  );

  const result = spawnSync(
    process.execPath,
    [scriptPath, '--graph', graphPath, '--report', reportPath],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  const report = await readFile(reportPath, 'utf8');
  assert.match(report, /^# Runtime Architecture Graph Report/m);
  assert.match(report, /2 code nodes · 1 relationship · 2 source files/);
  assert.match(report, /`handleRequest\(\)` - 1 edge/);
  assert.match(report, /`dispatchService\(\)` - 1 edge/);
  assert.doesNotMatch(
    report,
    /DevTools Network Dispatch Architecture|Agent Workflow|Mixed Documentation Group|Logo Asset/,
  );
  assert.deepEqual(JSON.parse(await readFile(graphPath, 'utf8')), graph);
});

test('limits surprising connections to the extension source tree', async () => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), 'graphify-surprises-'));
  const graphPath = path.join(fixtureDir, 'graph.json');
  const reportPath = path.join(fixtureDir, 'GRAPH_REPORT.md');

  await writeFile(
    graphPath,
    JSON.stringify({
      nodes: [
        {
          id: 'reader',
          label: 'readState()',
          source_file: 'src/js/reader.js',
          community: 1,
          community_name: 'State Readers',
        },
        {
          id: 'writer',
          label: 'writeState()',
          source_file: 'src/js/writer.js',
          community: 2,
          community_name: 'State Writers',
        },
        {
          id: 'documentation',
          label: 'Documentation Catalog',
          source_file: 'docs/catalog.md',
          community: 3,
          community_name: 'Documentation',
        },
        {
          id: 'logo',
          label: 'Logo',
          source_file: 'src/images/logo.png',
          community: 4,
          community_name: 'Images',
        },
        {
          id: 'agent-rule',
          label: 'Agent Workflow',
          source_file: '.agents/rules/workflow.md',
          community: 5,
          community_name: 'Agent Configuration',
        },
        {
          id: 'package-scripts',
          label: 'scripts',
          source_file: 'package.json',
          community: 6,
          community_name: 'Package Configuration',
        },
      ],
      links: [
        {
          source: 'reader',
          target: 'writer',
          relation: 'calls',
          confidence: 'EXTRACTED',
        },
        {
          source: 'reader',
          target: 'documentation',
          relation: 'conceptually_related_to',
          confidence: 'INFERRED',
        },
        {
          source: 'writer',
          target: 'logo',
          relation: 'references',
          confidence: 'EXTRACTED',
        },
        {
          source: 'reader',
          target: 'agent-rule',
          relation: 'documented_by',
          confidence: 'INFERRED',
        },
        {
          source: 'writer',
          target: 'package-scripts',
          relation: 'built_by',
          confidence: 'INFERRED',
        },
      ],
    }),
  );
  await writeFile(
    reportPath,
    [
      '# Graph report',
      '',
      '## Surprising Connections (you probably did not know these)',
      '- stale documentation result',
      '',
      '## Import Cycles',
      '- existing cycle',
      '',
    ].join('\n'),
  );

  const result = spawnSync(
    process.execPath,
    [scriptPath, '--graph', graphPath, '--report', reportPath],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  const report = await readFile(reportPath, 'utf8');
  assert.match(report, /`readState\(\)` --calls--> `writeState\(\)`/);
  assert.doesNotMatch(
    report,
    /Documentation Catalog|Agent Workflow|package.json|`scripts`|Logo|stale documentation result/,
  );
  assert.match(report, /## Surprising Connections \(`src\/` only\)/);
  assert.match(report, /## Import Cycles \(`src\/` code only\)/);
  assert.doesNotMatch(report, /existing cycle/);
});

test('limits suggested questions to source-tree nodes', async () => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), 'graphify-questions-'));
  const graphPath = path.join(fixtureDir, 'graph.json');
  const reportPath = path.join(fixtureDir, 'GRAPH_REPORT.md');

  await writeFile(
    graphPath,
    JSON.stringify({
      nodes: [
        { id: 'request', label: 'handleRequest()', source_file: 'src/js/request.js' },
        { id: 'dispatch', label: 'dispatchService()', source_file: 'src/js/dispatch.js' },
        { id: 'agent', label: 'Agent Workflow', source_file: '.agents/rules/workflow.md' },
        { id: 'docs', label: 'Architecture Guide', source_file: 'docs/architecture.md' },
        { id: 'scripts', label: 'scripts', source_file: 'package.json' },
      ],
      links: [
        {
          source: 'request',
          target: 'dispatch',
          relation: 'calls',
          confidence: 'INFERRED',
        },
      ],
    }),
  );
  await writeFile(
    reportPath,
    [
      '## Surprising Connections',
      '- stale',
      '',
      '## Suggested Questions',
      '- **Why does `scripts` connect to `package.json`?**',
      '  _Root configuration._',
      '- **What connects `Agent Workflow` to the application?**',
      '  _Agent configuration._',
      '- **Does the `Architecture Guide` match the implementation?**',
      '  _Documentation._',
      '- **How does `handleRequest()` coordinate with `dispatchService()`?**',
      '  _Source behavior._',
      '',
      '## End',
      '',
    ].join('\n'),
  );

  const result = spawnSync(
    process.execPath,
    [scriptPath, '--graph', graphPath, '--report', reportPath],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  const report = await readFile(reportPath, 'utf8');
  assert.match(report, /## Suggested Questions \(`src\/` only\)/);
  assert.match(report, /`handleRequest\(\)`.*`dispatchService\(\)`/);
  assert.doesNotMatch(report, /Agent Workflow|Architecture Guide|`scripts`|package\.json/);
  assert.doesNotMatch(report, /## End/);
});

test('keeps same-community cross-file relationships allowed by Graphify', async () => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), 'graphify-surprises-'));
  const graphPath = path.join(fixtureDir, 'graph.json');
  const reportPath = path.join(fixtureDir, 'GRAPH_REPORT.md');
  await writeFile(
    graphPath,
    JSON.stringify({
      nodes: [
        {
          id: 'request',
          label: 'handleRequest()',
          source_file: 'src/js/request.js',
          community: 1,
          community_name: 'Request Handling',
        },
        {
          id: 'dispatch',
          label: 'dispatchService()',
          source_file: 'src/js/dispatch.js',
          community: 1,
          community_name: 'Request Handling',
        },
      ],
      links: [
        {
          source: 'request',
          target: 'dispatch',
          relation: 'calls',
          confidence: 'INFERRED',
        },
      ],
    }),
  );
  await writeFile(reportPath, '## Surprising Connections\n- stale\n\n## Import Cycles\n- none\n');

  const result = spawnSync(
    process.execPath,
    [scriptPath, '--graph', graphPath, '--report', reportPath],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  const report = await readFile(reportPath, 'utf8');
  assert.match(report, /`handleRequest\(\)` --calls--> `dispatchService\(\)`/);
});

test('preserves Graphify edge order when surprise scores tie', async () => {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), 'graphify-surprises-'));
  const graphPath = path.join(fixtureDir, 'graph.json');
  const reportPath = path.join(fixtureDir, 'GRAPH_REPORT.md');

  await writeFile(
    graphPath,
    JSON.stringify({
      nodes: [
        { id: 'z-source', label: 'zSource()', source_file: 'src/z.js', community: 1 },
        { id: 'z-target', label: 'zTarget()', source_file: 'src/z-target.js', community: 2 },
        { id: 'a-source', label: 'aSource()', source_file: 'src/a.js', community: 1 },
        { id: 'a-target', label: 'aTarget()', source_file: 'src/a-target.js', community: 2 },
      ],
      links: [
        {
          source: 'z-source',
          target: 'z-target',
          relation: 'calls',
          confidence: 'EXTRACTED',
        },
        {
          source: 'a-source',
          target: 'a-target',
          relation: 'calls',
          confidence: 'EXTRACTED',
        },
      ],
    }),
  );
  await writeFile(reportPath, '## Surprising Connections\n- stale\n\n## Import Cycles\n- none\n');

  const result = spawnSync(
    process.execPath,
    [scriptPath, '--graph', graphPath, '--report', reportPath],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  const report = await readFile(reportPath, 'utf8');
  const surprisingSection = report.slice(
    report.indexOf('## Surprising Connections'),
    report.indexOf('## Import Cycles'),
  );
  assert.ok(surprisingSection.indexOf('`zSource()`') < surprisingSection.indexOf('`aSource()`'));
});
