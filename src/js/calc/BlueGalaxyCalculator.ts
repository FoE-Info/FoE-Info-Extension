/**
 * BlueGalaxyCalculator.ts
 *
 * Typed mirror of BlueGalaxyCalculator.js. Calculation engine for the Blue
 * Galaxy double collection helper: extracts FP production, filters candidate
 * buildings, determines readiness, and maintains ranked suggestions.
 *
 * Zero DOM dependencies (no document, window, or jQuery). Stays CommonJS/ESM
 * dual-compatible and uses a lazily-resolved scoped logger.
 */

import BigNumber from 'bignumber.js';

let logger: { debug?: (...args: unknown[]) => void } | null = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('BlueGalaxy');
} catch {}

export interface GalaxyEntityProduction {
  components?: {
    AllAge?: {
      production?: { options?: GalaxyProductionProduct[] };
      [key: string]: unknown;
    };
    [era: string]: unknown;
  };
  [key: string]: unknown;
}

export interface GalaxyResourceBag {
  strategy_points?: number | string;
  [resource: string]: number | string | undefined;
}

export interface GalaxyProductionProduct {
  playerResources?: { resources?: GalaxyResourceBag };
  [key: string]: unknown;
}

export interface GalaxyProductionOption {
  products?: GalaxyProductionProduct[] | { array?: GalaxyProductionProduct[] };
  [key: string]: unknown;
}

export interface GalaxyEntityState {
  __class__?: string;
  next_state_transition_at?: number;
  current_product?: { product?: { resources?: GalaxyResourceBag } };
  productionOption?: GalaxyProductionOption;
  [key: string]: unknown;
}

export interface GalaxyEntity {
  id?: number | string;
  cityentity_id?: string;
  name?: string;
  type?: string;
  level?: number;
  state?: GalaxyEntityState;
  [key: string]: unknown;
}

export interface GalaxyMetadataStore {
  getEntity?: (
    id?: string | number,
  ) => GalaxyEntityProduction | null | undefined;
  getCityEntity?: (
    id?: string | number,
  ) => GalaxyEntityProduction | null | undefined;
  [key: string]: unknown;
}

export type GalaxyNameResolver = (id?: string | number) => string;

export interface GalaxyCandidate {
  id?: number | string;
  cityentity_id?: string;
  name: string;
  fp: number;
  goods?: number;
  olderGoods?: number;
  state: string;
  transition: number;
}

export type GalaxyRankedCandidate = GalaxyCandidate & { isReady?: boolean };

export interface GalaxyEconomicWeights {
  fpWeight?: number;
  goodsWeight?: number;
  olderGoodsWeight?: number;
}

export const DEFAULT_ECONOMIC_WEIGHTS: Required<GalaxyEconomicWeights> =
  Object.freeze({
    fpWeight: 1,
    goodsWeight: 0.2,
    olderGoodsWeight: 0.1,
  });

export interface GalaxyOptions {
  charges?: number;
  currentEpoch?: number;
  isDebug?: boolean;
}

type ExtractEntityProductionFn = (
  entity: GalaxyEntity,
  meta: GalaxyEntityProduction,
  targetEra: string,
  is100PercentAided?: boolean,
  adjCount?: number,
) => GalaxyResourceBag | null | undefined;

let extractEntityProduction: ExtractEntityProductionFn | null = null;
try {
  extractEntityProduction =
    require('./prod/ProductionCalculator.js').extractEntityProduction;
} catch {}

export function extractEntityFp(
  entity: GalaxyEntity | null | undefined,
  metadataStore: GalaxyMetadataStore | null = null,
  targetEra: string = 'AllAge',
): number {
  if (!entity || entity.type === 'greatbuilding' || entity.type === 'hub') {
    return 0;
  }

  // 1. Direct inspection from active product in current_product
  const cpRes = entity.state?.current_product?.product?.resources;
  if (cpRes?.strategy_points) {
    return Number(cpRes.strategy_points);
  }

  // 2. Direct inspection from productionOption
  const prodOption = entity.state?.productionOption;
  if (prodOption?.products) {
    const list =
      Array.isArray(prodOption.products) ?
        prodOption.products
      : prodOption.products.array || [];
    for (const p of list) {
      if (p.playerResources?.resources?.strategy_points) {
        return Number(p.playerResources.resources.strategy_points);
      }
    }
  }

  // 3. Fallback to metadataStore lookup if in ProductionFinishedState or metadata available
  const meta =
    metadataStore?.getEntity ? metadataStore.getEntity(entity.cityentity_id)
    : metadataStore?.getCityEntity ?
      metadataStore.getCityEntity(entity.cityentity_id)
    : null;

  if (meta && extractEntityProduction) {
    const prod = extractEntityProduction(entity, meta, targetEra, true);
    if (prod?.strategy_points) {
      return Number(prod.strategy_points);
    }
  }

  return 0;
}

