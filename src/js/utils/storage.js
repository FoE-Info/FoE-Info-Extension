/*
 * ________________________________________________________________
 * Copyright (C) 2022 FoE-Info - All Rights Reserved
 * this source-code uses a copy-left license
 *
 * you are welcome to contribute changes here:
 * https://github.com/FoE-Info/FoE-Info-Extension
 *
 * AGPL license info:
 * https://github.com/FoE-Info/FoE-Info-Extension/master/LICENSE.md
 * or else visit https://www.gnu.org/licenses/#AGPL
 * ________________________________________________________________
 */

const {
  isPlayableWorld,
  sanitizeWorldId,
  getWorldKey,
  setWorld,
  getCurrentWorld,
  initWorldStorage,
  onWorldSettingsChange,
  getWorldSettings,
  saveWorldSettings,
  resetWorldSettings,
  getGlobalSettings,
  registerKnownWorld,
  setLastActiveWorld,
  memoryWorldCache,
  getStorageLocal,
  _clearMemoryCacheForTesting: _clearWorldCache,
} = require('./worldStorage.js');

const storageCache = Object.create(null);

function sanitizeKey(key) {
  if (typeof key !== 'string') return null;
  if (key === '__proto__' || key === 'constructor' || key === 'prototype')
    return null;
  return key;
}

function updateCache(obj) {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const cleanKey = sanitizeKey(key);
      if (cleanKey) {
        storageCache[cleanKey] = obj[key];
        if (cleanKey.startsWith('world:')) {
          memoryWorldCache[cleanKey.slice(6)] = obj[key];
        }
      }
    }
  }
}

function setStorage(name, value) {
  const cleanKey = sanitizeKey(name);
  if (!cleanKey) return;
  storageCache[cleanKey] = value;

  const currentWorld = getCurrentWorld();
  if (name === 'hiddenInvestments') {
    if (memoryWorldCache[currentWorld]) {
      memoryWorldCache[currentWorld].caches = {
        ...memoryWorldCache[currentWorld].caches,
        hiddenInvestments: value,
      };
    }
    saveWorldSettings(currentWorld, { caches: { hiddenInvestments: value } });
    return;
  }
  if (name === 'investSettings' || name === 'showOptions') {
    if (memoryWorldCache[currentWorld]) {
      memoryWorldCache[currentWorld].showOptions = {
        ...memoryWorldCache[currentWorld].showOptions,
        ...value,
      };
    }
    saveWorldSettings(currentWorld, { showOptions: value });
    return;
  }
  if (name === 'toolOptions') {
    if (memoryWorldCache[currentWorld]) {
      memoryWorldCache[currentWorld].toolOptions = {
        ...memoryWorldCache[currentWorld].toolOptions,
        ...value,
      };
    }
    saveWorldSettings(currentWorld, { toolOptions: value });
    const local = getStorageLocal();
    if (local) {
      local
        .set({ [cleanKey]: value })
        .catch((err) => console.warn('setStorage error:', err));
    }
    return;
  }

  const local = getStorageLocal();
  if (local) {
    local
      .set({ [cleanKey]: value })
      .catch((err) => console.warn('setStorage error:', err));
  }
}

function getStorage(name, callback) {
  const cleanKey = sanitizeKey(name);
  if (!cleanKey) {
    if (typeof callback === 'function') callback(null, null);
    return Promise.resolve(null);
  }

  const settings = memoryWorldCache[getCurrentWorld()];
  let val;
  if (settings) {
    if (name === 'hiddenInvestments') val = settings.caches?.hiddenInvestments;
    else if (name === 'investSettings' || name === 'showOptions')
      val = settings.showOptions;
    else if (name === 'toolOptions') val = settings.toolOptions;
    else if (name === 'donation') val = settings.donation;
    else if (name === 'url') val = settings.webhooks;
  }
  if (val === undefined) val = storageCache[cleanKey];

  const local = getStorageLocal();
  if (local) {
    return local
      .get(cleanKey)
      .then((result) => {
        const stored = result ? result[cleanKey] : null;
        if (stored !== undefined) storageCache[cleanKey] = stored;
        const finalVal = stored !== undefined ? stored : (val ?? null);
        if (typeof callback === 'function') callback(null, finalVal);
        return finalVal;
      })
      .catch((err) => {
        console.warn('getStorage error:', err);
        if (typeof callback === 'function') callback(err, val ?? null);
        return val ?? null;
      });
  }

  if (typeof callback === 'function') callback(null, val ?? null);
  return Promise.resolve(val ?? null);
}

function getSync(name) {
  const cleanKey = sanitizeKey(name);
  if (!cleanKey) return null;
  const settings = memoryWorldCache[getCurrentWorld()];
  if (settings) {
    if (name === 'hiddenInvestments')
      return settings.caches?.hiddenInvestments || [];
    if (name === 'investSettings' || name === 'showOptions')
      return settings.showOptions || {};
    if (name === 'donation') return settings.donation || {};
    if (name === 'url') return settings.webhooks || {};
    if (name === 'toolOptions') return settings.toolOptions || {};
    if (settings[name] !== undefined) return settings[name];
  }
  return storageCache[cleanKey] !== undefined ? storageCache[cleanKey] : null;
}

function removeStorage(name) {
  const cleanKey = sanitizeKey(name);
  if (!cleanKey) return;
  delete storageCache[cleanKey];
  const local = getStorageLocal();
  if (local) {
    local
      .remove(cleanKey)
      .catch((err) => console.warn('removeStorage error:', err));
  }
}

async function initStorage() {
  await initWorldStorage();
}

function _clearMemoryCacheForTesting() {
  for (const k in storageCache) delete storageCache[k];
  _clearWorldCache();
}

module.exports = {
  isPlayableWorld,
  sanitizeWorldId,
  getWorldKey,
  setWorld,
  getCurrentWorld,
  initStorage,
  initWorldStorage,
  onWorldSettingsChange,
  getWorldSettings,
  saveWorldSettings,
  resetWorldSettings,
  getGlobalSettings,
  registerKnownWorld,
  setLastActiveWorld,
  set: setStorage,
  get: getStorage,
  getSync,
  remove: removeStorage,
  updateCache,
  sanitizeKey,
  _clearMemoryCacheForTesting,
};
module.exports.default = module.exports;
