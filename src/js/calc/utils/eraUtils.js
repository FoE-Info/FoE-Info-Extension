/**
 * eraUtils.js
 *
 * InnoGames era chronology, building era resolution, and entity ID sanitization.
 */

const ERAS = [
  'StoneAge',
  'BronzeAge',
  'IronAge',
  'EarlyMiddleAge',
  'HighMiddleAge',
  'LateMiddleAge',
  'ColonialAge',
  'IndustrialAge',
  'ProgressiveEra',
  'ModernEra',
  'PostModernEra',
  'ContemporaryEra',
  'TomorrowEra',
  'FutureEra',
  'ArcticFuture',
  'OceanicFuture',
  'VirtualFuture',
  'SpaceAgeMars',
  'SpaceAgeAsteroidBelt',
  'SpaceAgeVenus',
  'SpaceAgeJupiterMoon',
  'SpaceAgeTitan',
  'SpaceAgeSpaceHub',
  'StellarAgeDiscovery',
];

const ERA_INDEX_MAP = new Map(ERAS.map((era, idx) => [era, idx]));

function getEraIndex(era) {
  if (!era) return -1;
  return ERA_INDEX_MAP.get(era) ?? -1;
}

function getEraByIndex(idx) {
  if (idx < 0 || idx >= ERAS.length) return null;
  return ERAS[idx];
}

function getPreviousEra(era) {
  const idx = getEraIndex(era);
  if (idx <= 1) return null; // BronzeAge is index 1, StoneAge is 0
  return ERAS[idx - 1];
}

function getNextEra(era) {
  const idx = getEraIndex(era);
  if (idx < 0 || idx >= ERAS.length - 1) return null;
  return ERAS[idx + 1];
}

function getBuildingEra(entity, playerEra = 'StellarAgeDiscovery') {
  if (!entity || !entity.cityentity_id) return playerEra;
  const parts = String(entity.cityentity_id).split('_');
  const prefixEra = parts[1];
  if (prefixEra === 'MultiAge' && entity.level != null) {
    return getEraByIndex(entity.level) || playerEra;
  }
  if (prefixEra && ERA_INDEX_MAP.has(prefixEra)) {
    return prefixEra;
  }
  return playerEra;
}

function cleanBaseEntityId(id) {
  if (!id) return '';
  return String(id)
    .replace(/^building_entity_/, '')
    .replace(/^(W_|R_|X_|L_|D_|B_|M_|S_|P_|G_|Q_)/, '')
    .replace(/^(MultiAge_|AllAge_)/, '');
}

const ERA_ACRONYMS = {
  StoneAge: 'Stone',
  BronzeAge: 'BA',
  IronAge: 'IA',
  EarlyMiddleAge: 'EMA',
  HighMiddleAge: 'HMA',
  LateMiddleAge: 'LMA',
  ColonialAge: 'CA',
  IndustrialAge: 'InA',
  ProgressiveEra: 'PE',
  ModernEra: 'ME',
  PostModernEra: 'PME',
  ContemporaryEra: 'CE',
  TomorrowEra: 'TE',
  FutureEra: 'FE',
  ArcticFuture: 'AF',
  OceanicFuture: 'OF',
  VirtualFuture: 'VF',
  SpaceAgeMars: 'SAM',
  SpaceAgeAsteroidBelt: 'SAAB',
  SpaceAgeVenus: 'SAV',
  SpaceAgeJupiterMoon: 'SAJM',
  SpaceAgeTitan: 'SAT',
  SpaceAgeSpaceHub: 'SASH',
  StellarAgeDiscovery: 'SAD',
  SpaceAgeDiscovery: 'SAD',
  AllAge: 'AA',
};

const ERA_ORDER = [
  'SAD',
  'SASH',
  'SAT',
  'SAJM',
  'SAV',
  'SAAB',
  'SAM',
  'VF',
  'OF',
  'AF',
  'FE',
  'TE',
  'CE',
  'PME',
  'ME',
  'PE',
  'INA',
  'CA',
  'LMA',
  'HMA',
  'EMA',
  'IA',
  'BA',
  'STONE',
  'NOAGE',
  'AA',
];

function getEraAcronym(era) {
  if (!era) return '';
  return ERA_ACRONYMS[era] || String(era).toUpperCase();
}

module.exports = {
  ERAS,
  ERA_ACRONYMS,
  ERA_ORDER,
  getEraAcronym,
  getEraIndex,
  getEraByIndex,
  getPreviousEra,
  getNextEra,
  getBuildingEra,
  cleanBaseEntityId,
};
module.exports.default = module.exports;
