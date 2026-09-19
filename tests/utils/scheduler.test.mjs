import assert from 'node:assert/strict';
import test from 'node:test';
import schedulerPkg from '../../src/js/utils/scheduler.js';

const { yieldToMain, postBackgroundTask } = schedulerPkg;

test('scheduler - yieldToMain and postBackgroundTask', async (t) => {
  await t.test('yieldToMain uses scheduler.yield when available', async () => {
    let yieldCalled = 0;
    const originalScheduler = globalThis.scheduler;
    globalThis.scheduler = {
      yield: async () => {
        yieldCalled++;
      },
    };

    try {
      await yieldToMain();
      assert.equal(yieldCalled, 1);
    } finally {
      globalThis.scheduler = originalScheduler;
    }
  });

  await t.test(
    'yieldToMain falls back to setTimeout when scheduler.yield throws',
    async () => {
      const originalScheduler = globalThis.scheduler;
      globalThis.scheduler = {
        yield: async () => {
          throw new Error('scheduler aborted');
        },
      };

      try {
        await assert.doesNotReject(async () => {
          await yieldToMain();
        });
      } finally {
        globalThis.scheduler = originalScheduler;
      }
    },
  );

  await t.test('yieldToMain works without globalThis.scheduler', async () => {
    const originalScheduler = globalThis.scheduler;
    delete globalThis.scheduler;

    try {
      const start = Date.now();
      await yieldToMain();
      assert.ok(Date.now() - start >= 0);
    } finally {
      globalThis.scheduler = originalScheduler;
    }
  });

  await t.test(
    'postBackgroundTask invokes scheduler.postTask when available',
    async () => {
      let postTaskCalls = 0;
      let priorityUsed = null;
      const originalScheduler = globalThis.scheduler;
      globalThis.scheduler = {
        postTask: (fn, opts) => {
          postTaskCalls++;
          priorityUsed = opts?.priority;
          return fn();
        },
      };

      try {
        let executed = false;
        postBackgroundTask(() => {
          executed = true;
        });
        assert.equal(postTaskCalls, 1);
        assert.equal(priorityUsed, 'background');
        assert.equal(executed, true);
      } finally {
        globalThis.scheduler = originalScheduler;
      }
    },
  );

  await t.test(
    'postBackgroundTask falls back to requestIdleCallback or setTimeout',
    async () => {
      const originalScheduler = globalThis.scheduler;
      delete globalThis.scheduler;

      try {
        let executed = false;
        const handle = postBackgroundTask(() => {
          executed = true;
        });
        assert.ok(handle !== null);
        await new Promise((resolve) => setTimeout(resolve, 10));
        assert.equal(executed, true);
      } finally {
        globalThis.scheduler = originalScheduler;
      }
    },
  );

  await t.test('postBackgroundTask returns null for non-function', () => {
    assert.equal(postBackgroundTask(null), null);
    assert.equal(postBackgroundTask(undefined), null);
  });
});
