/**
 * spatialUtils.ts
 *
 * TypeScript mirror for city grid coordinate bounding checks and set building adjacency matrix calculation.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { cleanBaseEntityId } = require('./eraUtils.js');

export interface GridBuilding {
  x?: number;
  y?: number;
  width?: number;
  length?: number;
}

export interface CityEntityInput extends GridBuilding {
  id: string | number;
  cityentity_id?: string;
  [key: string]: unknown;
}

export interface AbilityMeta {
  __class__?: string;
  setId?: string;
  chainId?: string;
  [key: string]: unknown;
}

export interface EntityMetadata {
  width?: number;
  length?: number;
  abilities?: AbilityMeta[];
  [key: string]: unknown;
}

export interface MetadataStoreSpatial {
  getSetForEntity?: (cityEntityId: string) => string | null | undefined;
  getSet?: (cityEntityId: string) => { id?: string } | null | undefined;
  getEntity?: (cityEntityId: string) => EntityMetadata | null | undefined;
  getChain?: (
    cityEntityId: string,
  ) => { id?: string; startCityEntityId?: string } | null | undefined;
}

interface SetBuildingInternal {
  entity: CityEntityInput & { width: number; length: number };
  setId: string;
  baseId: string;
}

interface ChainBuildingInternal {
  entity: CityEntityInput & { width: number; length: number };
  chainId: string;
  isStart: boolean;
  isLink: boolean;
}

/**
 * Checks if two bounding boxes touch on the city grid without overlapping interiors.
 */
export function areBuildingsAdjacent(
  b1?: GridBuilding | null,
  b2?: GridBuilding | null,
): boolean {
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
 */
export function computeSetAdjacencies(
  entities: CityEntityInput[] = [],
  store: MetadataStoreSpatial | null = null,
): Map<string | number, number> {
  const counts = new Map<string | number, number>();

  const resolveSetId = (e: CityEntityInput): string | null => {
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

  const setBuildings: SetBuildingInternal[] = [];
  for (const e of entities) {
    if (!e || !e.cityentity_id) continue;
    const setId = resolveSetId(e);
    if (setId) {
      const meta =
        typeof store?.getEntity === 'function' ?
          store.getEntity(e.cityentity_id)
        : null;
      setBuildings.push({
        entity: {
          ...e,
          width: e.width ?? meta?.width ?? 1,
          length: e.length ?? meta?.length ?? 1,
        },
        setId,
        baseId: cleanBaseEntityId(e.cityentity_id),
      });
    }
  }

  for (let i = 0; i < setBuildings.length; i++) {
    const b1 = setBuildings[i];
    const uniqueNeighbors = new Set<string>();

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
 */
export function computeChainLinkAdjacencies(
  entities: CityEntityInput[] = [],
  store: MetadataStoreSpatial | null = null,
): Set<string | number> {
  const validLinkedIds = new Set<string | number>();
  const chainBuildings: ChainBuildingInternal[] = [];

  for (const e of entities) {
    if (!e || !e.cityentity_id) continue;
    const meta = store?.getEntity?.(e.cityentity_id);
    let chainId: string | null = null;
    let isStart = false;
    let isLink = false;

    if (Array.isArray(meta?.abilities)) {
      for (const ab of meta.abilities) {
        if (ab.__class__ === 'ChainStartAbility' && ab.chainId) {
          chainId = ab.chainId;
          isStart = true;
          break;
        } else if (ab.__class__ === 'ChainLinkAbility' && ab.chainId) {
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
      const meta =
        typeof store?.getEntity === 'function' ?
          store.getEntity(e.cityentity_id)
        : null;
      chainBuildings.push({
        entity: {
          ...e,
          width: e.width ?? meta?.width ?? 1,
          length: e.length ?? meta?.length ?? 1,
        },
        chainId,
        isStart,
        isLink,
      });
    }
  }

  // BFS from chain starts to find all transitively connected links
  const starts = chainBuildings.filter((b) => b.isStart);
  for (const start of starts) {
    const queue: ChainBuildingInternal[] = [start];
    const visited = new Set<string | number>([start.entity.id]);

    while (queue.length > 0) {
      const curr = queue.shift()!;
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

const spatialUtils = {
  areBuildingsAdjacent,
  computeSetAdjacencies,
  computeChainLinkAdjacencies,
};

export default spatialUtils;
