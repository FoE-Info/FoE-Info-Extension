/**
 * worldStorage.js
 *
 * Isolated per-world storage manager and runtime event dispatch.
 */

const browserApi =
  (typeof globalThis !== 'undefined' && globalThis.browser) ||
  (typeof window !== 'undefined' && window.browser) ||
  (() => {
    try {
      return require('webextension-polyfill');
    } catch {
      return null;
    }
  })();

const {
  createFreshWorldSettings,
  createFreshGlobalSettings,
} = require('../state/factoryDefaults.js');
const {
  migrateLegacyStorage,
  cleanLegacyFlatKeys,
  LEGACY_FLAT_KEYS,
} = require('./storageMigration.js');

let logger = null;
try {
  const { createLogger } = require('./logger.js');
  logger = createLogger('WorldStorage');
} catch {
  // Diagnostics are best-effort: storage correctness must not depend on the
  // logger being constructible.
  logger = null;
}

let currentWorldId = 'en7';
const memoryWorldCache = Object.create(null);
let memoryGlobalCache = null;
const changeListeners = new Set();
let boundBrowser = null;

function getStorageLocal() {
  const b =
    typeof globalThis !== 'undefined' && globalThis.browser ?
      globalThis.browser
    : browserApi;
  return b?.storage?.local || null;
}

function isPlayableWorld(worldId) {
  if (!worldId || typeof worldId !== 'string') return false;
  const clean = worldId
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
  return /^[a-z]+[1-9][0-9]*$/.test(clean);
}

function sanitizeWorldId(worldId) {
  if (!worldId || typeof worldId !== 'string') return 'en7';
  const clean = worldId
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
  return isPlayableWorld(clean) ? clean : 'en7';
}

function getWorldKey(worldId) {
  return `world:${sanitizeWorldId(worldId)}`;
}

/**
 * Top-level world settings fields persisted as independent storage keys.
 * Per-field keys (`world:en7:showOptions`) allow two contexts to save
 * different settings without a whole-object read-modify-write clobbering
 * unrelated changes.
 */
const WORLD_FIELDS = [
  'showOptions',
  'donation',
  'webhooks',
  'toolOptions',
  'caches',
  'collapses',
];

function getWorldFieldKey(worldId, field) {
  return `${getWorldKey(worldId)}:${field}`;
}

/**
 * Parses a world storage key.
 * Returns `{ worldId }` for the whole-object key (`world:en7`),
 * `{ worldId, field }` for a per-field key (`world:en7:showOptions`),
 * or null for unrelated keys.
 */
function parseWorldKey(key) {
  if (typeof key !== 'string' || !key.startsWith('world:')) return null;
  const rest = key.slice(6);
  const sepIndex = rest.indexOf(':');
  if (sepIndex === -1) {
    return isPlayableWorld(rest) ? { worldId: rest } : null;
  }
  const worldId = rest.slice(0, sepIndex);
  const field = rest.slice(sepIndex + 1);
  if (!isPlayableWorld(worldId) || !WORLD_FIELDS.includes(field)) return null;
  return { worldId, field };
}

function buildWorldWritePayload(worldId, settings) {
  const payload = { [getWorldKey(worldId)]: settings };
  for (const field of WORLD_FIELDS) {
    if (settings && settings[field] !== undefined) {
      payload[getWorldFieldKey(worldId, field)] = settings[field];
    }
  }
  return payload;
}

function readWorldSnapshot(result, worldId) {
  if (!result) return null;
  const blob = result[getWorldKey(worldId)];
  const stored = blob && typeof blob === 'object' ? { ...blob } : {};
  let hasStoredData = Boolean(blob && typeof blob === 'object');
  for (const field of WORLD_FIELDS) {
    const value = result[getWorldFieldKey(worldId, field)];
    if (value !== undefined) {
      stored[field] = value;
      hasStoredData = true;
    }
  }
  return hasStoredData ? stored : null;
}

function setWorld(worldId) {
  if (!isPlayableWorld(worldId)) return;
  currentWorldId = sanitizeWorldId(worldId);
  if (
    memoryGlobalCache &&
    memoryGlobalCache.lastActiveWorld !== currentWorldId
  ) {
    memoryGlobalCache = {
      ...memoryGlobalCache,
      lastActiveWorld: currentWorldId,
    };
    updateGlobalSettings((globals) => ({
      ...globals,
      lastActiveWorld: currentWorldId,
    })).catch((err) => {
      logger?.error('setWorld persist failed:', err?.message || err);
    });
  }
}

