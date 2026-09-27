import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  analyzeContract,
  collectRegisteredKeys,
} from '../../scripts/rpc-contract.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CAPTURED_PATH = path.join(ROOT, 'tests/fixtures/rpc/captured-rpcs.json');
const CONFIG_PATH = path.join(ROOT, 'scripts/rpc-contract.config.json');

function loadCaptured() {
  return JSON.parse(fs.readFileSync(CAPTURED_PATH, 'utf8'));
}

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

test('analyzeContract reports unhandled captured RPCs', () => {
  const result = analyzeContract({
    captured: ['A.foo', 'B.bar'],
    registered: { 'A.foo': 1 },
  });
  assert.deepEqual(result.unhandled, ['B.bar']);
  assert.deepEqual(result.stale, []);
});

test('analyzeContract honors ignoredCaptures (class or exact key)', () => {
  const byClass = analyzeContract({
    captured: ['CashShopService.getPrices', 'GuildRaidsService.getState'],
    registered: {},
    config: { ignoredCaptures: ['CashShopService'] },
  });
  assert.deepEqual(byClass.ignored, ['CashShopService.getPrices']);
  assert.deepEqual(byClass.unhandled, ['GuildRaidsService.getState']);

  const byKey = analyzeContract({
    captured: ['A.foo', 'A.bar'],
    registered: {},
    config: { ignoredCaptures: ['A.bar'] },
  });
  assert.deepEqual(byKey.unhandled, ['A.foo']);
});

test('analyzeContract honors deferred and neverHandle for triaged captures', () => {
  const result = analyzeContract({
    captured: ['A.missing', 'B.missing', 'C.action'],
    registered: {},
    config: { deferred: ['A.missing'], neverHandle: ['C.action'] },
  });
  // Both are tolerated as unhandled, but they are reported separately so a
  // backlog entry and a passive-observation breach never look alike.
  assert.deepEqual(result.allowed, ['A.missing', 'C.action']);
  assert.deepEqual(result.unhandled, ['B.missing']);
  assert.deepEqual(result.neverHandleViolations, []);
});

test('analyzeContract flags a registered neverHandle RPC as a breach', () => {
  const result = analyzeContract({
    captured: ['C.action'],
    registered: { 'C.action': 1 },
    config: { neverHandle: ['C.action'] },
  });
  // The registration must be deleted, not tolerated: the extension would be
  // acting on the player's behalf.
  assert.deepEqual(result.neverHandleViolations, ['C.action']);
  assert.deepEqual(result.unhandled, []);
  // A deferred read may legitimately be registered later.
  const ok = analyzeContract({
    captured: ['A.read'],
    registered: { 'A.read': 1 },
    config: { deferred: ['A.read'] },
  });
  assert.deepEqual(ok.neverHandleViolations, []);
});

test('analyzeContract reports registered-but-uncaptured routes as stale', () => {
  const result = analyzeContract({
    captured: ['A.foo'],
    registered: { 'A.foo': 1, 'B.legacy': 1 },
  });
  assert.deepEqual(result.stale, ['B.legacy']);
});

test('analyzeContract flags duplicates absent from knownDuplicates', () => {
  const result = analyzeContract({
    captured: ['A.foo', 'A.bar'],
    registered: new Map([
      ['A.foo', 2],
      ['A.bar', 1],
    ]),
  });
  assert.deepEqual(result.duplicates, [{ key: 'A.foo', count: 2 }]);

  const allowed = analyzeContract({
    captured: ['A.foo'],
    registered: new Map([['A.foo', 2]]),
    config: { knownDuplicates: ['A.foo'] },
  });
  assert.deepEqual(allowed.duplicates, []);
});

test('captured-rpcs fixture holds the full unique captured universe', () => {
  const captured = loadCaptured();
  assert.equal(captured.length, 103);

  const keys = captured.map((entry) => entry.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const entry of captured) {
    assert.equal(typeof entry.key, 'string');
    assert.ok(entry.occurrences >= 1);
  }
});

test('collectRegisteredKeys returns the live registered route set', () => {
  const registered = collectRegisteredKeys();
  assert.ok(registered instanceof Map);
  assert.ok(registered.size >= 50);
  assert.ok(registered.has('GuildBattlegroundService.getBattleground'));
  assert.ok(registered.has('GuildRaidsService.getState'));
});

test('shipped config leaves zero duplicate or untriaged unhandled RPCs', () => {
  const captured = loadCaptured();
  const config = loadConfig();
  const registered = collectRegisteredKeys();
  const result = analyzeContract({ captured, registered, config });

  assert.equal(result.capturedCount, 103);
  assert.equal(result.registeredCount, registered.size);
  assert.deepEqual(result.duplicates, [], 'no duplicate RPC registrations');
  assert.deepEqual(result.unhandled, [], 'no untriaged unhandled RPCs');
});
