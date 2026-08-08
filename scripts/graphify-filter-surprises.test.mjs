import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(projectRoot, 'scripts/graphify-filter-surprises.mjs');

test('excludes local docs without excluding other Graphify source types', async () => {
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
  assert.match(report, /`writeState\(\)` --references--> `Logo`/);
  assert.doesNotMatch(report, /Documentation Catalog|stale documentation result/);
  assert.match(report, /## Import Cycles\n- existing cycle/);
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
  assert.ok(report.indexOf('`zSource()`') < report.indexOf('`aSource()`'));
});
