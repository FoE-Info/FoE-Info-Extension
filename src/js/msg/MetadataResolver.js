/**
 * MetadataResolver.js
 *
 * Remote CDN metadata resolution for missing entities and unit types.
 */

const { metadataStore } = require('../state/MetadataStore.js');

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('MetadataResolver');
} catch {}

const fetchedMetadataUrls = new Set();
const pendingMetadataUrls = new Map();
const PERSISTENT_METADATA_KEY = 'metadata:cityEntities';
const PERSISTENT_METADATA_VERSION = 1;
const PERSISTENT_METADATA_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
let persistentMetadataCache = null;
let persistentMetadataStorage = null;

function getMetadataStorage() {
  if (typeof chrome !== 'undefined' && chrome?.storage?.local)
    return chrome.storage.local;
  if (typeof browser !== 'undefined' && browser?.storage?.local)
    return browser.storage.local;
  return null;
}

async function loadPersistentMetadata() {
  const storage = getMetadataStorage();
  if (!storage?.get) return {};
  if (persistentMetadataCache && persistentMetadataStorage === storage)
    return persistentMetadataCache;
  try {
    const result = await storage.get(PERSISTENT_METADATA_KEY);
    const stored = result?.[PERSISTENT_METADATA_KEY];
    persistentMetadataStorage = storage;
    persistentMetadataCache =
      stored?.version === PERSISTENT_METADATA_VERSION ?
        stored.entries || {}
      : {};
  } catch (error) {
    logger?.warn('Failed to load persistent metadata cache:', error);
    persistentMetadataStorage = storage;
    persistentMetadataCache = {};
  }
  return persistentMetadataCache;
}

async function persistMetadataBatch(entries) {
  const storage = getMetadataStorage();
  if (!storage?.set || !entries || Object.keys(entries).length === 0) return;
  const cache = await loadPersistentMetadata();
  Object.assign(cache, entries);
  try {
    await storage.set({
      [PERSISTENT_METADATA_KEY]: {
        version: PERSISTENT_METADATA_VERSION,
        entries: cache,
      },
    });
  } catch (error) {
    logger?.warn('Failed to persist metadata cache:', error);
  }
}

function getCachedMetadata(cache, id) {
  const entry = cache?.[id];
  if (!entry?.data) return null;
  if (
    !entry.fetchedAt ||
    Date.now() - entry.fetchedAt > PERSISTENT_METADATA_MAX_AGE
  )
    return null;
  return entry.data;
}

function shareDownload(url, download) {
  if (pendingMetadataUrls.has(url)) return pendingMetadataUrls.get(url);
  const pending = download()
    .then((loaded) => {
      if (loaded) fetchedMetadataUrls.add(url);
      return loaded;
    })
    .finally(() => pendingMetadataUrls.delete(url));
  pendingMetadataUrls.set(url, pending);
  return pending;
}

function getCandidateEntityLookupKeys(rawId) {
  if (!rawId) return [];
  const strId = String(rawId);
  const cleanId = strId
    .replace(/^building_entity_/, '')
    .replace(/^(W_|R_|X_|L_|D_|B_|M_|S_|P_|G_|Q_)/, '')
    .replace(/^(MultiAge_|AllAge_)/, '');

  return [
    strId,
    `building_entity_${strId}`,
    cleanId,
    `building_entity_${cleanId}`,
    `W_MultiAge_${cleanId}`,
    `building_entity_W_MultiAge_${cleanId}`,
    `R_MultiAge_${cleanId}`,
    `building_entity_R_MultiAge_${cleanId}`,
    `M_AllAge_${cleanId}`,
    `building_entity_M_AllAge_${cleanId}`,
    `M_MultiAge_${cleanId}`,
    `building_entity_M_MultiAge_${cleanId}`,
  ];
}

