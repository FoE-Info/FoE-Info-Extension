/**
 * entityResolver.js
 *
 * Entity lookup, alias normalization, deep comparison, and cache-miss diagnostics
 * for Forge of Empires building and city entity metadata.
 */

let logger = null;
let isDebugEnabled = () => false;
try {
  const logging = require('../utils/logger.js');
  logger = logging.createLogger('entityResolver');
  isDebugEnabled = logging.isDebugEnabled;
} catch {}

function isEntityEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    const valA = a[key];
    const valB = b[key];
    if (valA === valB) continue;
    if (
      typeof valA === 'object' &&
      typeof valB === 'object' &&
      valA !== null &&
      valB !== null
    ) {
      if (JSON.stringify(valA) !== JSON.stringify(valB)) return false;
    } else {
      return false;
    }
  }
  return true;
}

function indexEntityAliases(entitiesMap, entity) {
  if (!entitiesMap || !entity || !entity.id) return;

  entitiesMap.set(entity.id, entity);

  if (entity.asset_id) {
    entitiesMap.set(entity.asset_id, entity);
  }

  // Index sub-levels if present
  if (Array.isArray(entity.entity_levels)) {
    entity.entity_levels.forEach((lvl) => {
      if (lvl && lvl.id) {
        const merged = { ...entity, ...lvl, name: lvl.name || entity.name };
        entitiesMap.set(lvl.id, merged);
        if (lvl.asset_id) entitiesMap.set(lvl.asset_id, merged);
      }
    });
  }

  // Strip building_entity_ prefix alias and register cleanId variants
  if (typeof entity.id === 'string') {
    const rawEntityId = entity.id.replace(/^building_entity_/, '');
    entitiesMap.set(rawEntityId, entity);

    const cleanId = rawEntityId
      .replace(/^(W_|R_|X_|L_|D_|B_|M_|S_|P_|G_|Q_)/, '')
      .replace(/^(MultiAge_|AllAge_)/, '');
    if (cleanId) {
      if (!entitiesMap.has(cleanId)) entitiesMap.set(cleanId, entity);
      if (!entitiesMap.has(`building_entity_${cleanId}`))
        entitiesMap.set(`building_entity_${cleanId}`, entity);
      if (!entitiesMap.has(`W_MultiAge_${cleanId}`))
        entitiesMap.set(`W_MultiAge_${cleanId}`, entity);
      if (!entitiesMap.has(`R_MultiAge_${cleanId}`))
        entitiesMap.set(`R_MultiAge_${cleanId}`, entity);
      if (!entitiesMap.has(`M_MultiAge_${cleanId}`))
        entitiesMap.set(`M_MultiAge_${cleanId}`, entity);
      if (!entitiesMap.has(`M_AllAge_${cleanId}`))
        entitiesMap.set(`M_AllAge_${cleanId}`, entity);
    }
  }
}

function peekEntity(entitiesMap, id) {
  if (!entitiesMap || !id) return null;
  let found =
    entitiesMap.get(id) ||
    entitiesMap.get(`building_entity_${id}`) ||
    entitiesMap.get(String(id).replace(/^building_entity_/, '')) ||
    null;

  if (!found && typeof id === 'string') {
    const cleanId = id
      .replace(/^building_entity_/, '')
      .replace(/^(W_|R_|X_|L_|D_|B_|M_|S_|P_|G_|Q_)/, '')
      .replace(/^(MultiAge_|AllAge_)/, '');
    if (cleanId) {
      found =
        entitiesMap.get(cleanId) ||
        entitiesMap.get(`W_MultiAge_${cleanId}`) ||
        entitiesMap.get(`R_MultiAge_${cleanId}`) ||
        entitiesMap.get(`M_MultiAge_${cleanId}`) ||
        entitiesMap.get(`M_AllAge_${cleanId}`) ||
        null;
    }
  }
  return found;
}

function reportEntityLookup(reportedMissesSet, id, found) {
  if (!id) return;
  if (found) {
    reportedMissesSet?.delete(id);
  } else if (isDebugEnabled() && !reportedMissesSet?.has(id)) {
    // Bound diagnostic bookkeeping; this never caches a lookup result.
    if (reportedMissesSet && reportedMissesSet.size >= 4096) {
      reportedMissesSet.delete(reportedMissesSet.values().next().value);
    }
    reportedMissesSet?.add(id);
    logger?.debug('Cache miss for entity:', id);
  }
}

module.exports = {
  isEntityEqual,
  indexEntityAliases,
  peekEntity,
  reportEntityLookup,
};
