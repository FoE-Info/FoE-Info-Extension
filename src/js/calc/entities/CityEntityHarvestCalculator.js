/**
 * CityEntityHarvestCalculator.js
 *
 * Pure per-entity harvest evaluation for Forge of Empires city map entities.
 * Resolves Blue Galaxy contributions, readiness/collection timestamps, guild
 * treasury goods, player resource production, and special-goods extraction for
 * a single city entity. Contains zero DOM references.
 */

let logger = null;
try {
  const { createLogger } = require('../../utils/logger.js');
  logger = createLogger('CityEntityHarvestCalculator');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

const { SPECIAL_GOODS } = require('../goods/goodsClassification.js');
const {
  createHarvestAccumulator,
  parseCurrentProduct,
  parseProductionOption,
} = require('./harvestAccumulator.js');

/**
 * Evaluate harvest contributions for a single city map entity.
 *
 * Mutates the supplied accumulator and City object exactly as the legacy
 * monolithic loop did, then reports per-entity timing and FP discovery.
 *
 * @param {Object} mapID - City map entity.
 * @param {number} index - Entity index within the batch.
 * @param {Object} options - Harvest context (production providers + accumulator).
 * @returns {{ found: boolean, galaxyEntityMs: number, entityProductionMs: number }}
 */
function evaluateEntityHarvest(mapID, index, options = {}) {
  const City = options.City || {};
  const CityEntityDefs = options.CityEntityDefs || {};
  const metadataStore = options.metadataStore || null;
  const MyInfo = options.MyInfo || {};
  const ResourceDefs = options.ResourceDefs || [];
  const blueGalaxyState = options.blueGalaxyState || null;
  const Galaxy = options.Galaxy || { bonus: [] };
  const helper = options.helper || {
    fEntityNameTrim: (id) => id,
    fGVGagesname: (era) => era,
  };
  const formatLiveName = options.formatLiveName || ((id, fallback) => fallback);
  const debugEnabled = options.debugEnabled ?? false;
  const accum = options.accum || createHarvestAccumulator();

  let found = false;
  let galaxyEntityMs = 0;
  let entityProductionMs = 0;

  const cid = mapID.cityentity_id;
  if (debugEnabled) {
    logger.debug('Evaluating city entity harvest', { index, cid });
  }

  // 1. Blue Galaxy integration
  if (blueGalaxyState && typeof blueGalaxyState.addEntity === 'function') {
    const galaxyEntityStart = debugEnabled ? performance.now() : 0;
    blueGalaxyState.addEntity(
      mapID,
      metadataStore,
      (eid) => formatLiveName(eid, helper.fEntityNameTrim(eid)),
      false,
    );
    if (debugEnabled) galaxyEntityMs += performance.now() - galaxyEntityStart;
  }

  const entityProductionStart = debugEnabled ? performance.now() : 0;

  // 2. SummerBonus20 / CulturalBuilding abilities
  if (
    cid.startsWith('R_MultiAge_SummerBonus20') ||
    cid.startsWith('R_MultiAge_CulturalBuilding')
  ) {
    const entity =
      CityEntityDefs[cid] || (metadataStore && metadataStore.getEntity(cid));
    if (entity && Array.isArray(entity.abilities)) {
      const randomUnitAb = entity.abilities.find(
        (a) => a && a.__class__ === 'RandomUnitOfAgeWhenMotivatedAbility',
      );
      if (randomUnitAb && randomUnitAb.amount) {
        City.TrazUnits = (City.TrazUnits || 0) + randomUnitAb.amount;
      }

      const treasuryAb = entity.abilities.find(
        (a) => a && a.__class__ === 'AddResourcesToGuildTreasuryAbility',
      );
      if (treasuryAb && treasuryAb.additionalResources) {
        const res =
          treasuryAb.additionalResources['AllAge']?.resources ||
          treasuryAb.additionalResources[MyInfo?.era]?.resources;
        if (res && res.all_goods_of_age) {
          const goods = res.all_goods_of_age;
          accum.clanGoods += goods;
          accum.clanGoodsBuildings.push({
            id: cid,
            name: helper.fEntityNameTrim(cid),
            goods: goods,
          });
        }
      }
    }
  }

  // 3. Readiness timestamps
  if (
    mapID.state &&
    Object.prototype.hasOwnProperty.call(
      mapID.state,
      'next_state_transition_at',
    ) &&
    mapID.state.next_state_transition_at > 1000000000
  ) {
    accum.buildingsReady.push({
      id: cid,
      name: helper.fEntityNameTrim(cid),
      ready: mapID.state.next_state_transition_at,
    });
  }

  // 4. Current product parsing
  if (mapID.state?.current_product) {
    const parsed = parseCurrentProduct({
      curProduct: mapID.state.current_product,
      cid,
      mapID,
      MyInfo,
      ResourceDefs,
      helper,
      City,
      Galaxy,
      accum,
    });
    found = found || parsed.found;
  }

  // 5. ProductionOption parsing (alternative payload shape)
  if (mapID.state?.productionOption) {
    const parsed = parseProductionOption({
      prodOpt: mapID.state.productionOption,
      cid,
      mapID,
      ResourceDefs,
      helper,
      City,
      Galaxy,
      accum,
    });
    found = found || parsed.found;
  }

  if (debugEnabled) {
    entityProductionMs += performance.now() - entityProductionStart;
  }

  return { found, galaxyEntityMs, entityProductionMs };
}

module.exports = {
  createHarvestAccumulator,
  evaluateEntityHarvest,
  SPECIAL_GOODS,
};
module.exports.default = module.exports;
