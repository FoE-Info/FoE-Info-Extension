import assert from 'node:assert/strict';
import test from 'node:test';
import { correlateRequestPayload } from '../../src/js/protocol/requestPayloadCorrelator.js';

test('correlateRequestPayload matches by requestId', async () => {
  const parsed = [{ requestId: 101, responseData: 'ok' }];
  const requestPayload = [
    {
      requestId: 101,
      requestClass: 'CityMapService',
      requestMethod: 'getData',
      requestData: { cityId: 1 },
    },
  ];

  await correlateRequestPayload(parsed, requestPayload);

  assert.equal(parsed[0].requestClass, 'CityMapService');
  assert.equal(parsed[0].requestMethod, 'getData');
  assert.deepEqual(parsed[0].requestData, { cityId: 1 });
});

test('correlateRequestPayload matches by class and method fallback', async () => {
  const parsed = [
    { requestClass: 'OtherPlayerService', requestMethod: 'getEvents' },
  ];
  const requestPayload = [
    {
      requestClass: 'OtherPlayerService',
      requestMethod: 'getEvents',
      requestData: [1, 2, 3],
    },
  ];

  await correlateRequestPayload(parsed, requestPayload);
  assert.deepEqual(parsed[0].requestData, [1, 2, 3]);
});

test('correlateRequestPayload single fallback and cooperative yielding', async () => {
  const parsed = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    requestClass: 'SingleClass',
    requestMethod: 'singleMethod',
  }));
  const requestPayload = {
    requestClass: 'SingleClass',
    requestMethod: 'singleMethod',
    requestData: { unified: true },
  };

  let yieldCount = 0;
  const yieldFn = async () => {
    yieldCount++;
  };

  await correlateRequestPayload(parsed, requestPayload, {
    yieldInterval: 10,
    yieldFn,
  });

  assert.equal(yieldCount, 2, 'yielded at index 10 and index 20');
  assert.deepEqual(parsed[0].requestData, { unified: true });
  assert.deepEqual(parsed[24].requestData, { unified: true });
});
