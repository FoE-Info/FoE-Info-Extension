/**
 * gbNaming.js
 *
 * Great Building naming helpers for Chateau Frontenac and The Arc.
 * Decoupled from StartupService.js.
 */

let helper = null;
try {
  helper = require('../fn/helper.js');
} catch {}

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('gbNaming');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

/**
 * Resolves Chateau Frontenac display name.
 *
 * @param {Object} [customHelper] - Optional helper instance with fGBname method.
 * @returns {string} Name token or full name (defaults to 'Chateau').
 */
function fCFname(customHelper = helper) {
  const h = customHelper || helper;
  const rawName = h?.fGBname?.('X_ProgressiveEra_Landmark2');
  if (rawName) {
    const nameArray = String(rawName).split(' ');
    if (nameArray[0] === 'Chateau' || nameArray[0] === 'Château') {
      return nameArray[0];
    } else if (nameArray[1] === 'Frontenac') {
      return nameArray[1];
    } else {
      return rawName;
    }
  }
  return 'Chateau';
}

/**
 * Resolves The Arc display name.
 *
 * @param {Object} [customHelper] - Optional helper instance with fGBname method.
 * @returns {string} Name token (defaults to 'Arc').
 */
function fArcname(customHelper = helper) {
  const h = customHelper || helper;
  const rawName = h?.fGBname?.('X_FutureEra_Landmark1');
  if (rawName) {
    if (rawName === 'The Arc') {
      return 'Arc';
    }
    return rawName;
  }
  return 'Arc';
}

module.exports = {
  fCFname,
  fArcname,
};
module.exports.default = module.exports;
