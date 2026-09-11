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
        const newWorld = newValue;
        if (newWorld.showOptions) {
          resolved.setOptions?.('showOptions', newWorld.showOptions);
          resolved.applyCardVisibility?.();
        }
        if (newWorld.donation) {
          resolved.setDonationPercent?.(newWorld.donation.percent);
          resolved.setCurrentPercent?.(newWorld.donation.percent);
          resolved.setDonationSuffix?.(newWorld.donation.suffix);
          resolved.setTargetsTopic?.(newWorld.donation.targets);
          resolved.setTargetText?.(newWorld.donation.targetText);
        }
        if (newWorld.webhooks) {
          resolved.setUrl?.(newWorld.webhooks);
        }
        if (newWorld.toolOptions) {
          resolved.setToolOptions?.(newWorld.toolOptions);
        }
        if (newWorld.collapses) {
          for (const [collapseKey, collapseValue] of Object.entries(
            newWorld.collapses,
          )) {
            resolved.collapseOptions?.(collapseKey, collapseValue);
          }
        }
      }
    } else if (key === 'tool') {
      if (newValue?.language) {
        resolved.setLanguage?.(newValue.language);
        console.debug(newValue.language);
      }
    } else if (key === 'global:settings') {
      if (newValue?.timeFormatting) {
        try {
          const { setTimeFormattingConfig } = require('../utils/date.js');
          setTimeFormattingConfig(newValue.timeFormatting);
        } catch {}
      }
      if (newValue?.language && newValue.language !== 'auto') {
        resolved.setLanguage?.(newValue.language);
      }
    } else if (key === 'timeFormatting') {
      if (newValue) {
        try {
          const { setTimeFormattingConfig } = require('../utils/date.js');
          setTimeFormattingConfig(newValue);
        } catch {}
      }
    } else if (key === 'targets') {
      resolved.setTargetsTopic?.(newValue);
    } else if (key === 'targetText') {
      resolved.setTargetText?.(newValue);
    } else if (key === 'toolOptions') {
      resolved.setToolOptions?.(newValue);
    } else if (key === 'donationPercent') {
      resolved.setDonationPercent?.(newValue);
      resolved.setCurrentPercent?.(newValue);
    } else if (key === 'donationSuffix') {
      resolved.setDonationSuffix?.(newValue);
    } else if (key === 'url') {
      resolved.setUrl?.(newValue);
    } else if (key === 'debugEnabled') {
      try {
        const { setDebugEnabled } = require('../utils/logger.js');
        setDebugEnabled(Boolean(newValue), { persist: false });
      } catch {}
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
  console.debug('result', result);

  const resolved = resolveDeps(deps);
  const storage = resolved.storage || defaultStorage;
  storage?.updateCache?.(result);

  if (typeof result.debugEnabled === 'boolean') {
    try {
      const { setDebugEnabled } = require('../utils/logger.js');
      setDebugEnabled(result.debugEnabled, { persist: false });
    } catch {}
  }

  const globalSettings = result['global:settings'];
  const timeFormatting =
    globalSettings?.timeFormatting || result.timeFormatting;
  if (timeFormatting) {
    try {
      const { setTimeFormattingConfig } = require('../utils/date.js');
      setTimeFormattingConfig(timeFormatting);
    } catch {}
  }
  if (globalSettings?.language && globalSettings.language !== 'auto') {
    resolved.setLanguage?.(globalSettings.language);
  }

  const currentWorld = storage?.getCurrentWorld?.();
  const curWorldData = currentWorld ? result['world:' + currentWorld] : null;

  if (curWorldData) {
    if (curWorldData.showOptions) {
      resolved.setOptions?.('showOptions', curWorldData.showOptions);
      resolved.applyCardVisibility?.();
    }
    if (curWorldData.donation) {
      resolved.setDonationPercent?.(curWorldData.donation.percent);
      resolved.setCurrentPercent?.(curWorldData.donation.percent);
      resolved.setDonationSuffix?.(curWorldData.donation.suffix);
      resolved.setTargetsTopic?.(curWorldData.donation.targets);
      resolved.setTargetText?.(curWorldData.donation.targetText);
    }
    if (curWorldData.webhooks) {
      resolved.setUrl?.(curWorldData.webhooks);
    }
    if (curWorldData.toolOptions) {
      resolved.setToolOptions?.(curWorldData.toolOptions);
    }
    if (curWorldData.collapses) {
      for (const [collapseKey, collapseValue] of Object.entries(
        curWorldData.collapses,
      )) {
        resolved.collapseOptions?.(collapseKey, collapseValue);
      }
    }
  }

  // Pass 1: Process lookups, definitions, and settings first
  for (const [key, value] of Object.entries(result)) {
    if (key === 'CityEntityDefs') continue;

    if (key === 'showOptions') {
      if (!curWorldData) {
        resolved.setOptions?.('showOptions', value);
        resolved.applyCardVisibility?.();
      }
    } else if (key === 'ResourceDefs') {
      resolved.setResourceDefs?.(value);
    } else if (key === 'BuildingEntityLookup') {
      if (value && resolved.BuildingEntityLookup) {
        Object.assign(resolved.BuildingEntityLookup, value);
      }
      console.debug(
        'BuildingEntityLookup loaded from storage:',
        resolved.BuildingEntityLookup ?
          Object.keys(resolved.BuildingEntityLookup).length
        : 0,
      );
    } else if (key === 'AllyDefs') {
      if (value && typeof value === 'object' && resolved.AllyDefs) {
        Object.assign(resolved.AllyDefs, value);
      }
    } else if (key === 'ResearchDefs') {
      if (value && typeof value === 'object' && resolved.ResearchDefs) {
        Object.assign(resolved.ResearchDefs, value);
      }
    } else if (key === 'MilitaryDefs') {
      if (value && typeof value === 'object' && resolved.MilitaryDefs) {
        Object.assign(resolved.MilitaryDefs, value);
      }
    } else if (key === 'MetaIds') {
      if (value && typeof value === 'object' && resolved.MetaIds) {
        Object.assign(resolved.MetaIds, value);
      }
    } else if (key === 'tool') {
      if (value && value.language && value.language !== 'auto') {
        resolved.setLanguage?.(value.language);
        console.debug(value.language);
      }
    } else if (key === 'targets') {
      if (!curWorldData) resolved.setTargetsTopic?.(value);
    } else if (key === 'targetText') {
      if (!curWorldData) resolved.setTargetText?.(value);
    } else if (key === 'toolOptions') {
      if (!curWorldData) resolved.setToolOptions?.(value);
    } else if (key === 'donationPercent') {
      if (!curWorldData) {
        resolved.setDonationPercent?.(value);
        resolved.setCurrentPercent?.(value);
      }
    } else if (key === 'donationSuffix') {
      if (!curWorldData) resolved.setDonationSuffix?.(value);
    } else if (key === 'url') {
      if (!curWorldData) resolved.setUrl?.(value);
    } else if (key === 'playerNameCache') {
      if (value && resolved.playerNameCache) {
        Object.assign(resolved.playerNameCache, value);
      }
    } else {
      console.debug(key, value);
    }
  }

  // Pass 2: Process CityEntityDefs after lookups and definitions are loaded
  if (result.CityEntityDefs) {
    const value = result.CityEntityDefs;
    if (value && typeof value === 'object') {
      resolved.processMetadataData?.(value);
    }
    resolved.setMetadataLoaded?.(true);
    console.debug('CityEntityDefs loaded from storage:', value);

    const lastStartupMsg =
      resolved.getLastStartupMsg?.() || resolved.getServiceLastStartupMsg?.();
    const targetMapEntities = lastStartupMsg?.responseData?.city_map?.entities;
    if (targetMapEntities) {
      resolved.resolveMissingCityEntitiesFromMap?.(targetMapEntities);
    }
    const pendingStartupMsg = resolved.getPendingStartupMsg?.();
    if (pendingStartupMsg) {
      resolved.setLastStartupMsg?.(pendingStartupMsg);
      resolved.startupService?.(pendingStartupMsg);
      resolved.setPendingStartupMsg?.(null);
    }
    resolved.renderLiveCityStats?.();
  }
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
