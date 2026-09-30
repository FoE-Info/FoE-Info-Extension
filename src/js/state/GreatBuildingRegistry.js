/**
 * GreatBuildingRegistry.js
 *
 * Unified registry and cache for Great Buildings across own city and other players.
 * Tracks Great Buildings from CityMapService, OtherPlayerService, StartupService,
 * and GreatBuildingsService, and calculates geometric level upgrade costs.
 */

const metadataStorePkg = require('./MetadataStore.js');
const metadataStore = metadataStorePkg.metadataStore || metadataStorePkg;
const { getGreatBuildingName } = require('../calc/utils/gbNames.js');
const BigNumber = require('bignumber.js');

/**
 * Registry capacity policy
 *
 * gbRegistry is an LRU-bounded cache: a re-registration of the same building
 * replaces its single canonical entry in place, so repeated visits never grow
 * the map, and a `world switch resets the whole cache through
 * ui/networkBridge's resetSessionState hook. The hazard this controls is
 * retention, not lookup cost.
 *
 * CAPACITY = 512 canonical entries. A realistic FoE city carries at most a few
 * hundred of its own Great Buildings (~60-120 for a maxed layout, looser with
 * extra houses), and a session only *visits* a handful of other players' GBs
 * per page load, so the practical ceiling for one world is well under 200
 * entries. 512 is therefore above anything a real player reaches with one
 * world's data (a cap below that would be a bug for a real player), and the
 * world-switch reset clears cross-world accumulation before LRU eviction is
 * ever needed.
 *
 * Eviction policy: least-recently-used, consistent with how the registry is
 * read — `getGreatBuilding` touches a record on every read, so records the UI
 * has stopped asking for are the ones evicted when the cap is hit. Each
 * eviction drops exactly one canonical entry and prunes the derived eid index
 * (which holds only key strings, never payload references), so there are no
 *orphans left behind.
 */
const CAPACITY = 512;

const gbRegistry = new Map();
/**
 * Derived, ownerless-lookup index: eid string -> Set of canonical keys.
 * This is index metadata only; the normalized payload is stored exactly once,
 * under its canonical composite key, so one logical entry costs one key.
 */
const byEid = new Map();

/** Canonicalize the owner half of a composite key so numeric and string owner
 * ids ('0' vs 0, '123' vs 123) do not fragment a logical entry. */
