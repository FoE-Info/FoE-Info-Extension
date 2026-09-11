/**
 * eraUtils.ts
 *
 * InnoGames era chronology, building era resolution, and entity ID sanitization.
 * Zero DOM dependencies.
 */

export const ERAS = [
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
] as const;

export type EraName = (typeof ERAS)[number];

export const ERA_INDEX_MAP: ReadonlyMap<string, number> = new Map(
  ERAS.map((era, idx) => [era, idx]),
);

export function getEraIndex(era?: string | null): number {
  if (!era) return -1;
  return ERA_INDEX_MAP.get(era) ?? -1;
}

export function getEraByIndex(idx: number): string | null {
  if (idx < 0 || idx >= ERAS.length) return null;
  return ERAS[idx];
}

export function getPreviousEra(era?: string | null): string | null {
  const idx = getEraIndex(era);
  if (idx <= 1) return null; // BronzeAge is index 1, StoneAge is 0
  return ERAS[idx - 1];
}

export function getNextEra(era?: string | null): string | null {
  const idx = getEraIndex(era);
  if (idx < 0 || idx >= ERAS.length - 1) return null;
  return ERAS[idx + 1];
}

export interface BuildingEntityEraCandidate {
  cityentity_id?: string | null;
  level?: number | null;
  [key: string]: unknown;
}

export function getBuildingEra(
  entity?: BuildingEntityEraCandidate | null,
  playerEra: string = 'StellarAgeDiscovery',
): string {
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

export function cleanBaseEntityId(id?: string | number | null): string {
  if (!id) return '';
  return String(id)
    .replace(/^building_entity_/, '')
    .replace(/^(W_|R_|X_|L_|D_|B_|M_|S_|P_|G_|Q_)/, '')
    .replace(/^(MultiAge_|AllAge_)/, '');
}

export const ERA_ACRONYMS: Readonly<Record<string, string>> = {
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

export const ERA_ORDER: readonly string[] = [
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

export function getEraAcronym(era?: string | null): string {
  if (!era) return '';
  return ERA_ACRONYMS[era] || String(era).toUpperCase();
}

export default {
  ERAS,
  ERA_INDEX_MAP,
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
