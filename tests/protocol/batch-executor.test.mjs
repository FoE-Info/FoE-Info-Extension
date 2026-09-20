import assert from 'node:assert/strict';
import test from 'node:test';
import { executeBatchDispatch } from '../../src/js/protocol/batchExecutor.js';

test('executeBatchDispatch handles empty input and single requests', async () => {
  const emptyRes = await executeBatchDispatch(null);
  assert.deepEqual(emptyRes, {
    total: 0,
    succeeded: 0,
    failed: 0,
    results: [],
  });

  const singleRes = await executeBatchDispatch(
    { id: 1 },
    {},
    {
      dispatchSingle: async (msg) => ({ handled: msg.id }),
    },
  );
  assert.equal(singleRes.total, 1);
  assert.equal(singleRes.succeeded, 1);
  assert.equal(singleRes.failed, 0);
  assert.deepEqual(singleRes.results[0].result, { handled: 1 });
});

test('executeBatchDispatch error isolation, yielding, and errorHandler callback', async () => {
  const messages = Array.from({ length: 15 }, (_, i) => ({ id: i }));
  let yieldCount = 0;
  const caughtErrors = [];

  const batchRes = await executeBatchDispatch(
    messages,
    { contextKey: 'val' },
    {
      dispatchSingle: async (msg) => {
        if (msg.id === 5) {
          throw new Error('Explosion at 5');
        }
        return { ok: true };
      },
      yieldInterval: 5,
      yieldFn: async () => {
        yieldCount++;
      },
      errorHandler: (err, msg) => {
        caughtErrors.push({ err: err.message, id: msg.id });
      },
    },
  );

  assert.equal(batchRes.total, 15);
  assert.equal(batchRes.succeeded, 14);
  assert.equal(batchRes.failed, 1);
  assert.equal(yieldCount, 2, 'yielded at index 5 and index 10');
  assert.equal(caughtErrors.length, 1);
  assert.equal(caughtErrors[0].id, 5);
});
