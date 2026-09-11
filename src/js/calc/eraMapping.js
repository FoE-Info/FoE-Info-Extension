/**
 * eraMapping.js
 *
 * Pure era level/name mapping helpers extracted from fn/helper.js.
 * Zero DOM references: safe for headless and unit-test use.
 *
 * Mappings are constant-time dictionary lookups (Map) instead of the
 * legacy if/else ladders. Behavior is preserved 1:1 with the previous
 * helper.js implementations, including their fallback values.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('EraMapping');
} catch {
  logger = null;
}

const numAges = 23;

const AGE_TO_LEVEL = new Map([
  ['BronzeAge', 1],
  ['IronAge', 2],
  ['EarlyMiddleAge', 3],
  ['HighMiddleAge', 4],
  ['LateMiddleAge', 5],
  ['ColonialAge', 6],
  ['IndustrialAge', 7],
  ['ProgressiveEra', 8],
  ['ModernEra', 9],
  ['PostModernEra', 10],
  ['ContemporaryEra', 11],
  ['TomorrowEra', 12],
  ['FutureEra', 13],
  ['ArcticFuture', 14],
  ['OceanicFuture', 15],
  ['VirtualFuture', 16],
  ['SpaceAgeMars', 17],
  ['SpaceAgeAsteroidBelt', 18],
  ['SpaceAgeVenus', 19],
  ['SpaceAgeJupiterMoon', 20],
  ['SpaceAgeTitan', 21],
  ['SpaceAgeSpaceHub', 22],
  ['StellarAgeDiscovery', 23],
  ['SpaceAgeDiscovery', 23],
]);

const LEVEL_TO_AGE = new Map();
for (const [era, level] of AGE_TO_LEVEL) {
  if (!LEVEL_TO_AGE.has(level)) LEVEL_TO_AGE.set(level, era);
}

const ERA_ABBREVIATIONS = new Map([
  ['BronzeAge', 'BA'],
  ['IronAge', 'IA'],
  ['EarlyMiddleAge', 'EMA'],
  ['HighMiddleAge', 'HMA'],
  ['LateMiddleAge', 'LMA'],
  ['ColonialAge', 'CA'],
  ['IndustrialAge', 'InA'],
  ['ProgressiveEra', 'PE'],
  ['ModernEra', 'ME'],
  ['PostModernEra', 'PME'],
  ['ContemporaryEra', 'CE'],
  ['TomorrowEra', 'TE'],
  ['FutureEra', 'FE'],
  ['ArcticFuture', 'AF'],
  ['OceanicFuture', 'OF'],
  ['VirtualFuture', 'VF'],
  ['SpaceAgeMars', 'SAM'],
  ['SpaceAgeAsteroidBelt', 'SAAB'],
  ['SpaceAgeVenus', 'SAV'],
  ['SpaceAgeJupiterMoon', 'SAJM'],
  ['SpaceAgeTitan', 'SAT'],
  ['SpaceAgeSpaceHub', 'SASH'],
  ['StellarAgeDiscovery', 'SAD'],
  ['SpaceAgeDiscovery', 'SAD'],
  ['AllAge', 'AA'],
]);

function fLevelfromAge(age) {
  const level = AGE_TO_LEVEL.get(age);
  if (typeof level === 'number') return level;
  logger?.debug('Unknown era for level lookup', { age });
  return -1;
}

function fAgefromLevel(level) {
  // Legacy helper used loose equality (`level == 1`), which coerced numeric
  // strings. Preserve that behavior for backward compatibility.
  const age = LEVEL_TO_AGE.get(Number(level));
  if (typeof age === 'string') return age;
  logger?.debug('Unknown level for era lookup', { level });
  return -1;
}

function fEraAbbreviation(age) {
  return ERA_ABBREVIATIONS.get(age) ?? age;
}

const fGVGagesname = fEraAbbreviation;

module.exports = {
  numAges,
  fLevelfromAge,
  fAgefromLevel,
  fGVGagesname,
  fEraAbbreviation,
};
module.exports.default = module.exports;
