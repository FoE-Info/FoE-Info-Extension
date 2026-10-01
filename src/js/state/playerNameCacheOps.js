/**
 * playerNameCacheOps.js — Pure, testable bounded-cache operations for the
 * player-name cache shared across state.js, playerTooltip.js, and
 * OtherPlayerService.js.
 *
 * Every function takes the cache object by reference and mutates it in place
 * (or returns a boolean/count), so callers keep the same object identity.
 * No I/O; persistence is the caller's responsibility.
 */

'use strict';

const { createLogger } = require('../utils/logger.js');
const logger = createLogger('PlayerNameCacheOps');

/** Maximum entries before LRU eviction kicks in. */
const MAX_CACHE_ENTRIES = 2000;

/** Hard cap on previousNames per player (FIFO). */
const MAX_PREVIOUS_NAMES = 5;

/** notFound entries older than this are evicted on cleanup. */
const NOT_FOUND_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Write-through update for a single cache entry.
 *
 * @param {Object} cache  The playerNameCache map (mutated in place).
 * @param {number|string} id      Player ID.
 * @param {string|null}   name    Current name, or null for notFound.
 * @param {Object}        [opts]  Negative result or persisted ScoreDB retry state.
 * @param {number}        [now]   Injected timestamp for determinism.
 * @returns {boolean} true when the entry was mutated (dirty).
 */
function updateEntry(cache, id, name, opts, now) {
  if (!id) return false;
  const key = String(id);
  const existing = cache[key];
  const ts = typeof now === 'number' ? now : Date.now();

  if (opts && opts.notFound) {
    cache[key] = {
      notFound: true,
      ...(opts.permanent ? { permanent: true } : {}),
      lastUpdated: ts,
    };
    logger.debug('Updated not-found player-name cache entry');
    return true;
  }

  if (typeof opts?.scoreDBFailureCount === 'number') {
    cache[key] = {
      scoreDBFailureCount: opts.scoreDBFailureCount,
      scoreDBRetryAfter: opts.scoreDBRetryAfter,
      lastUpdated: ts,
    };
    logger.debug('Updated ScoreDB profile retry state');
    return true;
  }

  if (!name) return false;

  if (!existing || existing.notFound || !existing.currentName) {
    cache[key] = {
      currentName: name,
      previousNames: [],
      lastUpdated: ts,
    };
    logger.debug('Inserted player-name cache entry');
    return true;
  }

  if (existing.currentName !== name) {
    if (!existing.previousNames.includes(existing.currentName)) {
      existing.previousNames.push(existing.currentName);
      // Bound: FIFO trim
      while (existing.previousNames.length > MAX_PREVIOUS_NAMES) {
        existing.previousNames.shift();
      }
    }
    existing.currentName = name;
    existing.lastUpdated = ts;
    logger.debug('Updated player-name cache entry');
    return true;
  }

  return false; // unchanged
}

/**
 * Remove notFound entries older than the TTL.
 *
 * @param {Object} cache  The cache map.
 * @param {number} now    Current timestamp.
 * @returns {number} count of evicted entries.
 */
function evictExpired(cache, now) {
  let evicted = 0;
  for (const k of Object.keys(cache)) {
    const e = cache[k];
    if (
      e &&
      e.notFound &&
      !e.permanent &&
      now - (e.lastUpdated || 0) > NOT_FOUND_TTL_MS
    ) {
      delete cache[k];
      evicted++;
    }
  }
  if (evicted > 0) {
    logger.debug('Evicted expired player-name cache entries', evicted);
  }
  return evicted;
}

/**
 * Evict the oldest entries (by lastUpdated) so the cache stays within cap.
 * Expired notFound entries are cleaned first, then LRU fills the gap.
 *
 * @param {Object} cache  The cache map.
 * @param {number} [maxEntries=MAX_CACHE_ENTRIES]
 * @returns {number} count of evicted entries.
 */
function evictToCap(cache, maxEntries) {
  const limit = typeof maxEntries === 'number' ? maxEntries : MAX_CACHE_ENTRIES;
  const keys = Object.keys(cache);
  if (keys.length <= limit) return 0;

  // Sort oldest-first by lastUpdated
  keys.sort(
    (a, b) => (cache[a].lastUpdated || 0) - (cache[b].lastUpdated || 0),
  );
  const toEvict = keys.length - limit;
  for (let i = 0; i < toEvict; i++) {
    delete cache[keys[i]];
  }
  if (toEvict > 0) {
    logger.debug('Evicted capped player-name cache entries', toEvict);
  }
  return toEvict;
}

module.exports = {
  MAX_CACHE_ENTRIES,
  MAX_PREVIOUS_NAMES,
  NOT_FOUND_TTL_MS,
  updateEntry,
  evictExpired,
  evictToCap,
};
