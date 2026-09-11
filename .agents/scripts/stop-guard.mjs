#!/usr/bin/env node

/**
 * Stop Hook
 * Prevents premature session termination if background tasks (CDP traces,
 * Graphify reindexing, builds) are still actively executing.
 */

import { fileURLToPath } from 'node:url';

export function evaluateStopDecision(payload) {
  if (!payload || typeof payload !== 'object') {
    return { decision: 'allow' };
  }

  const { fullyIdle, terminationReason, error } = payload;

  // If there's an error or maximum steps were exceeded, allow the stop
  if (error || terminationReason === 'max_steps_exceeded') {
    return { decision: 'allow' };
  }

  // If background tasks or processes are not fully idle when the model attempts to stop
  if (fullyIdle === false && terminationReason === 'model_stop') {
    return {
      decision: 'continue',
      reason:
        'Background tasks (e.g. build, tests, or Graphify reindexing) are still actively executing. Please wait for completion before exiting.',
    };
  }

  return { decision: 'allow' };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let input = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (chunk) => {
    input += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const payload = JSON.parse(input || '{}');
      const response = evaluateStopDecision(payload);
      process.stdout.write(JSON.stringify(response));
    } catch {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
    }
  });
}
