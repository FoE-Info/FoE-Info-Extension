import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GRAPHIFY_QUERY_TOOLS,
  isBroadSourceSearchTool,
} from '../../.opencode/plugins/graphify-guard.mjs';
import { SafetyGate } from '../../.opencode/plugins/safety-gate.mjs';
import { StopGuard } from '../../.opencode/plugins/stop-guard.mjs';
import {
  pendingSyncDetails,
  pendingSyncs,
  trackSync,
  untrackSync,
} from '../../.opencode/plugins/sync-state.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('sync-state tracks key, handle, and elapsed time', async () => {
  trackSync('src/js/foo.js', { fakeHandle: true });
  await sleep(5);
  assert.deepEqual(pendingSyncs(), ['src/js/foo.js']);
  const details = pendingSyncDetails();
  assert.equal(details.length, 1);
  assert.equal(details[0].key, 'src/js/foo.js');
  assert.ok(details[0].elapsedMs >= 0);
  untrackSync('src/js/foo.js');
  assert.deepEqual(pendingSyncs(), []);
});

test('stop-guard logs warning on session.status idle while sync pending', async () => {
  const logs = [];
  const hooks = await StopGuard({
    client: {
      app: {
        log: async ({ body }) => logs.push(body),
      },
    },
  });
  trackSync('src/js/bar.js');
  await hooks.event({
    event: {
      type: 'session.status',
      data: { sessionID: 's1', status: { type: 'idle' } },
    },
  });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].service, 'stop-guard');
  assert.equal(logs[0].level, 'warn');
  assert.match(logs[0].message, /src\/js\/bar\.js/);
  assert.match(logs[0].message, /still running/);
  untrackSync('src/js/bar.js');

  await hooks.event({
    event: {
      type: 'session.status',
      data: { sessionID: 's1', status: { type: 'idle' } },
    },
  });
  assert.equal(logs.length, 1);
});

test('stop-guard does not warn on busy status even with pending syncs', async () => {
  const logs = [];
  const hooks = await StopGuard({
    client: { app: { log: async ({ body }) => logs.push(body) } },
  });
  trackSync('src/js/baz.js');
  await hooks.event({
    event: {
      type: 'session.status',
      data: { sessionID: 's1', status: { type: 'busy' } },
    },
  });
  assert.equal(logs.length, 0);
  untrackSync('src/js/baz.js');
});

test('safety-gate throws on destructive command and allows others', async () => {
  const hooks = await SafetyGate({ project: {} });
  await assert.rejects(
    hooks['tool.execute.before'](
      { tool: 'bash' },
      { args: { command: 'git push --force origin main' } },
    ),
    /safety-gate/,
  );
  await assert.doesNotReject(
    hooks['tool.execute.before'](
      { tool: 'bash' },
      { args: { command: 'npm test' } },
    ),
  );
  await assert.doesNotReject(
    hooks['tool.execute.before']({ tool: 'edit' }, { args: {} }),
  );
});

test('graphify-guard regex matches opencode MCP tool IDs (hyphenated)', () => {
  assert.ok(GRAPHIFY_QUERY_TOOLS.test('graphify-foe-info_query_graph'));
  assert.ok(GRAPHIFY_QUERY_TOOLS.test('graphify-foe-info-original_get_node'));
  assert.ok(GRAPHIFY_QUERY_TOOLS.test('graphify-forge-hammer_god_nodes'));
  assert.ok(GRAPHIFY_QUERY_TOOLS.test('graphify-metadata-store_graph_stats'));
  assert.ok(!GRAPHIFY_QUERY_TOOLS.test('graphify-foe-info_bad_tool'));
  assert.ok(!GRAPHIFY_QUERY_TOOLS.test('graphify_foe_info_query_graph'));
});

test('graphify-guard flags broad grep/glob and allows scoped ones', () => {
  assert.equal(isBroadSourceSearchTool('grep', { path: 'src' }), true);
  assert.equal(isBroadSourceSearchTool('grep', { path: '.' }), true);
  assert.equal(isBroadSourceSearchTool('grep', { path: 'tests' }), false);
  assert.equal(
    isBroadSourceSearchTool('grep', { path: 'src/js/state.js' }),
    false,
  );
  assert.equal(isBroadSourceSearchTool('glob', { path: '' }), true);
  assert.equal(isBroadSourceSearchTool('glob', {}), true);
  assert.equal(isBroadSourceSearchTool('glob', { path: 'tests' }), false);
  assert.equal(isBroadSourceSearchTool('glob', { path: 'src' }), true);
  assert.equal(isBroadSourceSearchTool('bash', { command: 'npm test' }), false);
});
