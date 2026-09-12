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

function setWorld(worldId) {
  if (!isPlayableWorld(worldId)) return;
  currentWorldId = sanitizeWorldId(worldId);
  const local = getStorageLocal();
  if (
    local &&
    memoryGlobalCache &&
    memoryGlobalCache.lastActiveWorld !== currentWorldId
  ) {
    memoryGlobalCache = {
      ...memoryGlobalCache,
      lastActiveWorld: currentWorldId,
    };
    local.set({ 'global:settings': memoryGlobalCache }).catch(() => {});
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
        if (key.startsWith('world:')) {
          const wid = sanitizeWorldId(key.slice(6));
          memoryWorldCache[wid] = change.newValue;
          if (wid === currentWorldId) {
            changeListeners.forEach((cb) => {
              try {
                cb(change.newValue, wid);
              } catch (e) {
                console.error(e);
              }
            });
          }
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
      const worldKeys = known.map((w) => getWorldKey(w));
      const worldsRes = await local.get(worldKeys).catch(() => ({}));
      if (worldsRes) {
        for (const [k, v] of Object.entries(worldsRes)) {
          if (k.startsWith('world:')) {
            const wid = sanitizeWorldId(k.slice(6));
            memoryWorldCache[wid] = mergeWithWorldDefaults(v);
          }
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
  const key = getWorldKey(wid);
  if (local) {
    const res = await local.get(key).catch(() => null);
    if (res && res[key]) {
      const merged = mergeWithWorldDefaults(res[key]);
      memoryWorldCache[wid] = merged;
      return merged;
    }
  }

  const fresh = createFreshWorldSettings();
  if (local) {
    await local.set({ [key]: fresh }).catch(() => {});
  }
  memoryWorldCache[wid] = fresh;
  await registerKnownWorld(wid);
  return fresh;
}

async function saveWorldSettings(worldId, partialSettings = {}) {
  setupStorageListener();
  const wid = sanitizeWorldId(worldId);
  const current = await getWorldSettings(wid);
  const updated = {
    ...current,
    ...partialSettings,
    showOptions: {
      ...current.showOptions,
      ...(partialSettings.showOptions || {}),
    },
    donation: { ...current.donation, ...(partialSettings.donation || {}) },
    webhooks: { ...current.webhooks, ...(partialSettings.webhooks || {}) },
    toolOptions: {
      ...current.toolOptions,
      ...(partialSettings.toolOptions || {}),
    },
    caches: { ...current.caches, ...(partialSettings.caches || {}) },
    collapses: { ...current.collapses, ...(partialSettings.collapses || {}) },
  };

  const key = getWorldKey(wid);
  memoryWorldCache[wid] = updated;
  const local = getStorageLocal();
  if (local) {
    await local.set({ [key]: updated }).catch(() => {});
  }
  await registerKnownWorld(wid);
  return updated;
}

async function resetWorldSettings(worldId) {
  const wid = sanitizeWorldId(worldId);
  const fresh = createFreshWorldSettings();
  const key = getWorldKey(wid);
  memoryWorldCache[wid] = fresh;
  const local = getStorageLocal();
  if (local) await local.set({ [key]: fresh }).catch(() => {});
  return fresh;
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
  if (local) await local.set({ 'global:settings': fresh }).catch(() => {});
  memoryGlobalCache = fresh;
  return fresh;
}

async function registerKnownWorld(worldId) {
  if (!isPlayableWorld(worldId)) return;
  const wid = sanitizeWorldId(worldId);
  const globals = await getGlobalSettings();
  const list = Array.isArray(globals.knownWorlds) ? globals.knownWorlds : [];
  const needsWorldAdd = !list.includes(wid);
  const needsActiveUpdate = globals.lastActiveWorld !== wid;

  if (needsWorldAdd || needsActiveUpdate) {
    const updated = {
      ...globals,
      knownWorlds: needsWorldAdd ? [...list, wid] : list,
      lastActiveWorld: wid,
    };
    memoryGlobalCache = updated;
    const local = getStorageLocal();
    if (local) await local.set({ 'global:settings': updated }).catch(() => {});
  }
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
  setWorld,
  getCurrentWorld,
  initWorldStorage,
  setupStorageListener,
  onWorldSettingsChange,
  getWorldSettings,
  saveWorldSettings,
  resetWorldSettings,
  getGlobalSettings,
  registerKnownWorld,
  setLastActiveWorld,
  memoryWorldCache,
  getStorageLocal,
  _clearMemoryCacheForTesting,
};
module.exports.default = module.exports;
