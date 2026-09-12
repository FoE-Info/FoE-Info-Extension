import assert from 'node:assert/strict';
import test from 'node:test';
import pkg from '../../src/js/protocol/directMetadata.js';
import dispatcherPkg from '../../src/js/protocol/MessageDispatcher.js';

const { isDirectMetadataUrl, parseMetadataUrlContext, routeDirectMetadata } =
  pkg;
const { MessageDispatcher } = dispatcherPkg;

test('isDirectMetadataUrl matches CDN metadata resources only', () => {
  assert.equal(
    isDirectMetadataUrl(
      'https://en7.forgeofempires.com/game/metadata?id=city_entities-abc',
    ),
    true,
  );
  assert.equal(
    isDirectMetadataUrl('https://en7.forgeofempires.com/start/metadata'),
    true,
  );
  assert.equal(
    isDirectMetadataUrl('https://en7.forgeofempires.com/game/json'),
    false,
  );
  assert.equal(isDirectMetadataUrl(''), false);
  assert.equal(isDirectMetadataUrl(null), false);
  assert.equal(isDirectMetadataUrl(42), false);
});

test('parseMetadataUrlContext splits meta id from hash', () => {
  assert.deepEqual(
    parseMetadataUrlContext(
      'https://en7.forgeofempires.com/game/metadata?id=city_entities-abc&x=1',
    ),
    {
      metaId: 'city_entities',
      metaHash: 'abc',
      reqUrl:
        'https://en7.forgeofempires.com/game/metadata?id=city_entities-abc&x=1',
    },
  );
  assert.deepEqual(
    parseMetadataUrlContext('https://x/metadata?id=building_entity_X-a-b'),
    {
      metaId: 'building_entity_X',
      metaHash: 'a-b',
      reqUrl: 'https://x/metadata?id=building_entity_X-a-b',
    },
  );
  assert.deepEqual(parseMetadataUrlContext('https://x/game/json'), {
    metaId: null,
    metaHash: null,
    reqUrl: 'https://x/game/json',
  });
});

test('routeDirectMetadata returns null for non-metadata URLs', async () => {
  const dispatcher = new MessageDispatcher();
  const res = await routeDirectMetadata(dispatcher, {
    parsed: { a: 1 },
    reqUrl: 'https://en7.forgeofempires.com/game/json',
    headers: [],
    request: null,
  });
  assert.equal(res, null);
});

test('routeDirectMetadata invokes the registered metadata handler', async () => {
  const dispatcher = new MessageDispatcher();
  let seen = null;
  dispatcher.registerDirectMetadata((data, ctx) => {
    seen = ctx;
    return { echoed: data };
  });
  const res = await routeDirectMetadata(dispatcher, {
    parsed: { a: 1 },
    reqUrl: 'https://en7.forgeofempires.com/game/metadata?id=city_entities-abc',
    headers: ['h'],
    request: { r: 1 },
  });
  assert.equal(res.handled, true);
  assert.equal(res.isDirectMetadata, true);
  assert.deepEqual(res.directResult, {
    echoed: { a: 1, id: 'city_entities' },
  });
  assert.equal(seen.metaId, 'city_entities');
  assert.equal(seen.metaHash, 'abc');
  assert.deepEqual(seen.headers, ['h']);
  assert.deepEqual(seen.request, { r: 1 });
});

test('routeDirectMetadata normalizes parsed.id from the meta id', async () => {
  const dispatcher = new MessageDispatcher();
  const parsed = { value: 1 };
  await routeDirectMetadata(dispatcher, {
    parsed,
    reqUrl: 'https://x/metadata?id=building_entity_28479-hash',
    headers: [],
    request: null,
  });
  assert.equal(parsed.id, '28479');
});

test('routeDirectMetadata isolates handler failures through onError', async () => {
  const dispatcher = new MessageDispatcher();
  const captured = [];
  dispatcher.onError((err) => captured.push(err));
  dispatcher.registerDirectMetadata(() => {
    throw new Error('metadata boom');
  });
  const res = await routeDirectMetadata(dispatcher, {
    parsed: { a: 1 },
    reqUrl: 'https://en7.forgeofempires.com/game/metadata?id=city_entities-abc',
    headers: [],
    request: null,
  });
  assert.equal(res.handled, false);
  assert.equal(res.isDirectMetadata, true);
  assert.equal(captured.length, 1);
});

test('routeDirectMetadata falls through to a StaticDataService handler', async () => {
  const dispatcher = new MessageDispatcher();
  dispatcher.registerDirectMetadata(() => {
    throw new Error('metadata boom');
  });
  dispatcher.onError(() => {});
  let staticHandled = false;
  dispatcher.register('StaticDataService', 'getMetadata', () => {
    staticHandled = true;
    return 'static';
  });
  const res = await routeDirectMetadata(dispatcher, {
    parsed: { a: 1 },
    reqUrl: 'https://en7.forgeofempires.com/game/metadata?id=city_entities-abc',
    headers: [],
    request: null,
  });
  assert.equal(staticHandled, true);
  assert.equal(res.handled, true);
  assert.equal(res.batchResult.succeeded, 1);
});
