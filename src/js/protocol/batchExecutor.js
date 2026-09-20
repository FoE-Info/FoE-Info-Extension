/**
 * batchExecutor.js
 *
 * Executes priority-sorted batches of InnoGames RPC messages with cooperative
 * main-thread yielding, individual error isolation, and error handler notification.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('BatchExecutor');
} catch {}

/**
 * Execute a batch of messages with error isolation and cooperative yielding.
 *
 * @param {Array<Object>|Object} serverRequests
 * @param {Object} context
 * @param {Object} options
 * @param {Function} options.dispatchSingle
 * @param {Function} options.sortBatch
 * @param {number} [options.yieldInterval=10]
 * @param {Function} [options.yieldFn]
 * @param {Function} [options.errorHandler]
 * @returns {Promise<{ total: number, succeeded: number, failed: number, results: Array }>}
 */
async function executeBatchDispatch(
  serverRequests,
  context = {},
  options = {},
) {
  if (!serverRequests) {
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }

  const {
    dispatchSingle,
    sortBatch,
    yieldInterval = 10,
    yieldFn,
    errorHandler,
  } = options;

  const requests =
    Array.isArray(serverRequests) ? [...serverRequests] : [serverRequests];
  const sorted =
    typeof sortBatch === 'function' ? sortBatch(requests) : requests;
  const results = [];
  let succeeded = 0;
  let failed = 0;

  logger?.debug('Executing batch dispatch', { count: sorted.length });

  for (let i = 0; i < sorted.length; i++) {
    if (yieldInterval > 0 && i > 0 && i % yieldInterval === 0 && yieldFn) {
      await yieldFn();
    }
    const msg = sorted[i];
    try {
      const res = await dispatchSingle(msg, context);
      succeeded++;
      results.push({ success: true, message: msg, result: res });
    } catch (err) {
      failed++;
      results.push({ success: false, message: msg, error: err });
      if (typeof errorHandler === 'function') {
        try {
          errorHandler(err, msg, context);
        } catch (loggingErr) {
          console.error(
            '[MessageDispatcher] Error in errorHandler:',
            loggingErr,
          );
        }
      }
    }
  }

  return { total: sorted.length, succeeded, failed, results };
}

module.exports = {
  executeBatchDispatch,
};
