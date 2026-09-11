/**
 * cityStatsUtils.js (Legacy compatibility shim)
 *
 * Re-exports from modular src/js/calc/utils/ modules.
 */

const eraUtils = require('../calc/utils/eraUtils.js');
const spatialUtils = require('../calc/utils/spatialUtils.js');
const bignumberUtils = require('../calc/utils/bignumberUtils.js');

module.exports = {
  ...eraUtils,
  ...spatialUtils,
  ...bignumberUtils,
};
module.exports.default = module.exports;
