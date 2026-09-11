import assert from 'node:assert/strict';
import { test } from 'node:test';
import resolver from '../../src/js/msg/MetadataResolver.js';
import { scheduleStartupRender } from '../../src/js/msg/StartupRenderOrchestrator.js';

for (const failure of ['http', 'network', 'json']) {
  test(`city metadata retries after ${failure} failure`, async (t) => {
    const id = `retry_${failure}`;
    const url = `https://example.invalid/${id}`;
    let attempts = 0;
    const loaded = [];
    let updates = 0;
    t.mock.method(globalThis, 'fetch', async () => {
      if (++attempts === 1) {
        if (failure === 'network') throw new Error('offline');
        if (failure === 'json')
          return {
            ok: true,
            json: async () => {
              throw new Error('invalid JSON');
            },
          };
        return { ok: false, status: 503 };
      }
      return { ok: true, json: async () => ({ id }) };
    });
    const resolve = () =>
      resolver.resolveMissingCityEntities(
        [id],
        () => updates++,
        { [id]: url },
        {},
        (data) => loaded.push(data.id),
      );
    await resolve();
    await resolve();
    assert.deepEqual(loaded, [id]);
    assert.equal(updates, 1);
  });
}

test('city metadata uses fresh persistent cache before fetching', async (t) => {
  const cachedId = 'cached_building';
  const uncachedId = 'uncached_building';
  const secondUncachedId = 'second_uncached_building';
  const cachedUrl = `https://example.invalid/${cachedId}`;
  const uncachedUrl = `https://example.invalid/${uncachedId}`;
  const secondUncachedUrl = `https://example.invalid/${secondUncachedId}`;
  const cacheKey = 'metadata:cityEntities';
  const stored = {
    [cacheKey]: {
      version: 1,
      entries: {
        [cachedId]: {
          fetchedAt: Date.now(),
          data: { id: cachedId, name: 'Cached Building' },
        },
      },
    },
  };
  let writes = 0;
  let written;
  const storage = {
    get: async (key) => (key === cacheKey ? stored : {}),
    set: async (value) => {
      writes += 1;
      written = value;
    },
  };
  globalThis.chrome = { storage: { local: storage } };
  t.after(() => delete globalThis.chrome);

  const fetched = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    fetched.push(url);
    const id = url === uncachedUrl ? uncachedId : secondUncachedId;
    return {
      ok: true,
      json: async () => ({ id, name: 'Fetched Building' }),
    };
  });

  await resolver.resolveMissingCityEntities(
    [cachedId, uncachedId, secondUncachedId],
    null,
    {
      [cachedId]: cachedUrl,
      [uncachedId]: uncachedUrl,
      [secondUncachedId]: secondUncachedUrl,
    },
    {},
    () => {},
  );

  assert.deepEqual(fetched.sort(), [uncachedUrl, secondUncachedUrl].sort());
  assert.equal(writes, 1);
  assert.deepEqual(
    Object.keys(written[cacheKey].entries).sort(),
    [cachedId, uncachedId, secondUncachedId].sort(),
  );
});

test('city metadata rerenders when an already-resolved id is encountered', async () => {
  let updates = 0;
  const id = 'already_resolved_building';
  await resolver.resolveMissingCityEntities(
    [id],
    () => updates++,
    {},
    { [id]: { id, name: 'Already Resolved' } },
    () => {},
  );
  assert.equal(updates, 1);
});

test('city metadata gives up silently when no URL or cache entry exists', async () => {
  let updates = 0;
  await resolver.resolveMissingCityEntities(
    ['unavailable_building'],
    () => updates++,
    {},
    {},
    () => {},
  );
  assert.equal(updates, 0);
});

test('concurrent city callers share a download and both receive completion', async (t) => {
  let release;
  let attempts = 0;
  const loaded = [];
  const updates = [];
  t.mock.method(globalThis, 'fetch', () => {
    attempts++;
    return new Promise((resolve) => {
      release = resolve;
    });
  });
  const lookup = { concurrent: 'https://example.invalid/concurrent' };
  const resolve = (caller) =>
    resolver.resolveMissingCityEntities(
      ['concurrent'],
      () => updates.push(caller),
      lookup,
      {},
      (data) => loaded.push(data.id),
    );
  const first = resolve('first');
  const second = resolve('second');
  await new Promise((resolve) => setImmediate(resolve));
  release({ ok: true, json: async () => ({ id: 'concurrent' }) });
  await Promise.all([first, second]);
  assert.deepEqual(updates.sort(), ['first', 'second']);
  assert.deepEqual(loaded, ['concurrent']);
  assert.equal(attempts, 1);
});

test('unit metadata retries a failed download', async (t) => {
  let attempts = 0;
  const loaded = [];
  t.mock.method(globalThis, 'fetch', async () =>
    ++attempts === 1 ?
      { ok: false, status: 503 }
    : { ok: true, json: async () => [{ id: 'unit' }] },
  );
  const resolve = () =>
    resolver.resolveMissingUnitTypes(
      null,
      { unit_types: 'https://example.invalid/units' },
      (data) => loaded.push(data),
    );
  assert.equal(await resolve(), false);
  assert.equal(await resolve(), true);
  assert.deepEqual(loaded, [[{ id: 'unit' }]]);
});

test('late metadata completion recomputes once without an early fallback render', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const events = [];
  let complete;
  scheduleStartupRender({
    msg: {
      responseData: { city_map: { entities: [{ cityentity_id: 'late' }] } },
    },
    getCityEntityDef: () => null,
    renderLiveCityStats: () => events.push('fallback'),
    resolveMissingCityEntities: (_ids, callback) => {
      complete = callback;
    },
    onResolved: () => events.push('recompute'),
    fallbackTimeoutMs: 10,
  });
  t.mock.timers.tick(10);
  complete();
  complete();
  assert.deepEqual(events, ['recompute']);
});

test('rejected async resolution renders fallback once without an unhandled rejection', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let rendered = 0;
  scheduleStartupRender({
    msg: {
      responseData: { city_map: { entities: [{ cityentity_id: 'rejected' }] } },
    },
    getCityEntityDef: () => null,
    renderLiveCityStats: () => rendered++,
    resolveMissingCityEntities: async () => {
      throw new Error('resolution failed');
    },
    logger: { warn() {} },
    fallbackTimeoutMs: 10,
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(rendered, 1);
  t.mock.timers.tick(10);
  assert.equal(rendered, 1);
});