function getCurrentWorld() {
  return currentWorldId;
}

function setupStorageListener() {
  const b =
    (typeof globalThis !== 'undefined' && globalThis.browser) || browserApi;
  if (b?.storage?.onChanged && boundBrowser !== b) {
    boundBrowser = b;
    b.storage.onChanged.addListener((changes, area) => {
      if (area && area !== 'local') return;
      if (changes['global:settings']) {
        memoryGlobalCache = changes['global:settings'].newValue;
        if (memoryGlobalCache?.timeFormatting) {
          try {
            const { setTimeFormattingConfig } = require('./date.js');
            setTimeFormattingConfig(memoryGlobalCache.timeFormatting);
          } catch {}
        }
      }
      for (const [key, change] of Object.entries(changes)) {
        const parsed = parseWorldKey(key);
        if (!parsed) continue;
        const wid = parsed.worldId;
        if (parsed.field) {
          // Per-field key update: merge into the cached world object so
          // concurrent field saves never clobber each other in memory.
          const cached = memoryWorldCache[wid];
          if (cached && typeof cached === 'object') {
            memoryWorldCache[wid] = {
              ...cached,
              [parsed.field]: change.newValue,
            };
          } else {
            memoryWorldCache[wid] = mergeWithWorldDefaults({
              [parsed.field]: change.newValue,
            });
          }
        } else {
          // A derived blob may be stale when another context writes a field.
          // Preserve cached unrelated fields when this batch supplies field keys.
          if (
            memoryWorldCache[wid] &&
            Object.keys(changes).some((candidate) => {
              const parsedCandidate = parseWorldKey(candidate);
              return parsedCandidate?.worldId === wid && parsedCandidate.field;
            })
          )
            continue;
          memoryWorldCache[wid] = mergeWithWorldDefaults(change.newValue);
        }
        if (wid === currentWorldId) {
          changeListeners.forEach((cb) => {
            try {
              cb(memoryWorldCache[wid], wid);
            } catch (e) {
              logger?.error(e);
            }
          });
        }
      }
    });
  }
}

async function initWorldStorage() {
  setupStorageListener();
  const local = getStorageLocal();
  if (!local) return;

  const globalKey = 'global:settings';
  const globalRes = await local.get(globalKey).catch(() => null);

  if (globalRes && globalRes[globalKey]) {
    memoryGlobalCache = globalRes[globalKey];
    if (memoryGlobalCache?.lastActiveWorld) {
      currentWorldId = sanitizeWorldId(memoryGlobalCache.lastActiveWorld);
    }
    if (memoryGlobalCache?.timeFormatting) {
      try {
        const { setTimeFormattingConfig } = require('./date.js');
        setTimeFormattingConfig(memoryGlobalCache.timeFormatting);
      } catch {}
    }

    const known =
      Array.isArray(memoryGlobalCache?.knownWorlds) ?
        memoryGlobalCache.knownWorlds
      : [];
    if (known.length > 0) {
      const worldKeys = known.flatMap((w) => [
        getWorldKey(w),
        ...WORLD_FIELDS.map((f) => getWorldFieldKey(w, f)),
      ]);
      const worldsRes = await local.get(worldKeys).catch(() => ({}));
      if (worldsRes) {
        const byWorld = new Map();
        for (const [k, v] of Object.entries(worldsRes)) {
          const parsed = parseWorldKey(k);
          if (!parsed || v === undefined || v === null) continue;
          if (!byWorld.has(parsed.worldId)) {
            byWorld.set(parsed.worldId, { stored: {}, fields: {} });
          }
          const entry = byWorld.get(parsed.worldId);
          if (parsed.field) entry.fields[parsed.field] = v;
          else Object.assign(entry.stored, v);
        }
        for (const [wid, { stored, fields }] of byWorld) {
          memoryWorldCache[wid] = mergeWithWorldDefaults({
            ...stored,
            ...fields,
          });
        }
      }
    }
    return;
  }

  // Fallback for legacy installs that have not migrated to global:settings
  const legacyKeys = [globalKey, ...LEGACY_FLAT_KEYS, 'world:en7'];
  const partial = await local.get(legacyKeys).catch(() => ({}));
  const migration = await migrateLegacyStorage(partial, local);
  if (migration) {
    memoryGlobalCache = migration.globalSettings;
    memoryWorldCache['en7'] = migration.migratedWorld;
    return;
  }

  await cleanLegacyFlatKeys(local);
  memoryGlobalCache = createFreshGlobalSettings();
}

