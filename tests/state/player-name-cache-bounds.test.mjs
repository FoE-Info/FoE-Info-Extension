/**
 * Boundary tests for playerNameCacheOps — the bounded cache operations.
 *
 * Imports the CJS module directly so we can test without the ESM state.js
 * import chain. Exercises every cap, eviction path, and edge case.
 */
import { strict as assert } from 'node:assert/strict';
import test from 'node:test';
import ops from '../../src/js/state/playerNameCacheOps.js';

const {
  updateEntry,
  evictExpired,
  evictToCap,
  MAX_CACHE_ENTRIES,
  MAX_PREVIOUS_NAMES,
  NOT_FOUND_TTL_MS,
} = ops;

// ── Constants ──────────────────────────────────────────────────────────────

test('constants are sane', () => {
  assert.equal(MAX_CACHE_ENTRIES, 2000);
  assert.equal(MAX_PREVIOUS_NAMES, 5);
  assert.equal(NOT_FOUND_TTL_MS, 30 * 60 * 1000);
});

// ── updateEntry ────────────────────────────────────────────────────────────

test('updateEntry', async (t) => {
  await t.test('returns false for falsy id', () => {
    const cache = {};
    assert.equal(updateEntry(cache, null, 'Alice'), false);
    assert.equal(updateEntry(cache, 0, 'Alice'), false);
    assert.equal(updateEntry(cache, '', 'Alice'), false);
    assert.deepEqual(cache, {});
  });

  await t.test('returns false for null/empty name without notFound', () => {
    const cache = {};
    assert.equal(updateEntry(cache, 1, null), false);
    assert.equal(updateEntry(cache, 1, ''), false);
    assert.deepEqual(cache, {});
  });

  await t.test('creates a new entry', () => {
    const cache = {};
    assert.equal(updateEntry(cache, 100, 'Alice', null, 1000), true);
    assert.deepEqual(cache['100'], {
      currentName: 'Alice',
      previousNames: [],
      lastUpdated: 1000,
    });
  });

  await t.test('creates a notFound entry', () => {
    const cache = {};
    assert.equal(updateEntry(cache, 200, null, { notFound: true }, 2000), true);
    assert.deepEqual(cache['200'], { notFound: true, lastUpdated: 2000 });
  });

  await t.test('returns false when name is unchanged', () => {
    const cache = {
      100: { currentName: 'Alice', previousNames: [], lastUpdated: 1000 },
    };
    assert.equal(updateEntry(cache, 100, 'Alice', null, 5000), false);
    assert.deepEqual(cache['100'].lastUpdated, 1000, 'lastUpdated not touched');
  });

  await t.test('tracks previous name on rename', () => {
    const cache = {
      100: { currentName: 'Alice', previousNames: [], lastUpdated: 1000 },
    };
    assert.equal(updateEntry(cache, 100, 'Bob', null, 5000), true);
    assert.equal(cache['100'].currentName, 'Bob');
    assert.deepEqual(cache['100'].previousNames, ['Alice']);
    assert.equal(cache['100'].lastUpdated, 5000);
  });

  await t.test(
    'does not duplicate previous name on repeated rename to same name',
    () => {
      const cache = {
        100: { currentName: 'Alice', previousNames: [], lastUpdated: 1000 },
      };
      updateEntry(cache, 100, 'Bob', null, 5000);
      updateEntry(cache, 100, 'Charlie', null, 6000);
      assert.deepEqual(cache['100'].previousNames, ['Alice', 'Bob']);
    },
  );

  await t.test('overwrites notFound entry with a valid name', () => {
    const cache = { 300: { notFound: true, lastUpdated: 1000 } };
    assert.equal(updateEntry(cache, 300, 'Recovered', null, 5000), true);
    assert.equal(cache['300'].currentName, 'Recovered');
    assert.equal(cache['300'].notFound, undefined);
  });

  await t.test('allows re-notFound on a named entry', () => {
    const cache = {
      400: { currentName: 'Zara', previousNames: [], lastUpdated: 1000 },
    };
    assert.equal(updateEntry(cache, 400, null, { notFound: true }, 5000), true);
    assert.equal(cache['400'].notFound, true);
  });
});

// ── previousNames cap ──────────────────────────────────────────────────────

test('previousNames is capped at MAX_PREVIOUS_NAMES (FIFO)', () => {
  const cache = {};
  // Create entry
  updateEntry(cache, 500, 'V1', null, 100);
  // Rename 6 times → should keep only the last 5 previous names
  updateEntry(cache, 500, 'V2', null, 200);
  updateEntry(cache, 500, 'V3', null, 300);
  updateEntry(cache, 500, 'V4', null, 400);
  updateEntry(cache, 500, 'V5', null, 500);
  updateEntry(cache, 500, 'V6', null, 600);
  updateEntry(cache, 500, 'V7', null, 700);

  const entry = cache['500'];
  assert.equal(entry.currentName, 'V7');
  assert.equal(entry.previousNames.length, MAX_PREVIOUS_NAMES, 'capped');
  // V1 should have been shifted out
  assert.deepEqual(entry.previousNames, ['V2', 'V3', 'V4', 'V5', 'V6']);
});

