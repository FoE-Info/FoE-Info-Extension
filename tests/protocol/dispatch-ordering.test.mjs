import assert from 'node:assert/strict';
import test from 'node:test';
import pkg from '../../src/js/protocol/networkListener.js';
import intakePolicy from '../../src/js/utils/intakePolicy.js';

const {
  processContentDirect,
  stampNextDispatchToken,
  syncDispatchGeneration,
  resetDispatchOrdering,
} = pkg;

// The generation counter lives in the intake leaf, not the listener.
const { currentDispatchGeneration } = intakePolicy;

/**
 * §4: cross-batch dispatch ordering.
 *
 * A body at or above the dispatcher's yieldParseThresholdBytes yields the
 * event loop before parsing, so without admission-ordered chaining a later
 * small packet commits first and overwrites state the earlier packet carried.
 *
 * These cases assert the ORDER in which `dispatchRaw` is invoked and the order
 * in which it resolves, which is the property that actually matters: what the
 * services do inside `dispatchRaw` is their business, not the listener's.
 */

/** Resolves after `ms`, letting the macrotask queue drain. */
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

test('dispatch ordering', async (t) => {
  t.afterEach(() => resetDispatchOrdering());

  await t.test(
    'a slow earlier dispatch is not overtaken by a later fast one',
    async () => {
      const commitOrder = [];

      // Stands in for a body over the yield threshold: it yields the event
      // loop before it resolves, exactly as rawDispatchPipeline does.
      const slowDispatcher = {
        dispatchRaw: async (url) => {
          await tick(30);
          commitOrder.push(url);
          return { batchResult: { results: [] } };
        },
      };
      const fastDispatcher = {
        dispatchRaw: async (url) => {
          commitOrder.push(url);
          return { batchResult: { results: [] } };
        },
      };

      // Admit the slow packet first, then the fast one, without awaiting.
      const slow = processContentDirect(
        'https://us12.forgeofempires.com/game/json?id=slow',
        '[{"__class__":"ServerRequest"}]',
        '',
        [],
        null,
        { messageDispatcher: slowDispatcher },
        stampNextDispatchToken(currentDispatchGeneration()),
      );
      const fast = processContentDirect(
        'https://us12.forgeofempires.com/game/json?id=fast',
        '[{"__class__":"ServerRequest"}]',
        '',
        [],
        null,
        { messageDispatcher: fastDispatcher },
        stampNextDispatchToken(currentDispatchGeneration()),
      );

      await Promise.all([slow, fast]);

      assert.deepEqual(
        commitOrder.map((u) => new URL(u).searchParams.get('id')),
        ['slow', 'fast'],
        'an earlier admitted dispatch must not be overtaken by a later one',
      );
    },
  );

  await t.test('a chain continues after a failing dispatch', async () => {
    const seen = [];
    const dispatcher = {
      dispatchRaw: async (url) => {
        if (url.includes('boom')) throw new Error('dispatch failed');
        seen.push(url);
        return { batchResult: { results: [] } };
      },
    };

    const boom = processContentDirect(
      'https://us12.forgeofempires.com/game/json?boom=1',
      'body',
      '',
      [],
      null,
      { messageDispatcher: dispatcher },
      stampNextDispatchToken(currentDispatchGeneration()),
    );
    const after = processContentDirect(
      'https://us12.forgeofempires.com/game/json?after=1',
      'body',
      '',
      [],
      null,
      { messageDispatcher: dispatcher },
      stampNextDispatchToken(currentDispatchGeneration()),
    );

    // The failure is reported, not swallowed into the chain, and it does not
    // poison the dispatch behind it.
    await boom;
    await after;
    assert.deepEqual(seen, [
      'https://us12.forgeofempires.com/game/json?after=1',
    ]);
  });

  await t.test(
    'a dispatch queued before a world switch is dropped at execution',
    async () => {
      const seen = [];
      const dispatcher = {
        dispatchRaw: async (url) => {
          seen.push(url);
          return { batchResult: { results: [] } };
        },
      };
      const blocker = {
        dispatchRaw: async () => {
          await tick(20);
          return { batchResult: { results: [] } };
        },
      };

      // Occupy the chain so the second dispatch is still queued when the
      // world switches underneath it.
      const occupying = processContentDirect(
        'https://us12.forgeofempires.com/game/json?occupy=1',
        'body',
        '',
        [],
        null,
        { messageDispatcher: blocker },
        stampNextDispatchToken(currentDispatchGeneration()),
      );
      const queued = processContentDirect(
        'https://us12.forgeofempires.com/game/json?queued=1',
        'body',
        '',
        [],
        null,
        { messageDispatcher: dispatcher },
        stampNextDispatchToken(currentDispatchGeneration()),
      );

      syncDispatchGeneration('de123');

      const result = await queued;
      await occupying;

      assert.deepEqual(
        seen,
        [],
        'a stale dispatch must not reach the dispatcher',
      );
      assert.equal(result?.dropped, true);
      assert.equal(result?.stale, true);
    },
  );

  await t.test(
    'dispatchRaw still receives the same five arguments',
    async () => {
      let captured = null;
      const dispatcher = {
        dispatchRaw: async (...args) => {
          captured = args;
          return { batchResult: { results: [] } };
        },
      };

      await processContentDirect(
        'https://us12.forgeofempires.com/game/json',
        'the-body',
        'gzip',
        [{ name: 'x', value: 'y' }],
        { id: 'req-1' },
        { messageDispatcher: dispatcher },
        stampNextDispatchToken(currentDispatchGeneration()),
      );

      assert.equal(
        captured.length,
        5,
        'the chain must not add or drop arguments',
      );
      assert.deepEqual(captured, [
        'https://us12.forgeofempires.com/game/json',
        'the-body',
        'gzip',
        [{ name: 'x', value: 'y' }],
        { id: 'req-1' },
      ]);
    },
  );
});
