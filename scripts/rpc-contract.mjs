#!/usr/bin/env node

/**
 * RPC Contract Auditor
 *
 * Compares the live captured RPC universe (tests/fixtures/rpc/captured-rpcs.json)
 * against the handlers actually registered by the extension at runtime.
 *
 * The registered set is collected exactly by driving the real registration
 * path (registerAllServices + registerLegacyBridge) against a fake dispatcher
 * and proxy handlers, so no source regex parsing is required.
 *
 * Usage:
 *   node scripts/rpc-contract.mjs          # Report mismatches (exit 0)
 *   node scripts/rpc-contract.mjs --check  # Report mismatches (exit 1 if any)
 *   node scripts/rpc-contract.mjs --json   # Emit machine-readable JSON
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CAPTURED_FILE = path.join(ROOT, 'tests/fixtures/rpc/captured-rpcs.json');
const CONFIG_FILE = path.join(__dirname, 'rpc-contract.config.json');

const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const shouldCheck = args.includes('--check');
const asJson = args.includes('--json');

function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Drive the real service + legacy-bridge registration against a fake
 * dispatcher to obtain the exact set of registered requestClass.requestMethod
 * keys, with the number of times each key was registered.
 *
 * @returns {Map<string, number>} key -> registration count
 */
export function collectRegisteredKeys() {
  const counts = new Map();
  const fakeDispatcher = {
    register(requestClass, requestMethod) {
      if (requestClass && requestMethod) {
        const key = `${requestClass}.${requestMethod}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      return fakeDispatcher;
    },
    registerFallback() {
      return fakeDispatcher;
    },
    registerGlobalFallback() {
      return fakeDispatcher;
    },
    registerDirectMetadata() {
      return fakeDispatcher;
    },
    setPriority() {
      return fakeDispatcher;
    },
  };
  const proxyHandlers = new Proxy(
    {},
    {
      get: () => () => {},
    },
  );

  const { registerAllServices } = require('../src/js/msg/registerServices.js');
  registerAllServices(fakeDispatcher);

  const {
    registerLegacyBridge,
  } = require('../src/js/protocol/legacyBridge.js');
  registerLegacyBridge(fakeDispatcher, proxyHandlers);

  return counts;
}

/**
 * Pure contract analysis.
 *
 * - `ignoredCaptures` removes captured keys/classes from scope entirely.
 * - `allowedUnhandled` records in-domain captured RPCs that are knowingly
 *   not handled yet.
 * - `knownDuplicates` records duplicate registrations that are intentionally
 *   kept. It should stay empty: every RPC key maps to exactly one handler.
 *
 * `stale` (registered but never captured) is informational and never gates.
 *
 * @param {object} input
 * @param {Array<string|{key:string}>} input.captured Captured RPC keys.
 * @param {Map<string,number>|object} input.registered Registered key counts.
 * @param {object} [input.config] Policy config.
 * @returns {{unhandled:string[],ignored:string[],allowed:string[],stale:string[],duplicates:Array<{key:string,count:number}>,capturedCount:number,registeredCount:number}}
 */
export function analyzeContract({
  captured = [],
  registered = {},
  config = {},
} = {}) {
  const ignoredCaptures = config.ignoredCaptures || [];
  const allowedUnhandled = new Set(config.allowedUnhandled || []);
  const knownDuplicates = new Set(config.knownDuplicates || []);

  const registeredEntries =
    registered instanceof Map ?
      [...registered.entries()]
    : Object.entries(registered);
  const registeredKeys = new Set(registeredEntries.map(([key]) => key));

  const capturedKeys = new Set(
    captured.map((entry) => (typeof entry === 'string' ? entry : entry.key)),
  );

  const isIgnored = (key) =>
    ignoredCaptures.some(
      (pattern) => key === pattern || key.startsWith(`${pattern}.`),
    );

  const ignored = [...capturedKeys].filter(isIgnored).sort();

  const allowed = [...capturedKeys]
    .filter((key) => !registeredKeys.has(key) && allowedUnhandled.has(key))
    .sort();

  const unhandled = [...capturedKeys]
    .filter(
      (key) =>
        !registeredKeys.has(key) &&
        !isIgnored(key) &&
        !allowedUnhandled.has(key),
    )
    .sort();

  const stale = [...registeredKeys]
    .filter((key) => !capturedKeys.has(key))
    .sort();

  const duplicates = registeredEntries
    .filter(([key, count]) => count > 1 && !knownDuplicates.has(key))
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    unhandled,
    ignored,
    allowed,
    stale,
    duplicates,
    capturedCount: capturedKeys.size,
    registeredCount: registeredKeys.size,
  };
}

function printReport(result) {
  console.log('RPC Contract Report');
  console.log('--------------------------------------------------');
  console.log(
    `Captured: ${result.capturedCount}   Registered: ${result.registeredCount}`,
  );
  console.log(`Unhandled captured RPCs   : ${result.unhandled.length}`);
  for (const key of result.unhandled) console.log(`  - ${key}`);
  console.log(`Allowed unhandled (triaged): ${result.allowed.length}`);
  for (const key of result.allowed) console.log(`  - ${key}`);
  console.log(`Ignored captures (out-of-scope): ${result.ignored.length}`);
  for (const key of result.ignored) console.log(`  - ${key}`);
  console.log(`Registered, never captured : ${result.stale.length}`);
  for (const key of result.stale) console.log(`  - ${key}`);
  console.log(`Duplicate registrations    : ${result.duplicates.length}`);
  for (const { key, count } of result.duplicates) {
    console.log(`  - ${key} x${count}`);
  }
  console.log('--------------------------------------------------');
}

function main() {
  const captured = loadJson(CAPTURED_FILE, []);
  const config = loadJson(CONFIG_FILE, {});
  const registered = collectRegisteredKeys();

  const result = analyzeContract({ captured, registered, config });

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printReport(result);
  }

  // Gate only on untriaged unhandled captures and un-allowlisted duplicates.
  // `stale` (registered but never captured) is reported for triage but does
  // not fail the check.
  const violations = result.unhandled.length + result.duplicates.length;
  if (shouldCheck && violations > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
