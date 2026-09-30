import assert from 'node:assert/strict';
import { test } from 'node:test';
import resolver from '../../src/js/msg/MetadataResolver.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

test('persistMetadataBatch prunes expired metadata entries on the write path', async (t) => {
  const cacheKey = 'metadata:cityEntities';
  const expiredId = 'expired_metadata_entry';
  const freshId = 'fresh_metadata_entry';
  const newKey = 'newly_fetched_metadata_entry';
  const now = Date.now();

  let stored;
  const storage = {
    get: async (key) => ({
      [key]: {
        version: 1,
        entries: {
          [freshId]: {
            fetchedAt: now,
            data: { id: freshId, name: 'Fresh' },
          },
          [expiredId]: {
            fetchedAt: now - SEVEN_DAYS_MS - 1,
            data: { id: expiredId, name: 'Expired' },
          },
        },
      },
    }),
    set: async (value) => {
      stored = value;
    },
  };
  globalThis.chrome = { storage: { local: storage } };
  t.after(() => delete globalThis.chrome);

  await resolver.persistMetadataBatch({
    [newKey]: { fetchedAt: now, data: { id: newKey, name: 'New' } },
  });

  const entries = stored[cacheKey].entries;
  assert.ok(entries[newKey], 'newly persisted entry must be stored');
  assert.ok(entries[freshId], 'fresh entry must be preserved');
  assert.ok(
    !(expiredId in entries),
    'expired entry must be pruned before persist',
  );
  assert.equal(Object.keys(entries).length, 2);
});
