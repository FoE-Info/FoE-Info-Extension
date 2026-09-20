import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeBody,
  parsePayload,
} from '../../src/js/protocol/payloadCodec.js';

test('payloadCodec decodeBody handles plain strings, objects, and base64', () => {
  assert.equal(decodeBody(''), '');
  assert.equal(decodeBody(null), '');
  assert.equal(decodeBody('hello world'), 'hello world');
  assert.equal(decodeBody({ test: 123 }), '{"test":123}');

  const original = '{"foo":"bar","num":42}';
  const base64 = Buffer.from(original).toString('base64');
  assert.equal(decodeBody(base64, 'base64'), original);
});

test('payloadCodec parsePayload parses json and yields for heavy payloads', async () => {
  assert.equal(await parsePayload(null), null);
  assert.equal(await parsePayload(''), null);

  const existingObj = { direct: true };
  assert.equal(await parsePayload(existingObj), existingObj);

  const parsed = await parsePayload('{"active":true,"value":99}');
  assert.deepEqual(parsed, { active: true, value: 99 });

  let yieldCount = 0;
  const yieldFn = async () => {
    yieldCount++;
  };

  const heavyData = {
    records: Array.from({ length: 1500 }, (_, i) => ({
      id: i,
      name: `record_${i}`,
    })),
  };
  const heavyJson = JSON.stringify(heavyData);
  assert.ok(heavyJson.length > 20000);

  const heavyParsed = await parsePayload(heavyJson, {
    yieldParseThresholdBytes: 10000,
    yieldFn,
  });
  assert.equal(heavyParsed.records.length, 1500);
  assert.equal(yieldCount, 2, 'yielded before and after JSON.parse');
});
