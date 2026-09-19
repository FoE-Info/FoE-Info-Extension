/**
 * entityMotivation.js
 *
 * Evaluates entity motivatable eligibility and active aid/polivate states
 * based on InnoGames entity metadata and state models.
 * Pure module: zero DOM dependencies.
 */

const { createLogger } = require('../../utils/logger.js');

const logger = createLogger('entityMotivation');

/**
 * Checks whether an entity can receive motivation or polishing.
 *
 * @param {Object|null} entity - Entity state from CityMapService or game payload.
 * @param {Object|null} meta - Entity metadata definition from CityEntityDefs.
 * @returns {boolean}
 */
function isEntityMotivatable(entity, meta) {
  if (!meta) return false;
  const eid = String(entity?.cityentity_id || entity?.id || '');
  if (
    entity?.type === 'greatbuilding' ||
    meta?.type === 'greatbuilding' ||
    eid.startsWith('X_')
  ) {
    return false;
  }
  if (meta.__class__ === 'GenericCityEntity') {
    if (meta.components?.AllAge?.socialInteraction !== undefined) return true;
  }
  if (Array.isArray(meta.abilities)) {
    for (const a of meta.abilities) {
      if (
        a &&
        (a.__class__ === 'MotivatableAbility' ||
          a.__class__ === 'PolishableAbility' ||
          a.__class__ === 'RandomUnitOfAgeWhenMotivatedAbility')
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Checks whether an entity is currently aided (motivated, boosted, or polished).
 *
 * @param {Object|null} entity - Entity state from CityMapService.
 * @param {Object|null} meta - Entity metadata definition.
 * @returns {boolean}
 */
function isEntityAided(entity, meta) {
  if (!entity?.state) return true;
  const s = entity.state;
  if (s.boosted === true || s.is_motivated === true) return true;
  if (s.socialInteractionStartedAt > 0) {
    if (s.socialInteractionId === 'motivate') return true;
    if (s.socialInteractionId === 'polish') {
      const now = Math.floor(Date.now() / 1000);
      if (s.socialInteractionStartedAt + 43200 > now) return true;
    }
  }
  if (
    s.next_state_transition_in &&
    Array.isArray(meta?.abilities) &&
    meta.abilities.some((a) => a && a.__class__ === 'PolishableAbility')
  ) {
    return true;
  }
  return false;
}

module.exports = {
  isEntityMotivatable,
  isEntityAided,
};
module.exports.default = module.exports;
