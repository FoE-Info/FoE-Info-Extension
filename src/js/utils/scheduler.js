/**
 * scheduler.js
 *
 * Main-thread yielding and background task deferral helpers.
 * Feature-detects the Scheduler API (`scheduler.yield` / `scheduler.postTask`)
 * and degrades gracefully to `setTimeout(0)` / `requestIdleCallback` on engines
 * without support. Dual CJS/ESM compatible.
 */

let logger = null;
try {
  const { createLogger } = require('./logger.js');
  logger = createLogger('Scheduler');
} catch {
  logger = null;
}

function getSchedulerApi() {
  if (typeof globalThis !== 'undefined' && globalThis.scheduler) {
    return globalThis.scheduler;
  }
  return null;
}

/**
 * Yields control back to the main thread so pending input/render work can run
 * before the caller resumes. Uses `scheduler.yield()` when available.
 *
 * @returns {Promise<void>} Resolves once the main thread has had a chance to
 *   run other work.
 */
async function yieldToMain() {
  const schedulerApi = getSchedulerApi();
  if (schedulerApi && typeof schedulerApi.yield === 'function') {
    logger?.debug('Yielding to main thread via scheduler.yield');
    await schedulerApi.yield();
    return;
  }
  logger?.debug('Yielding to main thread via setTimeout fallback');
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Defers non-critical work to a background/idle task. Uses
 * `scheduler.postTask({ priority: 'background' })` when available, then
 * `requestIdleCallback`, then `setTimeout(0)`.
 *
 * @param {Function} fn - Callback to run off the current task.
 * @returns {*} Scheduler handle when one is available, otherwise null.
 */
function postBackgroundTask(fn) {
  if (typeof fn !== 'function') return null;

  const schedulerApi = getSchedulerApi();
  if (schedulerApi && typeof schedulerApi.postTask === 'function') {
    logger?.debug('Deferring background task via scheduler.postTask');
    try {
      return schedulerApi.postTask(fn, { priority: 'background' });
    } catch {
      // Fall through to legacy strategies when postTask rejects the options.
    }
  }

  if (typeof requestIdleCallback === 'function') {
    logger?.debug('Deferring background task via requestIdleCallback');
    return requestIdleCallback(() => fn());
  }

  logger?.debug('Deferring background task via setTimeout fallback');
  return setTimeout(fn, 0);
}

module.exports = { yieldToMain, postBackgroundTask };
module.exports.default = module.exports;
