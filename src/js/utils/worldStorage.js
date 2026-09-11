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

function sanitizeWorldId(worldId) {
  if (!worldId || typeof worldId !== 'string') return 'en7';
  return (
    worldId
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '') || 'en7'
  );
}

function getWorldKey(worldId) {
  return `world:${sanitizeWorldId(worldId)}`;
}

function setWorld(worldId) {
  currentWorldId = sanitizeWorldId(worldId);
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
  const all = await local.get(null).catch(() => ({}));
  if (!all) return;

  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith('world:')) {
      const wid = sanitizeWorldId(k.slice(6));
      memoryWorldCache[wid] = v;
    }
  }

  const migration = await migrateLegacyStorage(all, local);
  if (migration) {
    memoryGlobalCache = migration.globalSettings;
    memoryWorldCache['en7'] = migration.migratedWorld;
    return;
  }

  await cleanLegacyFlatKeys(local);
  memoryGlobalCache = all['global:settings'] || null;
  if (memoryGlobalCache?.lastActiveWorld) {
    currentWorldId = sanitizeWorldId(memoryGlobalCache.lastActiveWorld);
  }
  if (memoryGlobalCache?.timeFormatting) {
    try {
      const { setTimeFormattingConfig } = require('./date.js');
      setTimeFormattingConfig(memoryGlobalCache.timeFormatting);
    } catch {}
  }
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
      memoryWorldCache[wid] = res[key];
      return res[key];
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
  const wid = sanitizeWorldId(worldId);
  const globals = await getGlobalSettings();
  const list = Array.isArray(globals.knownWorlds) ? globals.knownWorlds : [];
  if (!list.includes(wid)) {
    const updated = {
      ...globals,
      knownWorlds: [...list, wid],
      lastActiveWorld: wid,
    };
    memoryGlobalCache = updated;
    const local = getStorageLocal();
    if (local) await local.set({ 'global:settings': updated }).catch(() => {});
  }
}

function _clearMemoryCacheForTesting() {
  for (const k in memoryWorldCache) delete memoryWorldCache[k];
  memoryGlobalCache = null;
  changeListeners.clear();
  boundBrowser = null;
  currentWorldId = 'en7';
}

module.exports = {
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
  memoryWorldCache,
  getStorageLocal,
  _clearMemoryCacheForTesting,
};
module.exports.default = module.exports;