function mergeWithWorldDefaults(stored) {
  if (!stored || typeof stored !== 'object') return createFreshWorldSettings();
  const fresh = createFreshWorldSettings();
  return {
    ...fresh,
    ...stored,
    showOptions: {
      ...fresh.showOptions,
      ...(stored.showOptions || {}),
    },
    donation: {
      ...fresh.donation,
      ...(stored.donation || {}),
    },
    webhooks: {
      ...fresh.webhooks,
      ...(stored.webhooks || {}),
    },
    toolOptions: {
      ...fresh.toolOptions,
      ...(stored.toolOptions || {}),
    },
    caches: {
      ...fresh.caches,
      ...(stored.caches || {}),
    },
    collapses: {
      ...fresh.collapses,
      ...(stored.collapses || {}),
    },
  };
}

function onWorldSettingsChange(cb) {
  setupStorageListener();
  if (typeof cb === 'function') {
    changeListeners.add(cb);
  }
  return () => changeListeners.delete(cb);
}

async function getWorldSettings(worldId = currentWorldId) {
  setupStorageListener();
  const wid = sanitizeWorldId(worldId);
  if (memoryWorldCache[wid]) return memoryWorldCache[wid];

  const local = getStorageLocal();
  const legacyKey = getWorldKey(wid);
  const keys = [
    legacyKey,
    ...WORLD_FIELDS.map((f) => getWorldFieldKey(wid, f)),
  ];
  const res = local ? await local.get(keys).catch(() => null) : null;

  const stored = readWorldSnapshot(res, wid);
  if (stored) {
    const merged = mergeWithWorldDefaults(stored);
    memoryWorldCache[wid] = merged;
    return merged;
  }

  const fresh = createFreshWorldSettings();
  if (local) {
    await local.set(buildWorldWritePayload(wid, fresh)).catch((err) => {
      logger?.error('world seed persist failed:', err?.message || err);
    });
  }
  memoryWorldCache[wid] = fresh;
  await registerKnownWorld(wid);
  return fresh;
}

const worldSaveQueues = new Map();

/**
 * Saves a partial world settings update.
 *
 * Each top-level field present in `partialSettings` is persisted to its own
 * storage key (`world:<id>:<field>`) merged onto that field's current value,
 * so two contexts saving different fields can never lose each other's changes
 * through a whole-object read-modify-write. The whole-object key
 * (`world:<id>`) is also refreshed as a derived snapshot for legacy readers.
 *
 * Write failures are propagated to the caller — they are never swallowed.
 */
function saveWorldSettings(worldId, partialSettings = {}) {
  const wid = sanitizeWorldId(worldId);
  const previous = worldSaveQueues.get(wid) || Promise.resolve();
  const pending = previous
    .catch(() => {})
    .then(() => persistWorldSettings(wid, partialSettings));
  worldSaveQueues.set(wid, pending);
  const clear = () => {
    if (worldSaveQueues.get(wid) === pending) worldSaveQueues.delete(wid);
  };
  pending.then(clear, clear);
  return pending;
}

async function persistWorldSettings(worldId, partialSettings) {
  setupStorageListener();
  const wid = sanitizeWorldId(worldId);
  const partial =
    partialSettings && typeof partialSettings === 'object' ?
      partialSettings
    : {};

  const local = getStorageLocal();
  const keys = [
    getWorldKey(wid),
    ...WORLD_FIELDS.map((field) => getWorldFieldKey(wid, field)),
  ];
  // Reloads start with an empty cache; other contexts can also make a warm
  // cache stale. Read the authoritative fields before merging a partial save.
  // A failed read rejects instead of overwriting saved settings with defaults.
  const stored = local ? readWorldSnapshot(await local.get(keys), wid) : null;
  const current = mergeWithWorldDefaults({
    ...memoryWorldCache[wid],
    ...stored,
  });

  const changedFields = {};
  for (const field of WORLD_FIELDS) {
    if (partial[field] === undefined) continue;
    const base = current[field];
    changedFields[field] = { ...base, ...partial[field] };
  }

  if (Object.keys(changedFields).length === 0) {
    return current;
  }

  // Per-field in-memory update: mutate the shared cached object instead of
  // replacing it, so a concurrent save of a different field is preserved.
  const cached = memoryWorldCache[wid] || current;
  Object.assign(cached, current);
  for (const [field, value] of Object.entries(changedFields)) {
    cached[field] = value;
  }
  memoryWorldCache[wid] = cached;

  const updated = mergeWithWorldDefaults(cached);
  if (local) {
    // Rejection propagates to the caller (Change 3: observable persistence
    // failures — never claim success for a write that did not land).
    const payload = { [getWorldKey(wid)]: updated };
    for (const [field, value] of Object.entries(changedFields))
      payload[getWorldFieldKey(wid, field)] = value;
    await local.set(payload);
  }
  await registerKnownWorld(wid);
  return updated;
}

