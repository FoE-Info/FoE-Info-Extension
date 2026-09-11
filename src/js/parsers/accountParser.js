/**
 * accountParser.js
 *
 * Parser for InnoGames user account / startup user_data payloads.
 * Normalizes player identity, guild info, era, creation date, permissions,
 * and extracts player points / rank score across all known InnoGames keys
 * (rank_points, player_points, score, points).
 */

const { createLogger } = require('../utils/logger.js');

let logger = null;
try {
  logger = createLogger('AccountParser');
} catch {}

/**
 * Extracts normalized player points / score from a user data object.
 * Checks known InnoGames keys: rank_points, player_points, score, points.
 *
 * @param {Object} userData InnoGames user payload
 * @returns {number} Non-negative finite player points, or 0 if absent
 */
function extractPlayerPoints(userData) {
  if (!userData || typeof userData !== 'object') {
    return 0;
  }
  const rawScore =
    userData.rank_points ??
    userData.player_points ??
    userData.score ??
    userData.points;

  if (rawScore !== undefined && rawScore !== null) {
    const parsed = Number(rawScore);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

/**
 * Parses and normalizes user account data from startup user_data payload.
 *
 * @param {Object} userData InnoGames user_data object
 * @returns {Object} Normalized user account object
 */
function parseUserAccount(userData = {}) {
  if (!userData || typeof userData !== 'object') {
    if (logger)
      logger.warn('parseUserAccount received invalid userData', userData);
    return {
      id: 0,
      name: '',
      clan: '',
      clanId: 0,
      createdAt: 0,
      era: '',
      score: 0,
      permissions: {},
    };
  }

  const id = Number(userData.player_id ?? userData.id ?? 0) || 0;
  const name = String(userData.user_name ?? userData.name ?? '').trim();
  const clan = String(userData.clan_name ?? userData.clan ?? '').trim();
  const clanId = Number(userData.clan_id ?? userData.clanId ?? 0) || 0;
  const createdAt = Number(userData.createdAt ?? userData.created_at ?? 0) || 0;
  const era = String(userData.era ?? '').trim();
  const score = extractPlayerPoints(userData);
  const permissions = userData.clan_permissions ?? userData.permissions ?? {};

  if (logger) {
    logger.debug('parseUserAccount parsed account', {
      id,
      name,
      clan,
      clanId,
      score,
      era,
    });
  }

  return {
    id,
    name,
    clan,
    clanId,
    createdAt,
    era,
    score,
    permissions,
  };
}

module.exports = {
  extractPlayerPoints,
  parseUserAccount,
};
