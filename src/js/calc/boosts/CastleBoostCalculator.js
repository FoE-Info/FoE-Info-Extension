/**
 * CastleBoostCalculator.js
 *
 * Pure Castle System boost resolution for Forge of Empires. Maps a visual
 * castle stage (0-7) or a V_AllAge_CastleSystem entity to estimated military
 * boosts. Contains zero DOM, network, or msg-layer references.
 */

const STAGE_BOOST_MAP = Object.freeze({
  0: 0,
  1: 4,
  2: 9,
  3: 20,
  4: 30,
  5: 35,
  6: 45,
  7: 60,
});

/**
 * Resolve military boosts for a Castle System visual stage.
 *
 * @param {number|string} stage Visual stage 0-7.
 * @returns {{ attackerAtt: number, attackerDef: number, defenderAtt: number, defenderDef: number }|null}
 */
function getCastleBoostsForStage(stage) {
  const s = parseInt(stage, 10);
  if (!(s in STAGE_BOOST_MAP)) return null;
  const boost = STAGE_BOOST_MAP[s];
  return {
    attackerAtt: boost,
    attackerDef: boost,
    defenderAtt: boost,
    defenderDef: boost,
  };
}

/**
 * Resolve Castle System boosts for a city map entity.
 *
 * @param {Object} entity City map entity.
 * @returns {{ attackerAtt: number, attackerDef: number, defenderAtt: number, defenderDef: number }|null}
 */
function getCastleBoostsForEntity(entity) {
  if (!entity?.cityentity_id) return null;
  const match = entity.cityentity_id.match(/CastleSystem(\d+)/);
  if (!match) return null;
  return getCastleBoostsForStage(parseInt(match[1], 10));
}

module.exports = {
  getCastleBoostsForStage,
  getCastleBoostsForEntity,
};
module.exports.default = module.exports;
