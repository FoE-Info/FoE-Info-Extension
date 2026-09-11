import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test, { after } from 'node:test';

const SCRIPT_PATH = resolve('.agents/scripts/llama-swap-lifecycle.sh');
const SHIM_PATH = resolve('.agents/scripts/run-with-llama-swap.sh');

// Exercise the real shell lifecycle without contacting or unloading a real server.
const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'foe-llama-test-'));
const curlLog = resolve(fixtureRoot, 'curl.log');
writeFileSync(
  resolve(fixtureRoot, 'curl'),
  '#!/bin/sh\nprintf "%s\\n" "$*" >> "$FOE_TEST_CURL_LOG"\nexit 0\n',
  { mode: 0o700 },
);
const testEnv = {
  ...process.env,
  PATH: `${fixtureRoot}:${process.env.PATH}`,
  FOE_TEST_CURL_LOG: curlLog,
};
after(() => rmSync(fixtureRoot, { recursive: true, force: true }));

test('Ephemeral Llama-Swap Runner - script exists and is executable', () => {
  assert.ok(existsSync(SCRIPT_PATH), 'llama-swap-lifecycle.sh should exist');
  assert.ok(existsSync(SHIM_PATH), 'run-with-llama-swap.sh shim should exist');
});

test('Ephemeral Llama-Swap Runner - backwards-compatible shim delegates successfully', () => {
  const result = spawnSync(SHIM_PATH, ['echo', 'TEST_SHIM_OK'], {
    encoding: 'utf-8',
    env: testEnv,
  });
  assert.equal(
    result.status,
    0,
    `Shim should exit 0. Stderr: ${result.stderr}`,
  );
  assert.match(result.stdout, /TEST_SHIM_OK/);
  assert.match(result.stdout, /Cleaning up LLM resources/);
});

test('Ephemeral Llama-Swap Runner - executes command and cleans up on success', () => {
  const result = spawnSync(SCRIPT_PATH, ['echo', 'TEST_LIFECYCLE_OK'], {
    encoding: 'utf-8',
    env: testEnv,
  });

  assert.equal(
    result.status,
    0,
    `Script should exit with 0. Stderr: ${result.stderr}`,
  );
  assert.match(
    result.stdout,
    /TEST_LIFECYCLE_OK/,
    'Should output command stdout',
  );
  assert.match(
    result.stdout,
    /Cleaning up LLM resources/,
    'Should trigger cleanup hook',
  );
});

test('Ephemeral Llama-Swap Runner - propagates non-zero exit code and still cleans up', () => {
  const result = spawnSync(SCRIPT_PATH, ['bash', '-c', 'exit 42'], {
    encoding: 'utf-8',
    env: testEnv,
  });

  assert.equal(
    result.status,
    42,
    'Script should propagate child exit code correctly',
  );
  assert.match(
    result.stdout,
    /Cleaning up LLM resources/,
    'Should trigger cleanup hook even on error',
  );
});

test('Ephemeral Llama-Swap Runner - supports sourcing, exports env vars, and cleans up on shell exit', () => {
  const cmd = `source "${SCRIPT_PATH}"
echo "EXPORTED_BASE_URL=$OPENAI_BASE_URL"
echo "EXPORTED_BACKEND=$GRAPHIFY_BACKEND"
`;
  const result = spawnSync('bash', ['-c', cmd], {
    encoding: 'utf-8',
    env: testEnv,
  });

  assert.equal(
    result.status,
    0,
    `Shell should exit 0. Stderr: ${result.stderr}`,
  );
  assert.match(
    result.stdout,
    /EXPORTED_BASE_URL=http:\/\/127\.0\.0\.1:8081\/v1/,
    'Should export OPENAI_BASE_URL',
  );
  assert.match(
    result.stdout,
    /EXPORTED_BACKEND=openai/,
    'Should export GRAPHIFY_BACKEND',
  );
  assert.match(
    result.stdout,
    /Cleaning up LLM resources/,
    'Should trigger cleanup on shell exit',
  );
});

test('Ephemeral Llama-Swap Runner - stop_llama_swap unloads early without duplicate teardown on exit', () => {
  const cmd = `source "${SCRIPT_PATH}"
echo "AI_TASK_DONE"
stop_llama_swap
echo "NON_AI_EXPORT_DONE"
`;
  const result = spawnSync('bash', ['-c', cmd], {
    encoding: 'utf-8',
    env: testEnv,
  });

  assert.equal(
    result.status,
    0,
    `Shell should exit 0. Stderr: ${result.stderr}`,
  );
  assert.match(result.stdout, /AI_TASK_DONE/);
  assert.match(result.stdout, /NON_AI_EXPORT_DONE/);
  const cleanupOccurrences = (
    result.stdout.match(/Cleaning up LLM resources/g) || []
  ).length;
  assert.equal(
    cleanupOccurrences,
    1,
    'Cleanup should occur exactly once during stop_llama_swap call',
  );
});

test('lifecycle tests route all server probes and cleanup to the fixture', () => {
  const result = spawnSync(SCRIPT_PATH, ['echo', 'ISOLATED'], {
    encoding: 'utf-8',
    env: testEnv,
  });
  assert.equal(result.status, 0, result.stderr);
  const calls = readFileSync(curlLog, 'utf8');
  assert.match(calls, /127\.0\.0\.1:8081\/v1\/models/);
  assert.match(calls, /POST http:\/\/127\.0\.0\.1:8081\/api\/models\/unload/);
});
