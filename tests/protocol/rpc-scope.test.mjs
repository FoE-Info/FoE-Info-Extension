import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

const scope = await import('../../src/js/protocol/rpcScope.js');
const {
  IGNORED_RPC_CLASSES,
  isIgnoredRpcClass,
  isIgnoredRpcLoggingEnabled,
  shouldLogUnhandledRpc,
  setIgnoredRpcLoggingEnabled,
  toggleIgnoredRpcLogging,
  _resetForTesting,
} = scope.default || scope;

test('classifies out-of-scope vs in-domain services', () => {
  assert.equal(isIgnoredRpcClass('CashShopService'), true);
  assert.equal(isIgnoredRpcClass('TrackingService'), true);
  assert.equal(isIgnoredRpcClass('TimerService'), false);
  assert.equal(isIgnoredRpcClass('GuildRaidsOutpostService'), false);
  assert.equal(isIgnoredRpcClass(undefined), false);
});

test('hides ignored unhandled RPCs but keeps in-domain ones', () => {
  _resetForTesting();
  assert.equal(shouldLogUnhandledRpc('CashShopService'), false);
  assert.equal(shouldLogUnhandledRpc('TimerService'), true);

  setIgnoredRpcLoggingEnabled(true, { persist: false });
  assert.equal(shouldLogUnhandledRpc('CashShopService'), true);
  assert.equal(isIgnoredRpcLoggingEnabled(), true);

  toggleIgnoredRpcLogging({ persist: false });
  assert.equal(isIgnoredRpcLoggingEnabled(), false);
  _resetForTesting();
});

test('runtime ignore set matches the contract ignoredCaptures policy', () => {
  const config = JSON.parse(
    readFileSync(path.join(root, 'scripts/rpc-contract.config.json'), 'utf8'),
  );
  const classOnly = (config.ignoredCaptures || []).filter(
    (entry) => !entry.includes('.'),
  );
  assert.deepEqual([...IGNORED_RPC_CLASSES].sort(), classOnly.sort());
});
