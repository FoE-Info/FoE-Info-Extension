import assert from 'node:assert/strict';
import test from 'node:test';
import pkg from '../../src/js/protocol/requestPayload.js';

const { extractRequestPayload } = pkg;

test('extractRequestPayload returns the request untouched when it is an array', () => {
  const request = [{ requestClass: 'StartupService' }];
  assert.equal(extractRequestPayload(request), request);
});

test('extractRequestPayload parses a JSON string request', () => {
  assert.deepEqual(extractRequestPayload('{"a":1}'), { a: 1 });
  assert.deepEqual(extractRequestPayload('[1,2]'), [1, 2]);
});

test('extractRequestPayload returns null for an unparseable string', () => {
  assert.equal(extractRequestPayload('not json'), null);
});

test('extractRequestPayload parses nested postData.text JSON', () => {
  assert.deepEqual(
    extractRequestPayload({ request: { postData: { text: '{"a":1}' } } }),
    { a: 1 },
  );
  assert.deepEqual(extractRequestPayload({ postData: { text: '{"b":2}' } }), {
    b: 2,
  });
});

test('extractRequestPayload falls back to raw postData objects and arrays', () => {
  const postDataArray = [{ id: 1 }];
  assert.equal(
    extractRequestPayload({ request: { postData: postDataArray } }),
    postDataArray,
  );

  const postDataObject = { id: 2, requestClass: 'ResourceService' };
  assert.equal(
    extractRequestPayload({ postData: postDataObject }),
    postDataObject,
  );
});

test('extractRequestPayload accepts a top-level requestPayload array', () => {
  const payload = [1, 2, 3];
  assert.equal(extractRequestPayload({ requestPayload: payload }), payload);
});

test('extractRequestPayload returns null for absent or primitive requests', () => {
  assert.equal(extractRequestPayload(null), null);
  assert.equal(extractRequestPayload(undefined), null);
  assert.equal(extractRequestPayload(42), null);
  assert.equal(extractRequestPayload({}), null);
});

test('extractRequestPayload preserves the empty-object postData fallback', () => {
  const request = { postData: { text: '{}' } };
  assert.equal(extractRequestPayload(request), request.postData);
});
