/**
 * entityDefsCache.js
 *
 * Manages CityEntityDefs caching, dirty state tracking, and debounced flushing to extension storage.
 * Decoupled from index.js orchestrator.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('EntityDefsCache');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

let defaultStorage = null;
try {
  defaultStorage = require('../fn/storage.js');
} catch {}

let defaultMetadataService = null;
try {
  defaultMetadataService = require('../msg/MetadataService.js');
} catch {}

let defaultHelper = null;
try {
  defaultHelper = require('../fn/helper.js');
} catch {}

let saveTimer = null;
let rerunTimer = null;
let isDirty = false;

function markCityEntityDefsDirty() {
  isDirty = true;
  logger.debug('CityEntityDefs marked dirty');
}

function isCityEntityDefsDirty() {
  return isDirty;
}

function setCityEntityDefsDirty(value) {
  isDirty = !!value;
}

function flushCityEntityDefs(options = {}) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!isDirty) return false;
  isDirty = false;

  const storageMod = options.storage || defaultStorage;
  const defs =
    options.CityEntityDefs ||
    (typeof globalThis !== 'undefined' && globalThis.CityEntityDefs ?
      globalThis.CityEntityDefs
    : null);

  if (
    storageMod &&
    typeof storageMod.set === 'function' &&
    defs &&
    Object.keys(defs).length > 0
  ) {
    logger.debug('Flushing CityEntityDefs to storage', {
      entityCount: Object.keys(defs).length,
    });
    storageMod.set('CityEntityDefs', defs);
    return true;
  }
  return false;
}

function saveCityEntityDefsDebounced(options = {}) {
  isDirty = true;
  if (saveTimer) clearTimeout(saveTimer);
  const delay = options.delayMs || 5000;
  saveTimer = setTimeout(() => {
    flushCityEntityDefs(options);
  }, delay);
}

function scheduleStartupRerun(msg, options = {}) {
  if (!msg) return;
  if (rerunTimer) clearTimeout(rerunTimer);
  const delay = options.delayMs || 1000;
  const rerunFn = options.startupService;
  rerunTimer = setTimeout(() => {
    rerunTimer = null;
    if (typeof rerunFn === 'function') {
      logger.debug('Executing scheduled startup rerun');
      rerunFn(msg);
    }
  }, delay);
}

async function resolveMissingCityEntities(ids, options = {}) {
  const metaService = options.metadataService || defaultMetadataService;
  if (
    !metaService ||
    typeof metaService.resolveMissingCityEntities !== 'function'
  )
    return;

  return metaService.resolveMissingCityEntities(ids, () => {
    saveCityEntityDefsDebounced(options);
    const targetMsg = options.lastStartupMsg;
    if (targetMsg) {
      scheduleStartupRerun(targetMsg, options);
    } else if (typeof options.renderLiveCityStats === 'function') {
      options.renderLiveCityStats();
    }
  });
}

function resolveMissingCityEntitiesFromMap(mapEntities, options = {}) {
  if (!mapEntities || !Array.isArray(mapEntities)) return;
  const help = options.helper || defaultHelper;
  if (!help || typeof help.getCityEntityDef !== 'function') return;

  const missing = mapEntities
    .map((e) => e && e.cityentity_id)
    .filter((cid) => cid && !help.getCityEntityDef(cid));

  if (missing.length > 0) {
    logger.debug('Found missing city entities in map', {
      missingCount: missing.length,
      sample: missing.slice(0, 5),
    });
    resolveMissingCityEntities(missing, options);
  }
}

function initEntityDefsUnloadHandler(
  windowObj = typeof window !== 'undefined' ? window : null,
  options = {},
) {
  if (windowObj && typeof windowObj.addEventListener === 'function') {
    windowObj.addEventListener('beforeunload', () => {
      if (isDirty || saveTimer) {
        flushCityEntityDefs(options);
      }
    });
    return true;
  }
  return false;
}

module.exports = {
  markCityEntityDefsDirty,
  isCityEntityDefsDirty,
  setCityEntityDefsDirty,
  flushCityEntityDefs,
  saveCityEntityDefsDebounced,
  scheduleStartupRerun,
  resolveMissingCityEntities,
  resolveMissingCityEntitiesFromMap,
  initEntityDefsUnloadHandler,
};
module.exports.default = module.exports;
