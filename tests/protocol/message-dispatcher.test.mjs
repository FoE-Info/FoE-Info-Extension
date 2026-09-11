import assert from 'node:assert/strict';
import test from 'node:test';
import pkg from '../../src/js/protocol/MessageDispatcher.js';

const { MessageDispatcher, messageDispatcher } = pkg;

test('MessageDispatcher - Core Engine & Dispatching Protocol', async (t) => {
  // Test 1: Handler registration (class + method)
  await t.test('registers specific class and method handlers', async () => {
    const dispatcher = new MessageDispatcher();
    let handled = false;
    let receivedMsg = null;
    let receivedCtx = null;

    dispatcher.register(
      'GreatBuildingsService',
      'getConstruction',
      (msg, ctx) => {
        handled = true;
        receivedMsg = msg;
        receivedCtx = ctx;
        return { ok: true };
      },
    );

    const msg = {
      __class__: 'ServerRequest',
      requestClass: 'GreatBuildingsService',
      requestMethod: 'getConstruction',
      responseData: { entity_id: 42, level: 10 },
    };

    const res = await dispatcher.dispatchBatch([msg], { user: 'tester' });
    assert.equal(handled, true);
    assert.equal(receivedMsg.responseData.entity_id, 42);
    assert.equal(receivedCtx.user, 'tester');
    assert.equal(res.succeeded, 1);
  });

  // Test 2: Registering entire service bundles
  await t.test(
    'registers entire service bundles via registerService',
    async () => {
      const dispatcher = new MessageDispatcher();
      const calls = [];

      const cityService = {
        pickupProduction(msg) {
          calls.push(`pickup:${msg.responseData.id}`);
        },
        cancelProduction(msg) {
          calls.push(`cancel:${msg.responseData.id}`);
        },
      };

      dispatcher.registerService('CityProductionService', cityService);

      await dispatcher.dispatchBatch([
        {
          requestClass: 'CityProductionService',
          requestMethod: 'pickupProduction',
          responseData: { id: 101 },
        },
        {
          requestClass: 'CityProductionService',
          requestMethod: 'cancelProduction',
          responseData: { id: 102 },
        },
      ]);

      assert.deepEqual(calls, ['pickup:101', 'cancel:102']);
    },
  );

  // Test 2b: Fallbacks
  await t.test('handles class fallbacks and global fallbacks', async () => {
    const dispatcher = new MessageDispatcher();
    let classFallbackCalled = false;
    let globalFallbackCalled = false;

    dispatcher.register('TestService', 'knownMethod', () => 'known');
    dispatcher.registerFallback('TestService', (msg) => {
      classFallbackCalled = true;
      return `fallback:${msg.requestMethod}`;
    });
    dispatcher.registerGlobalFallback((msg) => {
      globalFallbackCalled = true;
      return `global:${msg.requestClass}`;
    });

    await dispatcher.dispatchBatch([
      { requestClass: 'TestService', requestMethod: 'unknownMethod' },
      { requestClass: 'UnknownService', requestMethod: 'anyMethod' },
    ]);

    assert.equal(classFallbackCalled, true);
    assert.equal(globalFallbackCalled, true);
  });

  // Test 3: Base64 payload auto-decoding (UTF-8 binary decode)
  await t.test(
    'decodes base64 UTF-8 payloads with multi-byte characters',
    async () => {
      const dispatcher = new MessageDispatcher();
      let receivedData = null;

      dispatcher.register('ConversationService', 'getOverview', (msg) => {
        receivedData = msg.responseData;
      });

      const payloadObj = [
        {
          __class__: 'ServerRequest',
          requestClass: 'ConversationService',
          requestMethod: 'getOverview',
          responseData: {
            title: 'Grüße von den Kämpfern ⚔️!',
            city: 'München',
          },
        },
      ];

      const jsonStr = JSON.stringify(payloadObj);
      const base64Str = Buffer.from(jsonStr, 'utf8').toString('base64');

      const result = await dispatcher.dispatchRaw(
        'https://en7.forgeofempires.com/game/json?h=test',
        base64Str,
        'base64',
      );

      assert.equal(result.handled, true);
      assert.ok(receivedData);
      assert.equal(receivedData.title, 'Grüße von den Kämpfern ⚔️!');
      assert.equal(receivedData.city, 'München');
    },
  );

  // Test 4: Deduplication within 1000ms window
  await t.test(
    'deduplicates identical payloads within 1000ms window',
    async () => {
      const dispatcher = new MessageDispatcher({ dedupWindowMs: 1000 });
      let executionCount = 0;

      dispatcher.register('ResourceService', 'getPlayerResources', () => {
        executionCount++;
      });

      const url = 'https://en7.forgeofempires.com/game/json';
      const body = JSON.stringify([
        {
          requestClass: 'ResourceService',
          requestMethod: 'getPlayerResources',
          responseData: { resources: { money: 1000 } },
        },
      ]);

      // First call: should execute
      const res1 = await dispatcher.dispatchRaw(url, body, 'utf8');
      assert.equal(res1.handled, true);
      assert.equal(res1.duplicate, false);
      assert.equal(executionCount, 1);

      // Second immediate call (<1000ms): should be deduplicated
      const res2 = await dispatcher.dispatchRaw(url, body, 'utf8');
      assert.equal(res2.handled, false);
      assert.equal(res2.duplicate, true);
      assert.equal(executionCount, 1);

      // After simulated expiration (>1000ms): should execute again
      const now = Date.now();
      const isDup = dispatcher.isDuplicate(url, body, now + 1001);
      assert.equal(isDup, false);
    },
  );

  // Test 5: Priority sorting (StaticDataService before StartupService)
  await t.test(
    'sorts priority queue so StaticDataService executes before StartupService',
    async () => {
      const dispatcher = new MessageDispatcher();
      const executionOrder = [];

      dispatcher.register('StartupService', 'getData', () => {
        executionOrder.push('StartupService.getData');
      });

      dispatcher.register('StaticDataService', 'getMetadata', () => {
        executionOrder.push('StaticDataService.getMetadata');
      });

      dispatcher.register('OtherPlayerService', 'getFriendsList', () => {
        executionOrder.push('OtherPlayerService.getFriendsList');
      });

      // In incoming batch: StartupService is FIRST, StaticDataService is LAST
      const batch = [
        {
          requestClass: 'StartupService',
          requestMethod: 'getData',
          responseData: { city_map: {} },
        },
        {
          requestClass: 'OtherPlayerService',
          requestMethod: 'getFriendsList',
          responseData: [],
        },
        {
          requestClass: 'StaticDataService',
          requestMethod: 'getMetadata',
          responseData: [{ id: 'building_1' }],
        },
      ];

      await dispatcher.dispatchBatch(batch);

      // StaticDataService must have executed BEFORE StartupService
      assert.deepEqual(executionOrder, [
        'StaticDataService.getMetadata',
        'StartupService.getData',
        'OtherPlayerService.getFriendsList',
      ]);
    },
  );

  // Test 6: Per-message error isolation (error in message A does not abort message B)
  await t.test(
    'isolates errors so a failure in message A does not stop message B',
    async () => {
      const dispatcher = new MessageDispatcher();
      let messageBCalled = false;
      const errorsCaptured = [];

      dispatcher.onError((err, msg) => {
        errorsCaptured.push({ err, msg });
      });

      dispatcher.register('BadService', 'failingMethod', () => {
        throw new Error('Simulated crash in BadService');
      });

      dispatcher.register('GoodService', 'successfulMethod', () => {
        messageBCalled = true;
        return 'success';
      });

      const batch = [
        { requestClass: 'BadService', requestMethod: 'failingMethod' },
        { requestClass: 'GoodService', requestMethod: 'successfulMethod' },
      ];

      const batchResult = await dispatcher.dispatchBatch(batch);

      assert.equal(messageBCalled, true);
      assert.equal(batchResult.total, 2);
      assert.equal(batchResult.succeeded, 1);
      assert.equal(batchResult.failed, 1);
      assert.equal(errorsCaptured.length, 1);
      assert.equal(
        errorsCaptured[0].err.message,
        'Simulated crash in BadService',
      );
    },
  );

  // Test 7: Direct CDN metadata URL routing (metadata?id=*)
  await t.test(
    'routes direct CDN metadata URLs (metadata?id=*) correctly',
    async () => {
      const dispatcher = new MessageDispatcher();
      let routedMetadata = null;
      let routedContext = null;

      dispatcher.registerDirectMetadata((data, ctx) => {
        routedMetadata = data;
        routedContext = ctx;
      });

      const cdnUrl =
        'https://en7.forgeofempires.com/game/metadata?id=city_entities-9b2f3a';
      const metadataPayload = {
        W_MultiAge_ANNI23A1: {
          name: 'Tower of Conjunction',
          width: 3,
          length: 3,
        },
      };

      const res = await dispatcher.dispatchRaw(
        cdnUrl,
        JSON.stringify(metadataPayload),
      );
      assert.equal(res.handled, true);
      assert.equal(res.isDirectMetadata, true);
      assert.ok(routedMetadata);
      assert.equal(
        routedMetadata.W_MultiAge_ANNI23A1.name,
        'Tower of Conjunction',
      );
      assert.equal(routedContext.metaId, 'city_entities');
      assert.equal(routedContext.metaHash, '9b2f3a');
    },
  );

  // Test 7b: Direct CDN metadata fallback to StaticDataService.getMetadata handler
  await t.test(
    'routes direct CDN metadata to StaticDataService.getMetadata if no explicit direct handler',
    async () => {
      const dispatcher = new MessageDispatcher();
      let receivedMsg = null;

      dispatcher.register('StaticDataService', 'getMetadata', (msg) => {
        receivedMsg = msg;
      });

      const cdnUrl =
        'https://en7.forgeofempires.com/game/metadata?id=city_entities-9b2f3a';
      const payload = { bldg1: { name: 'Town Hall' } };

      const res = await dispatcher.dispatchRaw(cdnUrl, JSON.stringify(payload));
      assert.equal(res.handled, true);
      assert.equal(res.isDirectMetadata, true);
      assert.ok(receivedMsg);
      assert.equal(receivedMsg.requestClass, 'StaticDataService');
      assert.equal(receivedMsg.requestMethod, 'getMetadata');
      assert.equal(receivedMsg.metaId, 'city_entities');
    },
  );

  // Test 8: Singleton export verification
  await t.test('exports functional singleton messageDispatcher', () => {
    assert.ok(messageDispatcher instanceof MessageDispatcher);
    assert.equal(typeof messageDispatcher.register, 'function');
    assert.equal(typeof messageDispatcher.dispatchRaw, 'function');
    assert.equal(typeof messageDispatcher.dispatchBatch, 'function');
  });
});
