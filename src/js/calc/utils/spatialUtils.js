/**
 * spatialUtils.js
 *
 * City grid coordinate bounding checks and set building adjacency matrix calculation.
 */

const { cleanBaseEntityId } = require('./eraUtils.js');

/**
 * Checks if two bounding boxes touch on the city grid without overlapping interiors.
 *
 * @param {Object} b1 First entity { x, y, width, length }
 * @param {Object} b2 Second entity { x, y, width, length }
 * @returns {boolean} True if adjacent on city grid
 */
function areBuildingsAdjacent(b1, b2) {
  if (!b1 || !b2) return false;
  const x1 = b1.x ?? 0;
  const y1 = b1.y ?? 0;
  const w1 = b1.width ?? 1;
  const l1 = b1.length ?? 1;

  const x2 = b2.x ?? 0;
  const y2 = b2.y ?? 0;
  const w2 = b2.width ?? 1;
  const l2 = b2.length ?? 1;

  // Horizontal adjacency: left/right edges touch and vertical spans overlap
  const horizontalTouch =
    (x1 + w1 === x2 || x2 + w2 === x1) &&
    Math.max(y1, y2) < Math.min(y1 + l1, y2 + l2);

  // Vertical adjacency: top/bottom edges touch and horizontal spans overlap
  const verticalTouch =
    (y1 + l1 === y2 || y2 + l2 === y1) &&
    Math.max(x1, x2) < Math.min(x1 + w1, x2 + w2);

  return horizontalTouch || verticalTouch;
}

/**
 * Pre-processes entities and computes unique adjacent set neighbors per entity.
 *
 * @param {Array} entities City entities
 * @param {Object} store MetadataStore instance
 * @returns {Map<string|number, number>} Map of entity ID to unique neighbor count
 */
/**
 * Pre-processes entities and computes unique adjacent set neighbors per entity.
 *
 * @param {Array} entities City entities
 * @param {Object} store MetadataStore instance
 * @returns {Map<string|number, number>} Map of entity ID to unique neighbor count
 */
function computeSetAdjacencies(entities = [], store = null) {
  const counts = new Map();

  const resolveSetId = (e) => {
    if (!e || !e.cityentity_id) return null;
    if (store?.getSetForEntity) {
      const sid = store.getSetForEntity(e.cityentity_id);
      if (sid) return sid;
    }
    if (store?.getSet) {
      const sObj = store.getSet(e.cityentity_id);
      if (sObj?.id) return sObj.id;
    }
    const meta = store?.getEntity?.(e.cityentity_id);
    if (Array.isArray(meta?.abilities)) {
      for (const ab of meta.abilities) {
        if (ab.__class__ === 'BonusOnSetAdjacencyAbility' && ab.setId) {
          return ab.setId;
        }
      }
    }
    return null;
  };

  const setBuildings = [];
  for (const e of entities) {
    if (!e || !e.cityentity_id) continue;
    const setId = resolveSetId(e);
    if (setId) {
      setBuildings.push({
        entity: e,
        setId,
        baseId: cleanBaseEntityId(e.cityentity_id),
      });
    }
  }

  for (let i = 0; i < setBuildings.length; i++) {
    const b1 = setBuildings[i];
    const uniqueNeighbors = new Set();

    for (let j = 0; j < setBuildings.length; j++) {
      if (i === j) continue;
      const b2 = setBuildings[j];
      if (b1.setId !== b2.setId) continue;
      if (b1.baseId === b2.baseId) continue; // Same building type does not grant bonus

      if (areBuildingsAdjacent(b1.entity, b2.entity)) {
        uniqueNeighbors.add(b2.baseId);
      }
    }
    counts.set(b1.entity.id, uniqueNeighbors.size);
  }

  return counts;
}

/**
 * Validates which chain link buildings are connected to a chain start building.
 *
 * @param {Array} entities City entities
 * @param {Object} store MetadataStore instance
 * @returns {Set<string|number>} Set of validly connected chain link entity IDs
 */
function computeChainLinkAdjacencies(entities = [], store = null) {
  const validLinkedIds = new Set();
  const chainBuildings = [];

  for (const e of entities) {
    if (!e || !e.cityentity_id) continue;
    const meta = store?.getEntity?.(e.cityentity_id);
    let chainId = null;
    let isStart = false;
    let isLink = false;

    if (Array.isArray(meta?.abilities)) {
      for (const ab of meta.abilities) {
        if (ab.__class__ === 'ChainStartAbility') {
          chainId = ab.chainId;
          isStart = true;
          break;
        } else if (ab.__class__ === 'ChainLinkAbility') {
          chainId = ab.chainId;
          isLink = true;
          break;
        }
      }
    }

    if (!chainId && store?.getChain) {
      const c = store.getChain(e.cityentity_id);
      if (c?.id) {
        chainId = c.id;
        isStart = c.startCityEntityId === e.cityentity_id;
        isLink = !isStart;
      }
    }

    if (chainId) {
      chainBuildings.push({ entity: e, chainId, isStart, isLink });
    }
  }

  // BFS from chain starts to find all transitively connected links
  const starts = chainBuildings.filter((b) => b.isStart);
  for (const start of starts) {
    const queue = [start];
    const visited = new Set([start.entity.id]);

    while (queue.length > 0) {
      const curr = queue.shift();
      for (const other of chainBuildings) {
        if (!other.isLink) continue;
        if (other.chainId !== start.chainId) continue;
        if (visited.has(other.entity.id)) continue;

        if (areBuildingsAdjacent(curr.entity, other.entity)) {
          visited.add(other.entity.id);
          validLinkedIds.add(other.entity.id);
          queue.push(other);
        }
      }
    }
  }

  return validLinkedIds;
}

module.exports = {
  areBuildingsAdjacent,
  computeSetAdjacencies,
  computeChainLinkAdjacencies,
};
module.exports.default = module.exports;
