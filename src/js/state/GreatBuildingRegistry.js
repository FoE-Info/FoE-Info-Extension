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

const gbRegistry = new Map();

/**
 * Calculates level cost using geometric progression from metadata definitions.
 * Formula:
 * - Level <= 10: strategy_points_for_upgrade[Level - 1]
 * - Level > 10: Math.ceil(Level10Cost * Math.pow(1.025, Level - 9))
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
  return Math.ceil(level10Cost * Math.pow(1.025, targetLevel - 9));
}

/**
 * Registers or updates a single Great Building in the registry.
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
  const compositeKey = `${pId}_${eId}`;
  const existing =
    gbRegistry.get(compositeKey) || gbRegistry.get(String(eId)) || {};

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

  gbRegistry.set(compositeKey, normalized);
  if (Number(pId) === 0) {
    gbRegistry.set(`0_${eId}`, normalized);
  }
  gbRegistry.set(String(eId), normalized);
  if (entity.id && entity.entity_id && entity.id !== entity.entity_id) {
    gbRegistry.set(String(entity.id), normalized);
    gbRegistry.set(String(entity.entity_id), normalized);
  }

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
    const compositeKey = `${playerId}_${entityId}`;
    if (gbRegistry.has(compositeKey)) {
      return gbRegistry.get(compositeKey);
    }
    if (Number(playerId) === 0 && gbRegistry.has(`0_${entityId}`)) {
      return gbRegistry.get(`0_${entityId}`);
    }
  }
  if (entityId !== undefined && entityId !== null) {
    if (
      (playerId === 0 ||
        playerId === '0' ||
        playerId === undefined ||
        playerId === null) &&
      gbRegistry.has(`0_${entityId}`)
    ) {
      return gbRegistry.get(`0_${entityId}`);
    }
    const singleKey = String(entityId);
    if (gbRegistry.has(singleKey)) {
      return gbRegistry.get(singleKey);
    }
    if (gbRegistry.has(`0_${entityId}`)) {
      return gbRegistry.get(`0_${entityId}`);
    }
  }
  if (
    playerId !== undefined &&
    playerId !== null &&
    (entityId === undefined || entityId === null)
  ) {
    const singleKey = String(playerId);
    if (gbRegistry.has(singleKey)) {
      return gbRegistry.get(singleKey);
    }
  }
  return null;
}

function reset() {
  gbRegistry.clear();
}

function getRegistry() {
  return gbRegistry;
}

module.exports = {
  calculateLevelCost,
  getGreatBuilding,
  getRegistry,
  registerGreatBuilding,
  registerGreatBuildings,
  reset,
};
module.exports.default = module.exports;
