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
  redactWorldData,
} = require('./storageWorldSettings.js');

let worldStorageModule = {};
try {
  worldStorageModule = require('../utils/worldStorage.js');
} catch {}
const parseWorldKey = worldStorageModule.parseWorldKey || (() => null);
const WORLD_FIELDS = worldStorageModule.WORLD_FIELDS || [
  'showOptions',
  'donation',
  'webhooks',
  'toolOptions',
  'caches',
  'collapses',
];

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

  // Collect world-scoped events first: per-field keys are authoritative, so
  // a whole-object ('world:<id>') event is applied only when no per-field
  // event for the same world is present in the same batch.
  const worldEvents = new Map();

  for (const [key, storageChange] of Object.entries(changes)) {
    if (!storageChange) continue;
    const newValue = storageChange.newValue;

    if (key.startsWith('world:')) {
      const parsed = parseWorldKey(key);
      if (!parsed) continue;
      let entry = worldEvents.get(parsed.worldId);
      if (!entry) {
        entry = { fields: new Map(), blob: null };
        worldEvents.set(parsed.worldId, entry);
      }
      if (parsed.field) entry.fields.set(parsed.field, newValue);
      else entry.blob = newValue;
      continue;
    }

    if (key === 'tool') {
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

  for (const [changedWorld, entry] of worldEvents) {
    if (changedWorld !== currentWorld) continue;
    if (entry.fields.size > 0) {
      applyWorldConfig(Object.fromEntries(entry.fields), resolved);
    } else if (entry.blob) {
      applyWorldConfig(entry.blob, resolved);
    }
  }
}

/**
 * Builds the current world's settings from a full storage snapshot: the
 * whole-object key ('world:<id>') overlaid with the authoritative per-field
 * keys ('world:<id>:<field>') when present.
 */
function buildWorldSnapshotData(result, currentWorld) {
  if (!currentWorld) return null;
  const blob = result['world:' + currentWorld];
  const blobObject = blob && typeof blob === 'object' ? { ...blob } : null;
  const base = blobObject || {};
  let hasFieldData = false;
  for (const field of WORLD_FIELDS) {
    const value = result[`world:${currentWorld}:${field}`];
    if (value !== undefined) {
      base[field] = value;
      hasFieldData = true;
    }
  }
  if (!blobObject && !hasFieldData) return null;
  return base;
}

/**
 * Handles the initial full storage snapshot retrieved via browser.storage.local.get.
 *
 * @param {Object} result - Storage key/value dictionary
 * @param {Object} [deps] - Injected dependencies
 */
function handleReceiveStorage(result, deps = {}) {
  if (!result || typeof result !== 'object') return;
  logger.debug('result', redactWorldData(result));

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
  const curWorldData = buildWorldSnapshotData(result, currentWorld);

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
    } else if (typeof value === 'object' && value !== null) {
      // Redacted: world-shaped objects can carry webhook credentials.
      logger.debug(key, redactWorldData(value));
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