// ── evictExpired ───────────────────────────────────────────────────────────

test('evictExpired', async (t) => {
  const now = 1_000_000;

  await t.test('evicts stale notFound entries', () => {
    const cache = {
      1: { notFound: true, lastUpdated: now - NOT_FOUND_TTL_MS - 1 },
      2: { currentName: 'Alice', previousNames: [], lastUpdated: now - 100 },
      3: { notFound: true, lastUpdated: now }, // fresh
    };
    const evicted = evictExpired(cache, now);
    assert.equal(evicted, 1);
    assert.equal(cache['1'], undefined, 'stale notFound evicted');
    assert.ok(cache['2'], 'named entry preserved');
    assert.ok(cache['3'], 'fresh notFound preserved');
  });

  await t.test('returns 0 when nothing expired', () => {
    const cache = {
      1: { currentName: 'Bob', previousNames: [], lastUpdated: now },
    };
    assert.equal(evictExpired(cache, now), 0);
  });

  await t.test('handles empty cache', () => {
    assert.equal(evictExpired({}, 1000), 0);
  });
});

// ── evictToCap ─────────────────────────────────────────────────────────────

test('evictToCap', async (t) => {
  await t.test('does nothing when under cap', () => {
    const cache = {};
    for (let i = 0; i < 5; i++) {
      cache[String(i)] = {
        currentName: `P${i}`,
        previousNames: [],
        lastUpdated: i,
      };
    }
    const evicted = evictToCap(cache, 10);
    assert.equal(evicted, 0);
    assert.equal(Object.keys(cache).length, 5);
  });

  await t.test('does nothing when exactly at cap', () => {
    const cache = {};
    for (let i = 0; i < 10; i++) {
      cache[String(i)] = {
        currentName: `P${i}`,
        previousNames: [],
        lastUpdated: i,
      };
    }
    assert.equal(evictToCap(cache, 10), 0);
    assert.equal(Object.keys(cache).length, 10);
  });

  await t.test('evicts oldest entries when over cap', () => {
    const cache = {};
    for (let i = 0; i < 15; i++) {
      cache[String(i)] = {
        currentName: `P${i}`,
        previousNames: [],
        lastUpdated: i,
      };
    }
    const evicted = evictToCap(cache, 10);
    assert.equal(evicted, 5);
    assert.equal(Object.keys(cache).length, 10);
    // Oldest (0-4) should be evicted
    assert.equal(cache['0'], undefined);
    assert.equal(cache['4'], undefined);
    // Newest (5-14) should survive
    assert.ok(cache['5']);
    assert.ok(cache['14']);
  });

  await t.test('uses default cap of MAX_CACHE_ENTRIES', () => {
    const cache = {};
    // Create 2001 entries with ascending timestamps
    for (let i = 0; i <= MAX_CACHE_ENTRIES; i++) {
      cache[String(i)] = {
        currentName: `P${i}`,
        previousNames: [],
        lastUpdated: i,
      };
    }
    const evicted = evictToCap(cache);
    assert.equal(evicted, 1);
    assert.equal(Object.keys(cache).length, MAX_CACHE_ENTRIES);
    // Entry with timestamp 0 should be evicted
    assert.equal(cache['0'], undefined);
    assert.ok(cache['1']);
  });

  await t.test('handles empty cache', () => {
    assert.equal(evictToCap({}, 10), 0);
  });
});

// ── Integration: combined update + eviction ────────────────────────────────

test('combined update + eviction cycle', async (t) => {
  await t.test('update triggers eviction when cache is at cap', () => {
    const cache = {};
    // Fill to cap
    for (let i = 0; i < MAX_CACHE_ENTRIES; i++) {
      cache[String(i)] = {
        currentName: `P${i}`,
        previousNames: [],
        lastUpdated: i,
      };
    }
    // Add one more → should be possible after eviction
    updateEntry(cache, 'NEW', 'BrandNew', null, MAX_CACHE_ENTRIES + 100);
    evictExpired(cache, MAX_CACHE_ENTRIES + 100);
    evictToCap(cache);
    assert.ok(cache['NEW'], 'new entry survived eviction');
    assert.equal(Object.keys(cache).length, MAX_CACHE_ENTRIES);
    // Oldest should be gone
    assert.equal(cache['0'], undefined);
  });

  await t.test(
    'notFound entry evicted after TTL, named entries preserved',
    () => {
      const cache = {};
      const now = 100_000;
      updateEntry(cache, 1, 'Alice', null, now);
      updateEntry(cache, 2, null, { notFound: true }, now);
      evictExpired(cache, now + NOT_FOUND_TTL_MS + 1);
      assert.ok(cache['1'], 'named entry survives');
      assert.equal(cache['2'], undefined, 'expired notFound evicted');
    },
  );
});