function ownerPart(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

function canonicalKey(pId, eId) {
  return `${ownerPart(pId)}_${ownerPart(eId)}`;
}

/** O(1) LRU bump: re-insert the key at the map tail. */
function touch(key, value) {
  gbRegistry.delete(key);
  gbRegistry.set(key, value);
  return value;
}

function unindexKey(canonical) {
  const removed = gbRegistry.get(canonical);
  const eidKey = String(removed?.id ?? canonical.split('_')[1]);
  const bucket = byEid.get(eidKey);
  if (bucket) {
    bucket.delete(canonical);
    if (bucket.size === 0) byEid.delete(eidKey);
  }
}

function evictIfNeeded() {
  while (gbRegistry.size > CAPACITY) {
    // Map iteration is insertion-ordered, so the first key is the LRU head.
    const oldest = gbRegistry.keys().next().value;
    gbRegistry.delete(oldest);
    unindexKey(oldest);
  }
}

/** Look up a record by eid alone, through the derived index. */
function pickByEid(eid, { bumpRecency = true } = {}) {
  const bucket = byEid.get(String(eid));
  if (!bucket || bucket.size === 0) return null;
  // Prefer an owner-0 record like the pre-normalization `0_${eId}` alias did.
  for (const k of bucket) {
    if (k.startsWith('0_') && gbRegistry.has(k)) {
      return bumpRecency ? touch(k, gbRegistry.get(k)) : gbRegistry.get(k);
    }
  }
  const latest = [...bucket].reverse().find((k) => gbRegistry.has(k));
  if (latest === undefined) return null;
  return bumpRecency ?
      touch(latest, gbRegistry.get(latest))
    : gbRegistry.get(latest);
}

/**
 * Calculates level cost using geometric progression from metadata definitions.
 * Formula:
 * - Level <= 10: strategy_points_for_upgrade[Level - 1]
 * - Level > 10: ROUND_CEIL(Level10Cost * 1.025^(Level - 9)), evaluated in BigNumber
 *   decimal arithmetic. This is a player-facing cost and the most
 *   precision-sensitive quantity in the game; IEEE 754 doubles are not acceptable
 *   here, so the geometric extrapolation and its rounding both go through
 *   BigNumber with an explicit ROUND_CEIL.
 *
 * @param {string|Object} cityEntityId Building definition ID or entity object
 * @param {number} level Target level (1-indexed)
 * @returns {number} Total FP required for this level
 */
function calculateLevelCost(cityEntityId, level) {
  if (!cityEntityId || level === undefined || level === null) return 0;
  const targetLevel = Number(level);
  if (targetLevel <= 0 || Number.isNaN(targetLevel)) return 0;

  const entity =
    typeof cityEntityId === 'object' && cityEntityId !== null ?
      cityEntityId
    : metadataStore.getEntity(cityEntityId);

  const upgradeCosts = entity?.strategy_points_for_upgrade;
  if (!Array.isArray(upgradeCosts) || upgradeCosts.length === 0) {
    return 0;
  }

  if (targetLevel <= 10) {
    return upgradeCosts[targetLevel - 1] || 0;
  }

  const level10Cost = upgradeCosts[9] || upgradeCosts[upgradeCosts.length - 1];
  return new BigNumber(level10Cost)
    .times(new BigNumber(1.025).pow(targetLevel - 9))
    .integerValue(BigNumber.ROUND_CEIL)
    .toNumber();
}

/**
 * Registers or updates a single Great Building in the registry.
 *
 * One logical entry is filed under exactly one canonical key
 * (`${pId}_${eId}`); re-registering the same building replaces that entry in
 * place. Ownerless lookups (`getGreatBuilding(null, eid)`) and cross-owner
 * fallbacks resolve through the derived eid index, not extra keys.
 *
 * @param {Object} entity Building entity payload
 * @param {number|string} [playerId] Owner player ID
 * @returns {Object|null} Normalized Great Building object
 */
function registerGreatBuilding(entity, playerId) {
  if (!entity || typeof entity !== 'object') return null;

  if (
    entity.type &&
    entity.type !== 'greatbuilding' &&
    !entity.cityentity_id?.includes('Landmark')
  ) {
    return null;
  }

  const pId =
    playerId !== undefined && playerId !== null ? playerId
    : entity.player_id !== undefined ? entity.player_id
    : entity.player?.player_id !== undefined ? entity.player.player_id
    : 0;

  const eId =
    entity.id !== undefined ? entity.id
    : entity.entity_id !== undefined ? entity.entity_id
    : entity.city_entity_id;

  if (eId === undefined || eId === null) return null;

  const cityEntityId =
    entity.cityentity_id ||
    entity.city_entity_id ||
    entity.cityEntityId ||
    entity.id;

  const metaDef = metadataStore.getEntity(cityEntityId);
  // Same composite key shape pre-normalization lookups used, so both write
  // and read side share one string; ownerPart keeps '0' and 0 unified.
  const canonical = canonicalKey(pId, eId);
  const existing =
    gbRegistry.get(canonical) ?? pickByEid(eId, { bumpRecency: false }) ?? {};

  const level =
    entity.level !== undefined ? Number(entity.level)
    : existing.level !== undefined ? existing.level
    : 0;

  const maxLevel =
    entity.max_level !== undefined ? Number(entity.max_level)
    : entity.maxLevel !== undefined ? Number(entity.maxLevel)
    : existing.max_level !== undefined ? existing.max_level
    : level ? level + 1
    : 0;

  const current =
    entity.state?.invested_forge_points !== undefined ?
      Number(entity.state.invested_forge_points)
    : entity.current_progress !== undefined ? Number(entity.current_progress)
    : entity.current !== undefined ? Number(entity.current)
    : existing.current !== undefined ? existing.current
    : 0;

  let total =
    entity.state?.forge_points_for_level_up !== undefined ?
      Number(entity.state.forge_points_for_level_up)
    : entity.max_progress !== undefined ? Number(entity.max_progress)
    : entity.total !== undefined ? Number(entity.total)
    : existing.total !== undefined ? existing.total
    : 0;

  if (total === 0 && level > 0 && cityEntityId) {
    total = calculateLevelCost(cityEntityId, level + 1);
  }

  const name =
    entity.name ||
    entity.player_name_gb ||
    existing.name ||
    metaDef?.name ||
    getGreatBuildingName(cityEntityId) ||
    String(cityEntityId || 'Great Building');

  const playerName =
    entity.player_name || entity.player?.name || existing.player_name || '';

  const connected =
    entity.connected !== undefined ? Boolean(entity.connected)
    : existing.connected !== undefined ? existing.connected
    : true;

  const normalized = {
    ...existing,
    id: eId,
    entity_id: eId,
    cityentity_id: cityEntityId,
    player: pId,
    player_id: pId,
    player_name: playerName,
    name,
    level,
    max_level: maxLevel,
    current,
    total,
    connected,
    raw: entity,
  };

  // Re-registering replaces the existing canonical entry in place (same key),
  // so repeated visits to a building do not grow the map.
  touch(canonical, normalized);
  const eidString = String(eId);
  let bucket = byEid.get(eidString);
  if (!bucket) {
    bucket = new Set();
    byEid.set(eidString, bucket);
  }
  bucket.add(canonical);
  // Same-record alias ids (payload 'id'/'entity_id' disagreeing with the
  // registry's own eId) join the index — but the entry itself stays one key.
  if (entity.id !== undefined && String(entity.id) !== eidString) {
    let aliasBucket = byEid.get(String(entity.id));
    if (!aliasBucket) {
      aliasBucket = new Set();
      byEid.set(String(entity.id), aliasBucket);
    }
    aliasBucket.add(canonical);
  }
  if (
    entity.entity_id !== undefined &&
    String(entity.entity_id) !== eidString &&
    String(entity.entity_id) !== String(entity.id)
  ) {
    let aliasBucket = byEid.get(String(entity.entity_id));
    if (!aliasBucket) {
      aliasBucket = new Set();
      byEid.set(String(entity.entity_id), aliasBucket);
    }
    aliasBucket.add(canonical);
  }

  evictIfNeeded();
  return normalized;
}

/**
 * Registers multiple Great Buildings in batch.
 *
 * @param {Array<Object>} entities List of building entities
 * @param {number|string} [playerId] Owner player ID
 * @returns {Array<Object>} Registered Great Buildings
 */
function registerGreatBuildings(entities, playerId) {
  if (!Array.isArray(entities)) return [];
  const registered = [];
  for (const entity of entities) {
    const gb = registerGreatBuilding(entity, playerId);
    if (gb) registered.push(gb);
  }
  return registered;
}

/**
 * Retrieves a Great Building from the registry.
 *
 * Lookup priority mirrors the pre-normalization alias chain:
 *   1. `${playerId}_${entityId}` direct hit
 *   2. derived eid index (prefers an owner-0 record, then the most recent)
 *   3. pre-existing oddity: entityId omitted but playerId present probes the
 *      eid index under String(playerId) — that was reachable before via an
 *      aligned `String(entity.id)` alias key.
 * A found record is bumped to the LRU tail, keeping eviction consistent with
 * reads.
 *
 * @param {number|string} [playerId] Owner player ID
 * @param {number|string} entityId Building entity ID
 * @returns {Object|null} Great Building object or null
 */
function getGreatBuilding(playerId, entityId) {
  if (
    playerId !== undefined &&
    playerId !== null &&
    entityId !== undefined &&
    entityId !== null
  ) {
    const compositeKey = canonicalKey(playerId, entityId);
    if (gbRegistry.has(compositeKey)) {
      return touch(compositeKey, gbRegistry.get(compositeKey));
    }
    return pickByEid(entityId);
  }
  if (entityId !== undefined && entityId !== null) {
    return pickByEid(entityId);
  }
  if (
    playerId !== undefined &&
    playerId !== null &&
    (entityId === undefined || entityId === null)
  ) {
    return pickByEid(playerId);
  }
  return null;
}

function reset() {
  // Idempotent: clears both the canonical map and the derived index.
  gbRegistry.clear();
  byEid.clear();
}

function getRegistry() {
  return gbRegistry;
}

/** Number of logical entries currently held (post-normalization, post-cap). */
function getEntryCount() {
  return gbRegistry.size;
}

module.exports = {
  calculateLevelCost,
  getGreatBuilding,
  getRegistry,
  getEntryCount,
  registryCapacity: CAPACITY,
  registerGreatBuilding,
  registerGreatBuildings,
  reset,
};
module.exports.default = module.exports;
