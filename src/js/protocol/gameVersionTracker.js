/**
 * gameVersionTracker.js
 *
 * Tracks client game version, notifies listeners on changes,
 * and updates UI status elements. Extracted from networkListener.js.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GameVersionTracker');
} catch {}

let appendGameVersionStatus = null;
try {
  const versionStatus = require('../ui/gameVersionStatus.js');
  if (typeof versionStatus.appendGameVersionStatus === 'function') {
    appendGameVersionStatus = versionStatus.appendGameVersionStatus;
  }
} catch {}

let currentGameVersion = 0;

/**
 * Returns the currently tracked game version.
 * @returns {string|number}
 */
function getGameVersion() {
  return currentGameVersion;
}

/**
 * Directly sets the tracked game version.
 * @param {string|number} version
 */
function setGameVersion(version) {
  currentGameVersion = version;
}

/**
 * Resets the tracked game version to initial state.
 */
function resetGameVersion() {
  currentGameVersion = 0;
}

/**
 * Checks for version change, updates state, and invokes callbacks or DOM rendering.
 *
 * @param {string|number} newVersion
 * @param {Object} [deps={}]
 */
function notifyGameVersionChange(newVersion, deps = {}) {
  const currentVersion =
    typeof deps.getGameVersion === 'function' ?
      deps.getGameVersion()
    : currentGameVersion;

  if (currentVersion != newVersion) {
    logger?.info('Game version changed', {
      from: currentVersion,
      to: newVersion,
    });
    currentGameVersion = newVersion;
    if (typeof deps.setGameVersion === 'function') {
      deps.setGameVersion(newVersion);
    }
    if (typeof deps.onGameVersionChange === 'function') {
      deps.onGameVersionChange(newVersion);
    } else if (
      deps.citystats &&
      typeof appendGameVersionStatus === 'function'
    ) {
      appendGameVersionStatus(deps.citystats, {
        version: newVersion,
        extName: deps.extName || 'FoE-Info',
        toolVersion: deps.toolVersion || '',
      });
    }
  }
}

module.exports = {
  getGameVersion,
  setGameVersion,
  resetGameVersion,
  notifyGameVersionChange,
};
module.exports.default = module.exports;
