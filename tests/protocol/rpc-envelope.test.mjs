import assert from 'node:assert/strict';
import test from 'node:test';
import { messageDispatcher } from '../../src/js/protocol/MessageDispatcher.js';
import '../../src/js/msg/registerServices.js';
import { registerLegacyBridge } from '../../src/js/protocol/legacyBridge.js';

test('RPC Envelope Routing - end-to-end multi-service batch dispatch', async () => {
  let legacyStartupCalled = false;
  registerLegacyBridge(messageDispatcher, {
    startupService: (msg) => {
      legacyStartupCalled = true;
      return { success: true };
    },
  });

  const envelope = [
    {
      __class__: 'ServerRequest',
      requestClass: 'TimeService',
      requestMethod: 'updateTime',
      responseData: { time: 1725516000 },
      requestId: 1,
    },
    {
      __class__: 'ServerRequest',
      requestClass: 'HiddenRewardService',
      requestMethod: 'getOverview',
      responseData: [
        {
          hiddenRewardId: 101,
          type: 'incident',
          startTime: 1725510000,
          expireTime: 1725520000,
        },
      ],
      requestId: 2,
    },
    {
      __class__: 'ServerRequest',
      requestClass: 'StartupService',
      requestMethod: 'getData',
      responseData: {
        user_data: { player_id: 12345, user_name: 'TestPlayer' },
      },
      requestId: 3,
    },
  ];

  const reqUrl = 'https://en7.forgeofempires.com/game/json?h=testHash';
  const rawBody = JSON.stringify(envelope);

  const dispatchResult = await messageDispatcher.dispatchRaw(
    reqUrl,
    rawBody,
    '',
    [{ name: 'content-type', value: 'application/json' }],
  );

  assert.equal(dispatchResult.handled, true);
  assert.equal(dispatchResult.duplicate, false);
  assert.equal(dispatchResult.batchResult.total, 3);
  assert.equal(dispatchResult.batchResult.succeeded, 3);
  assert.equal(dispatchResult.batchResult.failed, 0);
  assert.equal(legacyStartupCalled, true);
});

test('RPC Envelope Routing - ignores duplicate payloads on subsequent dispatch', async () => {
  const reqUrl = 'https://en7.forgeofempires.com/game/json?h=dedupTest';
  const rawBody = JSON.stringify([
    {
      __class__: 'ServerRequest',
      requestClass: 'TimeService',
      requestMethod: 'updateTime',
      responseData: { time: 1725516001 },
      requestId: 99,
    },
  ]);

  const first = await messageDispatcher.dispatchRaw(reqUrl, rawBody);
  assert.equal(first.handled, true);
  assert.equal(first.duplicate, false);

  const second = await messageDispatcher.dispatchRaw(reqUrl, rawBody);
  assert.equal(second.handled, false);
  assert.equal(second.duplicate, true);
});
