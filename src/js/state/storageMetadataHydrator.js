/**
 * storageMetadataHydrator.js
 *
 * Handles hydration and cache synchronization for definition tables,
 * lookup registries, and city entities from browser storage.
 * Decoupled from storageListener.js.
 */

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

const logger = createLogger('StorageMetadataHydrator');

/**
 * Hydrates definition lookups and auxiliary caches.
 *
 * @param {string} key - Storage key
 * @param {*} value - Storage value
 * @param {Object} deps - Resolved dependencies
 * @param {Object} [metadataStore] - Metadata store reference
 * @returns {boolean} True if the key was handled as a lookup/definition
 */
function hydrateLookupDefinitions(key, value, deps = {}, metadataStore = null) {
  if (!value || typeof value !== 'object') return false;

  switch (key) {
    case 'ResourceDefs':
      deps.setResourceDefs?.(value);
      return true;

    case 'BuildingEntityLookup':
      if (deps.BuildingEntityLookup) {
        Object.assign(deps.BuildingEntityLookup, value);
      }
      if (metadataStore?.registerLookupUrl) {
        for (const [id, url] of Object.entries(value)) {
          metadataStore.registerLookupUrl(id, url);
        }
      }
      logger.debug(
        'BuildingEntityLookup loaded from storage:',
        deps.BuildingEntityLookup ?
          Object.keys(deps.BuildingEntityLookup).length
        : 0,
      );
      return true;

    case 'AllyDefs':
      if (deps.AllyDefs) {
        Object.assign(deps.AllyDefs, value);
      }
      return true;

    case 'ResearchDefs':
      if (deps.ResearchDefs) {
        Object.assign(deps.ResearchDefs, value);
      }
      return true;

    case 'MilitaryDefs':
      if (deps.MilitaryDefs) {
        Object.assign(deps.MilitaryDefs, value);
      }
      return true;

    case 'MetaIds':
      if (deps.MetaIds) {
        Object.assign(deps.MetaIds, value);
      }
      return true;

    case 'playerNameCache':
      if (deps.playerNameCache) {
        Object.assign(deps.playerNameCache, value);
      }
      return true;

    default:
      return false;
  }
}

/**
 * Hydrates city entity definitions from storage snapshot (Pass 2) and resolves pending startup.
 *
 * @param {Object} result - Storage key/value snapshot
 * @param {Object} deps - Resolved dependencies
 */
function hydrateCityEntitiesFromSnapshot(result, deps = {}) {
  if (!result || typeof result !== 'object') return;

  const persistentMeta = result['metadata:cityEntities'];
  const hasPersistentEntities =
    persistentMeta?.entries && typeof persistentMeta.entries === 'object';
  const hasCityEntityDefs =
    result.CityEntityDefs && typeof result.CityEntityDefs === 'object';

  if (!hasCityEntityDefs && !hasPersistentEntities) return;

  if (hasCityEntityDefs) {
    deps.processMetadataData?.(result.CityEntityDefs);
  }
  if (hasPersistentEntities) {
    const entityList = [];
    for (const entry of Object.values(persistentMeta.entries)) {
      if (entry?.data) {
        entityList.push(entry.data);
      }
    }
    if (entityList.length > 0) {
      deps.processMetadataData?.(entityList);
    }
  }

  deps.setMetadataLoaded?.(true);
  logger.debug('City entities loaded from storage:', {
    fromDefs: hasCityEntityDefs ? Object.keys(result.CityEntityDefs).length : 0,
    fromPersistent:
      hasPersistentEntities ? Object.keys(persistentMeta.entries).length : 0,
  });

  const lastStartupMsg =
    deps.getLastStartupMsg?.() || deps.getServiceLastStartupMsg?.();
  const targetMapEntities = lastStartupMsg?.responseData?.city_map?.entities;
  if (targetMapEntities) {
    deps.resolveMissingCityEntitiesFromMap?.(targetMapEntities);
  }

  const pendingStartupMsg = deps.getPendingStartupMsg?.();
  const startupMsgToProcess = pendingStartupMsg || lastStartupMsg;
  if (startupMsgToProcess) {
    deps.setLastStartupMsg?.(startupMsgToProcess);
    deps.startupService?.(startupMsgToProcess);
    if (pendingStartupMsg) {
      deps.setPendingStartupMsg?.(null);
    }
    deps.renderLiveCityStats?.();
  }
}

/**
 * Hydrates city entities when triggered by a live storage change event.
 *
 * @param {string} key - Changed storage key
 * @param {*} newValue - New storage value
 * @param {Object} deps - Resolved dependencies
 * @returns {boolean} True if the key was a city entity change
 */
function hydrateCityEntitiesFromChange(key, newValue, deps = {}) {
  if (key === 'CityEntityDefs') {
    if (newValue && typeof newValue === 'object') {
      deps.processMetadataData?.(newValue);
      deps.setMetadataLoaded?.(true);
      const lastStartupMsg =
        deps.getLastStartupMsg?.() || deps.getServiceLastStartupMsg?.();
      if (lastStartupMsg) {
        deps.startupService?.(lastStartupMsg);
      }
      return true;
    }
  } else if (key === 'metadata:cityEntities') {
    if (newValue?.entries && typeof newValue.entries === 'object') {
      const entityList = [];
      for (const entry of Object.values(newValue.entries)) {
        if (entry?.data) entityList.push(entry.data);
      }
      if (entityList.length > 0) {
        deps.processMetadataData?.(entityList);
      }
      deps.setMetadataLoaded?.(true);
      const lastStartupMsg =
        deps.getLastStartupMsg?.() || deps.getServiceLastStartupMsg?.();
      if (lastStartupMsg) {
        deps.startupService?.(lastStartupMsg);
      }
      return true;
    }
  }
  return false;
}

module.exports = {
  hydrateLookupDefinitions,
  hydrateCityEntitiesFromSnapshot,
  hydrateCityEntitiesFromChange,
};
module.exports.default = module.exports;