async function resolveMissingCityEntities(
  ids,
  onUpdate,
  BuildingEntityLookup,
  CityEntityDefs,
  processMetadataData,
) {
  if (!ids || ids.length === 0) return;
  const uniqueIds = [...new Set(ids)];
  const toFetch = [];
  const newlyFetched = {};
  const persistentCache = await loadPersistentMetadata();
  let cacheLoaded = false;
  let anyNewlyExisting = false;

  for (const rawId of uniqueIds) {
    if (!rawId) continue;
    const existing = CityEntityDefs[rawId] || metadataStore.getEntity(rawId);
    if (existing) {
      anyNewlyExisting = true;
      continue;
    }

    const cached = getCachedMetadata(persistentCache, rawId);
    if (cached) {
      processMetadataData(cached);
      cacheLoaded = true;
      continue;
    }

    let foundUrl =
      BuildingEntityLookup[rawId] ||
      BuildingEntityLookup[`building_entity_${rawId}`] ||
      (metadataStore &&
        typeof metadataStore.getLookupUrl === 'function' &&
        metadataStore.getLookupUrl(rawId)) ||
      null;

    if (!foundUrl) {
      const candidates = getCandidateEntityLookupKeys(rawId);
      for (const k of candidates) {
        if (BuildingEntityLookup[k]) {
          foundUrl = BuildingEntityLookup[k];
          break;
        }
      }
    }

    if (foundUrl && !fetchedMetadataUrls.has(foundUrl)) {
      toFetch.push({ id: String(rawId), url: foundUrl });
    }
  }

  if (toFetch.length === 0) {
    if (anyNewlyExisting && typeof onUpdate === 'function') onUpdate();
    return;
  }

  logger?.info(
    `[TIMING:P5] resolveMissingCityEntities start | t = ${performance.now().toFixed(2)}ms | itemsToFetch = ${toFetch.length}`,
  );

  const results = await Promise.allSettled(
    toFetch.map((item) =>
      shareDownload(item.url, async () => {
        const fetchStart = performance.now();
        logger?.info(
          `[TIMING:P5] CDN fetch START for ${item.id} | t = ${fetchStart.toFixed(2)}ms | url = ${item.url}`,
        );
        try {
          const res = await fetch(item.url);
          const fetchEnd = performance.now();
          const dur = (fetchEnd - fetchStart).toFixed(2);
          if (res.ok) {
            const json = await res.json();
            if (json) {
              if (!json.id) json.id = item.id;
              processMetadataData(json);
              newlyFetched[item.id] = { fetchedAt: Date.now(), data: json };
              logger?.info(
                `[TIMING:P5] CDN fetch SUCCESS for ${item.id} | duration = ${dur}ms | t = ${fetchEnd.toFixed(2)}ms`,
              );
              return true;
            }
          }
          logger?.warn(
            `[TIMING:P5] CDN fetch FAIL(${res.status}) for ${item.id} | duration = ${dur}ms | t = ${fetchEnd.toFixed(2)}ms`,
          );
        } catch (e) {
          const fetchEnd = performance.now();
          const dur = (fetchEnd - fetchStart).toFixed(2);
          logger?.warn(
            `[TIMING:P5] CDN fetch ERROR for ${item.id} | duration = ${dur}ms | t = ${fetchEnd.toFixed(2)}ms:`,
            e,
          );
        }
        return false;
      }),
    ),
  );

  const anyLoaded = results.some(
    (r) => r.status === 'fulfilled' && r.value === true,
  );
  const resolvedCount = results.filter(
    (r) => r.status === 'fulfilled' && r.value === true,
  ).length;
  logger?.info(
    `[TIMING:P5] resolveMissingCityEntities finish | itemsIn = ${toFetch.length} | itemsResolved = ${resolvedCount}`,
  );
  await persistMetadataBatch(newlyFetched);
  if (
    (anyLoaded || cacheLoaded || anyNewlyExisting) &&
    typeof onUpdate === 'function'
  ) {
    onUpdate();
  }
}

async function resolveMissingUnitTypes(
  onUpdate,
  BuildingEntityLookup,
  processMetadataData,
) {
  const unitUrl =
    BuildingEntityLookup['unit_types'] ||
    BuildingEntityLookup['building_entity_unit_types'];
  if (!unitUrl || fetchedMetadataUrls.has(unitUrl)) return false;
  const loaded = await shareDownload(unitUrl, async () => {
    try {
      // Unit-type metadata is non-critical enrichment; fetch it at low
      // priority so it never competes with critical startup CDN fetches.
      const res = await fetch(unitUrl, { priority: 'low' });
      if (res.ok) {
        const json = await res.json();
        if (json) {
          processMetadataData(json);
          return true;
        }
      }
    } catch (e) {
      logger?.warn('Failed to fetch unit_types metadata:', unitUrl, e);
    }
    return false;
  });
  if (loaded && typeof onUpdate === 'function') onUpdate();
  return loaded;
}

function getEntityId(id) {
  if (id === null || id === undefined) return null;
  if (typeof id === 'string' || typeof id === 'number') return id;
  if (typeof id === 'object') {
    return id.value || id.id || id.identifier || null;
  }
  return null;
}

function processCityEntity(msg, id, name, CityEntityDefs) {
  if (!id) return;
  const resolvedName = name || msg.name || msg.title || null;
  const normalizedEntry = { ...msg, name: resolvedName };
  CityEntityDefs[id] = normalizedEntry;
  if (msg.asset_id) CityEntityDefs[msg.asset_id] = normalizedEntry;

  if (Array.isArray(msg.entity_levels)) {
    msg.entity_levels.forEach((lvl) => {
      if (lvl && lvl.id) {
        CityEntityDefs[lvl.id] = { ...lvl, name: lvl.name || resolvedName };
        if (lvl.asset_id) CityEntityDefs[lvl.asset_id] = CityEntityDefs[lvl.id];
      }
    });
  }

  if (typeof id === 'string') {
    const rawEntityId = id.replace(/^building_entity_/, '');
    CityEntityDefs[rawEntityId] = normalizedEntry;
    CityEntityDefs[`building_entity_${rawEntityId}`] = normalizedEntry;

    const cleanId = rawEntityId
      .replace(/^(W_|R_|X_|L_|D_|B_|M_|S_|P_|G_|Q_)/, '')
      .replace(/^(MultiAge_|AllAge_)/, '');
    if (cleanId) {
      CityEntityDefs[cleanId] = normalizedEntry;
      CityEntityDefs[`building_entity_${cleanId}`] = normalizedEntry;
      CityEntityDefs[`W_MultiAge_${cleanId}`] = normalizedEntry;
      CityEntityDefs[`R_MultiAge_${cleanId}`] = normalizedEntry;
      CityEntityDefs[`M_MultiAge_${cleanId}`] = normalizedEntry;
      CityEntityDefs[`M_AllAge_${cleanId}`] = normalizedEntry;
    }
  }
  metadataStore.registerEntity(normalizedEntry);
}

module.exports = {
  fetchedMetadataUrls,
  getEntityId,
  getCandidateEntityLookupKeys,
  processCityEntity,
  resolveMissingCityEntities,
  resolveMissingUnitTypes,
};
