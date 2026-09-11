/**
 * gbNames.js
 *
 * Backward-compatibility shim. The canonical Great Building name map and
 * resolver now live in src/js/calc/gbNaming.js (single source of truth, F12).
 */

const { GB_NAME_MAP, getGreatBuildingName } = require('../gbNaming.js');

module.exports = {
  GB_NAME_MAP,
  getGreatBuildingName,
};
module.exports.default = module.exports;
