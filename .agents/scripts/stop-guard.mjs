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

  // When the model stops naturally, allow stop to enable Antigravity's
  // reactive wakeup mechanism when background tasks complete.
  if (fullyIdle === false && terminationReason === 'model_stop') {
    if (process.env.DEBUG_HOOKS) {
      process.stderr.write(
        '[stop-guard] Background tasks active; permitting stop for reactive wakeup.\n',
      );
    }
    return { decision: 'allow' };
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
