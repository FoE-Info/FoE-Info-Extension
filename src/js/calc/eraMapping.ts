/**
 * eraMapping.ts
 *
 * TypeScript mirror for pure era level/name mapping helpers.
 * Zero DOM references: safe for headless, Node.js, and unit test environments.
 */

export interface EraMappingLogger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

let logger: EraMappingLogger | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('EraMapping');
} catch {
  logger = null;
}

export const numAges = 23;

export const AGE_TO_LEVEL: Map<string, number> = new Map([
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

export const LEVEL_TO_AGE: Map<number, string> = new Map();
for (const [era, level] of AGE_TO_LEVEL) {
  if (!LEVEL_TO_AGE.has(level)) LEVEL_TO_AGE.set(level, era);
}

export const ERA_ABBREVIATIONS: Map<string, string> = new Map([
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

export function fLevelfromAge(age: string): number {
  const level = AGE_TO_LEVEL.get(age);
  if (typeof level === 'number') return level;
  logger?.debug('Unknown era for level lookup', { age });
  return -1;
}

export function fAgefromLevel(level: number | string): string | number {
  const age = LEVEL_TO_AGE.get(Number(level));
  if (typeof age === 'string') return age;
  logger?.debug('Unknown level for era lookup', { level });
  return -1;
}

export function fEraAbbreviation(age: string): string {
  return ERA_ABBREVIATIONS.get(age) ?? age;
}

export const fGVGagesname = fEraAbbreviation;

const eraMapping = {
  numAges,
  AGE_TO_LEVEL,
  LEVEL_TO_AGE,
  ERA_ABBREVIATIONS,
  fLevelfromAge,
  fAgefromLevel,
  fGVGagesname,
  fEraAbbreviation,
};

export default eraMapping;
