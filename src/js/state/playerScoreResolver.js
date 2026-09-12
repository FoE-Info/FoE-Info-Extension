/**
 * playerScoreResolver.js
 *
 * Resolves the player's score during startup, falling back to persisted cache
 * values when the startup payload omits it. Extracted from StartupService so
 * the orchestrator stays a thin delegate (monolith containment).
 * Dual CJS/ESM compatible.
 */

const { createLogger } = require('../utils/logger.js');
const logger = createLogger('PlayerScoreResolver');

let storageModule = null;
try {
  storageModule = require('../utils/storage.js');
} catch {}

function loadStoredScore(user, readSync) {
  if (typeof readSync !== 'function') return null;
  const worldKey = user?.world_id ? `world:${user.world_id}.playerScore` : null;
  return readSync('playerScore') || (worldKey ? readSync(worldKey) : null);
}

/**
 * Resolve the score for a parsed user account, mutating `parsedUser.score`
 * when a positive cached value is found. Returns the resolved score.
 *
 * @param {Object} parsedUser - Result of parseUserAccount(user)
 * @param {Object} user - Raw user_data payload
 * @param {Object} [deps] - Injectable dependencies for testing
 * @param {Function} [deps.getSync] - Synchronous cache getter
 * @param {Function} [deps.get] - Async cache getter (key, cb)
 * @param {Function} [deps.setMyScore] - State setter for the resolved score
 * @param {Function} [deps.renderLiveCityStats] - Re-render callback
 */
function resolvePlayerScore(parsedUser, user, deps = {}) {
  if (!parsedUser) return 0;
  if (parsedUser.score && parsedUser.score !== 0) {
    return parsedUser.score;
  }

  const { getSync, get, setMyScore, renderLiveCityStats } = deps;

  const readSync =
    typeof getSync === 'function' ? getSync : storageModule?.getSync;
  const readAsync = typeof get === 'function' ? get : storageModule?.get;

  try {
    const cached = loadStoredScore(user, readSync);
    if (cached && Number(cached) > 0) {
      parsedUser.score = Number(cached);
      logger.debug('resolved player score from sync cache', parsedUser.score);
      return parsedUser.score;
    }

    if (typeof readAsync === 'function') {
      readAsync('playerScore', (err, val) => {
        if (err) {
          logger.warn('player score cache read failed', err);
          return;
        }
        const num = Number(val);
        if (!Number.isFinite(num) || num <= 0) return;
        parsedUser.score = num;
        if (typeof setMyScore === 'function') setMyScore(num);
        if (typeof renderLiveCityStats === 'function') {
          try {
            renderLiveCityStats();
          } catch (renderErr) {
            logger.warn('player score re-render failed', renderErr);
          }
        }
        logger.debug('resolved player score from async cache', num);
      });
    }
  } catch (err) {
    logger.warn('player score resolution failed', err);
  }

  return parsedUser.score;
}

module.exports = { resolvePlayerScore };
module.exports.default = module.exports;
