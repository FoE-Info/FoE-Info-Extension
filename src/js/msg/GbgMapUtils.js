/**
 * GbgMapUtils.js
 *
 * Helper utilities for Guild Battlegrounds map provinces and clan signals.
 * Extracted from GuildBattlegroundService.js for modularity.
 */

/**
 * Normalizes province IDs and carries forward building state from oldMap to map.
 * @param {Array} map Current provinces array
 * @param {Array} oldMap Previous provinces array
 */
function preserveProvinceBuildings(map, oldMap) {
  if (!Array.isArray(map)) return;
  map.forEach((province) => {
    if (!province || typeof province !== 'object') return;
    if (!province.id) province.id = 0;
    if (Array.isArray(oldMap) && oldMap.length > 0) {
      const oldProv = oldMap.find(
        (oldProvince) =>
          oldProvince && Number(oldProvince.id) === Number(province.id),
      );
      if (oldProv) {
        if (oldProv.placedBuildings) {
          province.placedBuildings = oldProv.placedBuildings;
        }
        if (oldProv.availableBuildings) {
          province.availableBuildings = oldProv.availableBuildings;
        }
      }
    }
  });
}

/**
 * Normalizes raw clan signal items to have consistent id, provinceId, type, and signal keys.
 * @param {Array} signals
 */
function normalizeClanSignals(signals) {
  if (!Array.isArray(signals)) return;
  signals.forEach((clan) => {
    if (!clan || typeof clan !== 'object') return;
    if (clan.provinceId === undefined && clan.id !== undefined) {
      clan.provinceId = clan.id;
    }
    if (clan.provinceId === undefined) clan.provinceId = 0;
    if (clan.id === undefined) clan.id = clan.provinceId;
    if (clan.signal === undefined && clan.type !== undefined) {
      clan.signal = clan.type;
    }
    if (clan.type === undefined && clan.signal !== undefined) {
      clan.type = clan.signal;
    }
  });
}

/**
 * Evaluates whether two signal arrays represent the same signal assignments.
 * @param {Array} a
 * @param {Array} b
 * @returns {boolean}
 */
function areSignalsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  if (a.length === 0 && b.length === 0) return true;
  const mapA = new Map();
  for (const s of a) {
    if (!s || typeof s !== 'object') return false;
    const id = Number(s.id !== undefined ? s.id : s.provinceId);
    const type = s.type !== undefined ? s.type : s.signal;
    mapA.set(id, type);
  }
  for (const s of b) {
    if (!s || typeof s !== 'object') return false;
    const id = Number(s.id !== undefined ? s.id : s.provinceId);
    const type = s.type !== undefined ? s.type : s.signal;
    if (!mapA.has(id) || mapA.get(id) !== type) return false;
  }
  return true;
}

/**
 * Checks if an updated province was conquered compared to the existing map state.
 * @param {Object} existing Existing province entry
 * @param {Object} updated Updated province entry
 * @param {number} currentParticipantId
 * @returns {boolean}
 */
function isProvinceConquered(existing, updated, currentParticipantId) {
  if (!updated || typeof updated !== 'object') return false;
  return Boolean(
    (updated.ownerId !== undefined &&
      currentParticipantId &&
      updated.ownerId == currentParticipantId) ||
    (existing &&
      existing.ownerId !== undefined &&
      updated.ownerId !== undefined &&
      existing.ownerId !== updated.ownerId) ||
    (updated.lockedUntil &&
      (!existing?.lockedUntil || updated.lockedUntil > existing.lockedUntil)),
  );
}

module.exports = {
  preserveProvinceBuildings,
  normalizeClanSignals,
  areSignalsEqual,
  isProvinceConquered,
};
module.exports.default = module.exports;