async function resetWorldSettings(worldId) {
  const wid = sanitizeWorldId(worldId);
  const fresh = createFreshWorldSettings();
  memoryWorldCache[wid] = fresh;
  const local = getStorageLocal();
  if (local) await local.set(buildWorldWritePayload(wid, fresh));
  return fresh;
}

let globalWriteQueue = Promise.resolve();

/**
 * Serialized global:settings writer.
 *
 * Chains writes through a promise queue and re-reads the persisted value
 * inside the critical section, so unrelated global mutations (lastActiveWorld,
 * knownWorlds, language/theme/timeFormatting) cannot overwrite each other with
 * a stale snapshot. Note: the queue serializes writers within this extension
 * context; the fresh re-read narrows (but cannot fully eliminate) the race
 * against another extension context.
 *
 * @param {Function} mutate - Receives a shallow copy of current globals,
 *   returns the updated object (or falsy to keep current).
 * @returns {Promise<Object>} The persisted globals.
 */
async function updateGlobalSettings(mutate) {
  const run = globalWriteQueue.then(async () => {
    const local = getStorageLocal();
    let current = memoryGlobalCache;
    if (local) {
      const res = await local.get('global:settings').catch(() => null);
      if (res && res['global:settings']) current = res['global:settings'];
    }
    if (!current) current = createFreshGlobalSettings();
    const updated = mutate({ ...current }) || current;
    memoryGlobalCache = updated;
    if (local) await local.set({ 'global:settings': updated });
    return updated;
  });
  globalWriteQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function getGlobalSettings() {
  if (memoryGlobalCache) return memoryGlobalCache;
  const local = getStorageLocal();
  if (local) {
    const res = await local.get('global:settings').catch(() => null);
    if (res && res['global:settings']) {
      memoryGlobalCache = res['global:settings'];
      return res['global:settings'];
    }
  }
  const fresh = createFreshGlobalSettings();
  if (local) {
    // Rejection propagates, matching saveWorldSettings above. Swallowing it
    // let a caller report success for globals that vanish on the next cold
    // start, so a seed write that did not land must not look like one that did.
    await local.set({ 'global:settings': fresh });
  }
  memoryGlobalCache = fresh;
  return fresh;
}

async function registerKnownWorld(worldId) {
  if (!isPlayableWorld(worldId)) return;
  const wid = sanitizeWorldId(worldId);
  await updateGlobalSettings((globals) => {
    const list = Array.isArray(globals.knownWorlds) ? globals.knownWorlds : [];
    const knownWorlds = list.includes(wid) ? list : [...list, wid];
    return { ...globals, knownWorlds, lastActiveWorld: wid };
  });
}

async function setLastActiveWorld(worldId) {
  if (!isPlayableWorld(worldId)) return;
  return registerKnownWorld(worldId);
}

function _clearMemoryCacheForTesting() {
  for (const k in memoryWorldCache) delete memoryWorldCache[k];
  memoryGlobalCache = null;
  changeListeners.clear();
  boundBrowser = null;
  currentWorldId = 'en7';
}

module.exports = {
  isPlayableWorld,
  sanitizeWorldId,
  getWorldKey,
  getWorldFieldKey,
  parseWorldKey,
  WORLD_FIELDS,
  buildWorldWritePayload,
  setWorld,
  getCurrentWorld,
  initWorldStorage,
  setupStorageListener,
  onWorldSettingsChange,
  getWorldSettings,
  saveWorldSettings,
  resetWorldSettings,
  getGlobalSettings,
  updateGlobalSettings,
  registerKnownWorld,
  setLastActiveWorld,
  mergeWithWorldDefaults,
  memoryWorldCache,
  getStorageLocal,
  _clearMemoryCacheForTesting,
};
module.exports.default = module.exports;