export function createGalaxyCandidate(
  entity: GalaxyEntity | null | undefined,
  metadataStore: GalaxyMetadataStore | null = null,
  nameResolver: GalaxyNameResolver | null = null,
): GalaxyCandidate | null {
  if (!entity || entity.type === 'greatbuilding' || entity.type === 'hub') {
    return null;
  }

  const fp = extractEntityFp(entity, metadataStore);
  if (!fp || fp <= 0) {
    return null;
  }

  const displayName =
    typeof nameResolver === 'function' ?
      nameResolver(entity.cityentity_id || entity.name)
    : entity.name || entity.cityentity_id || 'Unknown Building';

  const stateClass = entity.state?.__class__ || 'UnknownState';
  const transition =
    stateClass === 'ProducingState' ?
      entity.state?.next_state_transition_at || 0
    : entity.state?.next_state_transition_at || 2147483647;

  return {
    id: entity.id,
    cityentity_id: entity.cityentity_id,
    name: displayName,
    fp,
    state: stateClass,
    transition,
  };
}

function resolveEconomicWeights(
  economicWeights?: GalaxyEconomicWeights | null,
): Required<GalaxyEconomicWeights> | null {
  if (!economicWeights || typeof economicWeights !== 'object') return null;
  return {
    fpWeight: economicWeights.fpWeight ?? DEFAULT_ECONOMIC_WEIGHTS.fpWeight,
    goodsWeight:
      economicWeights.goodsWeight ?? DEFAULT_ECONOMIC_WEIGHTS.goodsWeight,
    olderGoodsWeight:
      economicWeights.olderGoodsWeight ??
      DEFAULT_ECONOMIC_WEIGHTS.olderGoodsWeight,
  };
}

export function computeEconomicScore(
  candidate:
    Pick<GalaxyCandidate, 'fp' | 'goods' | 'olderGoods'> | null | undefined,
  economicWeights?: GalaxyEconomicWeights | null,
): BigNumber {
  const weights =
    resolveEconomicWeights(economicWeights) || DEFAULT_ECONOMIC_WEIGHTS;
  const fp = new BigNumber(candidate?.fp ?? 0);
  const goods = new BigNumber(candidate?.goods ?? 0);
  const olderGoods = new BigNumber(candidate?.olderGoods ?? 0);
  return fp
    .times(weights.fpWeight)
    .plus(goods.times(weights.goodsWeight))
    .plus(olderGoods.times(weights.olderGoodsWeight));
}

export function filterAndSortGalaxyCandidates(
  candidates: GalaxyCandidate[] | null | undefined,
  economicWeights?: GalaxyEconomicWeights | null,
): GalaxyCandidate[] {
  if (!Array.isArray(candidates)) return [];
  const weights = resolveEconomicWeights(economicWeights);
  if (!weights) {
    return [...candidates].sort((a, b) => (b.fp || 0) - (a.fp || 0));
  }
  return [...candidates].sort((a, b) =>
    computeEconomicScore(b, weights).comparedTo(
      computeEconomicScore(a, weights),
    ),
  );
}

export function isCandidateReady(
  candidate: GalaxyCandidate | null | undefined,
  currentEpoch?: number,
): boolean {
  if (!candidate) return false;
  if (candidate.state === 'ProductionFinishedState') return true;
  if (
    candidate.transition &&
    currentEpoch &&
    candidate.transition <= currentEpoch
  ) {
    return true;
  }
  return false;
}

export function getTopReadyGalaxyBuildings(
  candidates: GalaxyCandidate[] | null | undefined,
  charges?: number,
  currentEpoch?: number,
  isDebug: boolean = false,
  economicWeights?: GalaxyEconomicWeights | null,
): GalaxyRankedCandidate[] {
  if (!Array.isArray(candidates)) return [];
  const sorted = filterAndSortGalaxyCandidates(candidates, economicWeights);

  logger?.debug('Evaluating Blue Galaxy candidates', {
    totalCandidates: candidates.length,
    charges,
    isDebug,
  });

  if (isDebug) {
    return sorted.map((item) => ({
      ...item,
      isReady: isCandidateReady(item, currentEpoch),
    }));
  }

  const maxCount = Math.max(0, charges || 0);
  if (maxCount === 0) return [];

  const readyList: GalaxyCandidate[] = [];
  for (const item of sorted) {
    if (isCandidateReady(item, currentEpoch)) {
      readyList.push(item);
      if (readyList.length >= maxCount) break;
    }
  }

  return readyList;
}

export function updateCandidateState(
  candidates: GalaxyCandidate[] | null | undefined,
  updatedEntity: GalaxyEntity | null | undefined,
): void {
  if (!Array.isArray(candidates) || !updatedEntity) return;
  const target = candidates.find((item) => item.id === updatedEntity.id);
  if (!target) return;

  if (updatedEntity.state) {
    target.state = updatedEntity.state.__class__ || target.state;
    target.transition =
      updatedEntity.state.next_state_transition_at ?? target.transition;
  }
}

export default {
  DEFAULT_ECONOMIC_WEIGHTS,
  computeEconomicScore,
  extractEntityFp,
  createGalaxyCandidate,
  filterAndSortGalaxyCandidates,
  isCandidateReady,
  getTopReadyGalaxyBuildings,
  updateCandidateState,
};
