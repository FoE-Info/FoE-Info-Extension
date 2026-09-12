import assert from 'node:assert/strict';
import test from 'node:test';
import pkg from '../../src/js/protocol/MessageDispatcher.js';

const { MessageDispatcher } = pkg;

test('MessageDispatcher - Resilience & Fallback Semantics', async (t) => {
  await t.test(
    'getMessagePriority resolves defaults and builtin weights',
    () => {
      const dispatcher = new MessageDispatcher();
      assert.equal(dispatcher.getMessagePriority(null), 0);
      assert.equal(dispatcher.getMessagePriority('bad'), 0);
      assert.equal(dispatcher.getMessagePriority({}), 0);
      assert.equal(
        dispatcher.getMessagePriority({
          requestClass: 'StartupService',
          requestMethod: 'getData',
        }),
        0,
      );
      assert.equal(
        dispatcher.getMessagePriority({
          requestClass: 'StaticDataService',
          requestMethod: 'getMetadata',
        }),
        100,
      );
      assert.equal(
        dispatcher.getMessagePriority({
          requestClass: 'StaticDataService',
          requestMethod: 'getData',
        }),
        90,
      );
    },
  );

  await t.test('setPriority specific beats class beats builtin', () => {
    const dispatcher = new MessageDispatcher();
    const metadataMsg = {
      requestClass: 'StaticDataService',
      requestMethod: 'getMetadata',
    };
    const otherMsg = {
      requestClass: 'StaticDataService',
      requestMethod: 'getData',
    };
    dispatcher.setPriority('StaticDataService', null, 7);
    assert.equal(dispatcher.getMessagePriority(metadataMsg), 7);
    assert.equal(dispatcher.getMessagePriority(otherMsg), 7);
    dispatcher.setPriority('StaticDataService', 'getMetadata', 12);
    assert.equal(dispatcher.getMessagePriority(metadataMsg), 12);
    assert.equal(dispatcher.getMessagePriority(otherMsg), 7);
    assert.equal(
      dispatcher.getMessagePriority({
        requestClass: 'UnsetService',
        requestMethod: 'anything',
      }),
      0,
    );
  });

  await t.test('sortBatch orders descending and preserves stable ties', () => {
    const dispatcher = new MessageDispatcher();
    dispatcher.setPriority('LowService', 'work', 1);
    dispatcher.setPriority('HighService', 'work', 50);
    const lowA = { requestClass: 'LowService', requestMethod: 'work', id: 'a' };
    const lowB = { requestClass: 'LowService', requestMethod: 'work', id: 'b' };
    const high = {
      requestClass: 'HighService',
      requestMethod: 'work',
      id: 'h',
    };
    assert.deepEqual(
      dispatcher.sortBatch([lowA, high, lowB]).map((m) => m.id),
      ['h', 'a', 'b'],
    );
    assert.equal(dispatcher.sortBatch(null), null);
    const single = [lowA];
    assert.equal(dispatcher.sortBatch(single), single);
  });

  await t.test(
    'dispatchBatch executes registered handlers by priority',
    async () => {
      const dispatcher = new MessageDispatcher();
      const order = [];
      dispatcher.register('LowService', 'work', () => order.push('low'));
      dispatcher.register('HighService', 'work', () => order.push('high'));
      dispatcher.setPriority('LowService', 'work', 1);
      dispatcher.setPriority('HighService', 'work', 50);
      await dispatcher.dispatchBatch([
        { requestClass: 'LowService', requestMethod: 'work' },
        { requestClass: 'HighService', requestMethod: 'work' },
      ]);
      assert.deepEqual(order, ['high', 'low']);
    },
  );

  await t.test(
    'repeated identical requests dedupe then replay after window',
    () => {
      const dispatcher = new MessageDispatcher({ dedupWindowMs: 1000 });
      const url = 'https://en7.forgeofempires.com/game/json';
      const body =
        '[{"requestClass":"StartupService","requestMethod":"getData"}]';
      assert.equal(dispatcher.isDuplicate(url, body, 1000), false);
      assert.equal(dispatcher.isDuplicate(url, body, 1500), true);
      assert.equal(dispatcher.isDuplicate(url, body, 1999), true);
      assert.equal(dispatcher.isDuplicate(url, body, 2000), false);
      assert.equal(dispatcher.isDuplicate(url, body, 2400), true);
      assert.equal(dispatcher.isDuplicate(url, body, 3000), false);
    },
  );

  await t.test(
    'dedup distinguishes request payloads and ignores empty input',
    () => {
      const dispatcher = new MessageDispatcher({ dedupWindowMs: 1000 });
      const url = 'https://en7.forgeofempires.com/game/json';
      const body = '[{"requestClass":"ResourceService"}]';
      assert.equal(dispatcher.isDuplicate(url, body, null, 0), false);
      assert.equal(dispatcher.isDuplicate(url, body, { id: 1 }, 100), false);
      assert.equal(dispatcher.isDuplicate(url, body, { id: 1 }, 200), true);
      assert.equal(dispatcher.isDuplicate('', body, null, 300), false);
      assert.equal(dispatcher.isDuplicate(url, '', null, 300), false);
    },
  );

  await t.test('clearDedupCache admits the same payload again', async () => {
    const dispatcher = new MessageDispatcher({ dedupWindowMs: 60000 });
    let executions = 0;
    dispatcher.register('StartupService', 'getData', () => {
      executions++;
    });
    const url = 'https://en7.forgeofempires.com/game/json';
    const body = JSON.stringify([
      {
        requestClass: 'StartupService',
        requestMethod: 'getData',
        responseData: { city_map: {} },
      },
    ]);
    const first = await dispatcher.dispatchRaw(url, body, 'utf8');
    assert.equal(first.handled, true);
    assert.equal(first.duplicate, false);
    const second = await dispatcher.dispatchRaw(url, body, 'utf8');
    assert.equal(second.handled, false);
    assert.equal(second.duplicate, true);
    dispatcher.clearDedupCache();
    const third = await dispatcher.dispatchRaw(url, body, 'utf8');
    assert.equal(third.handled, true);
    assert.equal(third.duplicate, false);
    assert.equal(executions, 2);
  });

  await t.test(
    'onError isolates a throwing handler from the batch',
    async () => {
      const dispatcher = new MessageDispatcher();
      const captured = [];
      dispatcher.onError((err, msg, ctx) => {
        captured.push({ err, msg, ctx });
      });
      dispatcher.register('BadService', 'fail', () => {
        throw new Error('boom');
      });
      dispatcher.register('GoodService', 'work', () => 'ok');
      const context = { world: 'en7' };
      const result = await dispatcher.dispatchBatch(
        [
          { requestClass: 'BadService', requestMethod: 'fail', requestId: 1 },
          { requestClass: 'GoodService', requestMethod: 'work', requestId: 2 },
        ],
        context,
      );
      assert.equal(result.total, 2);
      assert.equal(result.succeeded, 1);
      assert.equal(result.failed, 1);
      assert.equal(result.results[1].success, true);
      assert.equal(result.results[1].result, 'ok');
      assert.equal(captured.length, 1);
      assert.equal(captured[0].err.message, 'boom');
      assert.equal(captured[0].msg.requestId, 1);
      assert.equal(captured[0].ctx, context);
    },
  );

  await t.test(
    'a throwing onError handler cannot break dispatchBatch',
    async () => {
      const dispatcher = new MessageDispatcher();
      dispatcher.onError(() => {
        throw new Error('handler exploded');
      });
      dispatcher.register('BadService', 'fail', () => {
        throw new Error('primary');
      });
      const result = await dispatcher.dispatchBatch([
        { requestClass: 'BadService', requestMethod: 'fail' },
        { requestClass: 'GoodService', requestMethod: 'work' },
      ]);
      assert.equal(result.failed, 1);
      assert.equal(result.succeeded, 1);
    },
  );

  await t.test(
    'direct metadata handler failure is reported and isolated',
    async () => {
      const dispatcher = new MessageDispatcher();
      const captured = [];
      dispatcher.onError((err) => captured.push(err));
      dispatcher.registerDirectMetadata(() => {
        throw new Error('metadata boom');
      });
      const url =
        'https://en7.forgeofempires.com/game/metadata?id=city_entities-abc';
      const res = await dispatcher.dispatchRaw(url, JSON.stringify({ a: 1 }));
      assert.equal(res.handled, false);
      assert.equal(res.isDirectMetadata, true);
      assert.equal(captured.length, 1);
      assert.equal(captured[0].message, 'metadata boom');
    },
  );

  await t.test(
    'direct metadata failure still reaches StaticDataService handler',
    async () => {
      const dispatcher = new MessageDispatcher();
      let staticHandled = false;
      dispatcher.onError(() => {});
      dispatcher.registerDirectMetadata(() => {
        throw new Error('metadata boom');
      });
      dispatcher.register('StaticDataService', 'getMetadata', () => {
        staticHandled = true;
        return 'static';
      });
      const url =
        'https://en7.forgeofempires.com/game/metadata?id=city_entities-abc';
      const res = await dispatcher.dispatchRaw(url, JSON.stringify({ a: 1 }));
      assert.equal(staticHandled, true);
      assert.equal(res.handled, true);
      assert.equal(res.batchResult.succeeded, 1);
    },
  );

  await t.test(
    'resolution prefers handler over class over global fallback',
    async () => {
      const dispatcher = new MessageDispatcher();
      const calls = [];
      dispatcher.register('TestService', 'known', () => {
        calls.push('handler');
        return 'handler';
      });
      dispatcher.registerFallback('TestService', () => {
        calls.push('class');
        return 'class';
      });
      dispatcher.registerGlobalFallback(() => {
        calls.push('global');
        return 'global';
      });
      const known = await dispatcher.dispatchSingle({
        requestClass: 'TestService',
        requestMethod: 'known',
      });
      const classFallback = await dispatcher.dispatchSingle({
        requestClass: 'TestService',
        requestMethod: 'other',
      });
      const globalFallback = await dispatcher.dispatchSingle({
        requestClass: 'MissingService',
        requestMethod: 'other',
      });
      assert.equal(known, 'handler');
      assert.equal(classFallback, 'class');
      assert.equal(globalFallback, 'global');
      assert.deepEqual(calls, ['handler', 'class', 'global']);
    },
  );

  await t.test('unhandled messages return a descriptive envelope', async () => {
    const dispatcher = new MessageDispatcher();
    assert.deepEqual(
      await dispatcher.dispatchSingle({
        requestClass: 'NothingService',
        requestMethod: 'nothing',
      }),
      {
        unhandled: true,
        requestClass: 'NothingService',
        requestMethod: 'nothing',
      },
    );
    assert.equal(await dispatcher.dispatchSingle(null), null);
  });

  await t.test(
    'register ignores invalid input and shares no handler twice',
    async () => {
      const dispatcher = new MessageDispatcher();
      const calls = [];
      const handler = () => {
        calls.push('once');
        return 1;
      };
      dispatcher.register('', 'm', handler);
      dispatcher.register('S', '', handler);
      dispatcher.register('S', 'm', 'not-a-function');
      dispatcher.register('S', 'm', handler);
      dispatcher.register('S', 'm', handler);
      assert.equal(
        await dispatcher.dispatchSingle({
          requestClass: 'S',
          requestMethod: 'm',
        }),
        1,
      );
      assert.deepEqual(calls, ['once']);
    },
  );

  await t.test(
    'combined duplicate registrations run in order and prefer later result',
    async () => {
      const dispatcher = new MessageDispatcher();
      const calls = [];
      dispatcher.register('S', 'm', () => {
        calls.push('first');
        return 'first-result';
      });
      dispatcher.register('S', 'm', () => {
        calls.push('second');
      });
      const res = await dispatcher.dispatchSingle({
        requestClass: 'S',
        requestMethod: 'm',
      });
      assert.deepEqual(calls, ['first', 'second']);
      assert.equal(res, 'first-result');
    },
  );

  await t.test(
    'registerService binds context and skips non-functions',
    async () => {
      const dispatcher = new MessageDispatcher();
      const service = {
        label: 'svc',
        work() {
          return this.label;
        },
        ignored: 'nope',
      };
      dispatcher.registerService('BoundService', service);
      assert.equal(
        await dispatcher.dispatchSingle({
          requestClass: 'BoundService',
          requestMethod: 'work',
        }),
        'svc',
      );
      const missing = await dispatcher.dispatchSingle({
        requestClass: 'BoundService',
        requestMethod: 'ignored',
      });
      assert.equal(missing.unhandled, true);
      assert.equal(dispatcher.registerService('X', null), dispatcher);
      assert.equal(dispatcher.registerService(null, {}), dispatcher);
    },
  );

  await t.test('fallback registration ignores invalid inputs', async () => {
    const dispatcher = new MessageDispatcher();
    dispatcher.registerFallback('', () => {});
    dispatcher.registerFallback('S', null);
    dispatcher.registerGlobalFallback('nope');
    const res = await dispatcher.dispatchSingle({
      requestClass: 'S',
      requestMethod: 'm',
    });
    assert.equal(res.unhandled, true);
    assert.equal(dispatcher.registerFallback('S', null), dispatcher);
    assert.equal(dispatcher.registerGlobalFallback(null), dispatcher);
  });
});
