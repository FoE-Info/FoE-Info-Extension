/**
 * BlueGalaxyCalculator.js
 *
 * Calculation engine for Blue Galaxy double collection helper.
 * Extracts FP production, filters candidate buildings, determines readiness,
 * and maintains ranked suggestions.
 */

const { extractEntityProduction } = require('./prod/ProductionCalculator.js');

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('BlueGalaxy');
} catch {}

function extractEntityFp(entity, metadataStore = null, targetEra = 'AllAge') {
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

  if (meta) {
    const prod = extractEntityProduction(entity, meta, targetEra, true);
    if (prod?.strategy_points) {
      return Number(prod.strategy_points);
    }
  }

  return 0;
}

function createGalaxyCandidate(
  entity,
  metadataStore = null,
  nameResolver = null,
) {
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

function filterAndSortGalaxyCandidates(candidates) {
  if (!Array.isArray(candidates)) return [];
  return [...candidates].sort((a, b) => (b.fp || 0) - (a.fp || 0));
}

function isCandidateReady(candidate, currentEpoch) {
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

function getTopReadyGalaxyBuildings(
  candidates,
  charges,
  currentEpoch,
  isDebug = false,
) {
  if (!Array.isArray(candidates)) return [];
  const sorted = filterAndSortGalaxyCandidates(candidates);

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

  const readyList = [];
  for (const item of sorted) {
    if (isCandidateReady(item, currentEpoch)) {
      readyList.push(item);
      if (readyList.length >= maxCount) break;
    }
  }

  return readyList;
}

function updateCandidateState(candidates, updatedEntity) {
  if (!Array.isArray(candidates) || !updatedEntity) return;
  const target = candidates.find((item) => item.id === updatedEntity.id);
  if (!target) return;

  if (updatedEntity.state) {
    target.state = updatedEntity.state.__class__ || target.state;
    target.transition =
      updatedEntity.state.next_state_transition_at ?? target.transition;
  }
}

module.exports = {
  extractEntityFp,
  createGalaxyCandidate,
  filterAndSortGalaxyCandidates,
  isCandidateReady,
  getTopReadyGalaxyBuildings,
  updateCandidateState,
};
module.exports.default = module.exports;
