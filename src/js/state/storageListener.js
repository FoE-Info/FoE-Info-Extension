/**
 * storageListener.js
 *
 * Handles browser.storage.onChanged events and processes initial storage snapshots
 * for options, donation settings, metadata definitions, and cache synchronization.
 * Decoupled from index.js monolith.
 */

let defaultStorage;
try {
  defaultStorage = require('../utils/storage.js');
} catch {}

let metadataStore = null;
try {
  metadataStore = require('./MetadataStore.js').metadataStore;
} catch {}

let createLogger;
try {
  createLogger = require('../utils/logger.js').createLogger;
} catch {
  createLogger = () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  });
}

const {
  applyWorldConfig,
  applyGlobalSettings,
  applyLegacyWorldFallbacks,
  applyDebugEnabled,
} = require('./storageWorldSettings.js');

const {
  hydrateLookupDefinitions,
  hydrateCityEntitiesFromSnapshot,
  hydrateCityEntitiesFromChange,
} = require('./storageMetadataHydrator.js');

const logger = createLogger('StorageListener');

let activeListener = null;
let registeredDeps = {};

function resolveDeps(deps = {}) {
  return {
    ...registeredDeps,
    ...deps,
  };
}

/**
 * Handles storage changes fired by browser.storage.onChanged.
 *
 * @param {Object} changes - Storage change dictionary { key: { oldValue, newValue } }
 * @param {string} namespace - Storage namespace (e.g. 'local', 'sync')
 * @param {Object} [deps] - Injected dependencies
 */
function handleStorageChange(changes, namespace, deps = {}) {
  if (!changes || typeof changes !== 'object') return;
  const resolved = resolveDeps(deps);
  const storage = resolved.storage || defaultStorage;
  const currentWorld = storage?.getCurrentWorld?.();

  for (const [key, storageChange] of Object.entries(changes)) {
    if (!storageChange) continue;
    const newValue = storageChange.newValue;

    if (key.startsWith('world:')) {
      const changedWorld = key.slice(6);
      if (changedWorld === currentWorld && newValue) {
        applyWorldConfig(newValue, resolved);
      }
    } else if (key === 'tool') {
      if (newValue?.language) {
        resolved.setLanguage?.(newValue.language);
        logger.debug('Language changed:', newValue.language);
      }
    } else if (key === 'global:settings') {
      applyGlobalSettings(newValue, resolved, resolved.browser);
    } else if (key === 'timeFormatting') {
      if (newValue) {
        try {
          const { setTimeFormattingConfig } = require('../utils/date.js');
          setTimeFormattingConfig(newValue);
        } catch {}
      }
    } else if (key === 'debugEnabled') {
      applyDebugEnabled(newValue);
    } else if (
      hydrateLookupDefinitions(key, newValue, resolved, metadataStore)
    ) {
      // Lookup definitions (BuildingEntityLookup, AllyDefs, etc.)
    } else if (hydrateCityEntitiesFromChange(key, newValue, resolved)) {
      // CityEntityDefs or metadata:cityEntities
    } else {
      applyLegacyWorldFallbacks(key, newValue, resolved);
    }
  }
}

/**
 * Handles the initial full storage snapshot retrieved via browser.storage.local.get.
 *
 * @param {Object} result - Storage key/value dictionary
 * @param {Object} [deps] - Injected dependencies
 */
function handleReceiveStorage(result, deps = {}) {
  if (!result || typeof result !== 'object') return;
  logger.debug('result', result);

  const resolved = resolveDeps(deps);
  const storage = resolved.storage || defaultStorage;
  storage?.updateCache?.(result);

  if (typeof result.debugEnabled === 'boolean') {
    applyDebugEnabled(result.debugEnabled);
  }

  const globalSettings = result['global:settings'];
  const effectiveGlobal = {
    ...globalSettings,
    timeFormatting: globalSettings?.timeFormatting || result.timeFormatting,
  };
  applyGlobalSettings(effectiveGlobal, resolved, resolved.browser);

  const currentWorld = storage?.getCurrentWorld?.();
  const curWorldData = currentWorld ? result['world:' + currentWorld] : null;

  if (curWorldData) {
    applyWorldConfig(curWorldData, resolved);
  }

  // Pass 1: Process lookups, definitions, and settings first
  for (const [key, value] of Object.entries(result)) {
    if (key === 'CityEntityDefs' || key === 'metadata:cityEntities') continue;

    if (key === 'tool') {
      if (value?.language && value.language !== 'auto') {
        resolved.setLanguage?.(value.language);
        logger.debug('Initial language:', value.language);
      }
    } else if (hydrateLookupDefinitions(key, value, resolved, metadataStore)) {
      // Handled definition lookup
    } else if (!curWorldData) {
      applyLegacyWorldFallbacks(key, value, resolved);
    } else {
      logger.debug(key, value);
    }
  }

  // Pass 2: Process CityEntityDefs and metadata:cityEntities after lookups and definitions
  hydrateCityEntitiesFromSnapshot(result, resolved);
}

/**
 * Wires browser.storage.onChanged listener with registered dependencies.
 *
 * @param {Object} [deps] - Injected dependencies
 * @returns {Function|null} The registered listener callback, or null if storage API unavailable
 */
function initStorageListeners(deps = {}) {
  registeredDeps = { ...registeredDeps, ...deps };
  const b =
    deps.browser ||
    (typeof browser !== 'undefined' ? browser
    : typeof chrome !== 'undefined' ? chrome
    : null);

  if (b?.storage?.onChanged?.addListener) {
    if (activeListener && b?.storage?.onChanged?.removeListener) {
      try {
        b.storage.onChanged.removeListener(activeListener);
      } catch {}
    }
    activeListener = (changes, namespace) =>
      handleStorageChange(changes, namespace, registeredDeps);
    b.storage.onChanged.addListener(activeListener);
    return activeListener;
  }
  return null;
}

module.exports = {
  handleStorageChange,
  handleReceiveStorage,
  initStorageListeners,
};
module.exports.default = module.exports;
