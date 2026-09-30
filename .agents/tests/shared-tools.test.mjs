import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

test('graph viewer resolves the host graph from its shared script location', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'shared-graph-viewer-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.agents/scripts'), { recursive: true });
  mkdirSync(join(root, 'graphify-out'));
  copyFileSync(
    new URL('../scripts/serve-graph.mjs', import.meta.url),
    join(root, '.agents/scripts/serve-graph.mjs'),
  );
  writeFileSync(
    join(root, 'graphify-out/graph.html'),
    '<p>host graph fixture</p>',
  );
  const env = { ...process.env };
  delete env.GRAPH_VIEW_ROOT;
  delete env.GRAPH_VIEW_PORT;
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { once } from 'node:events';
    import { createGraphServer } from './.agents/scripts/serve-graph.mjs';
    const server = createGraphServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const response = await fetch('http://127.0.0.1:' + server.address().port + '/');
      console.log(JSON.stringify({ status: response.status, body: await response.text() }));
    } finally { server.close(); }
  `,
    ],
    { cwd: root, env, encoding: 'utf8', timeout: 10_000 },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    status: 200,
    body: '<p>host graph fixture</p>',
  });
});

test('optional fork comparison fails when no downstream root is supplied', () => {
  const env = { ...process.env };
  delete env.LOW_TOOL_ROOT;
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('../scripts/fork-drift.mjs', import.meta.url))],
    { env, encoding: 'utf8', timeout: 10_000 },
  );
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Set LOW_TOOL_ROOT/);
  assert.equal(result.stdout, '');
});
