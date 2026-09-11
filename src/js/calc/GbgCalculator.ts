/**
 * GbgCalculator.ts
 *
 * Pure typed calculation engine for Guild Battlegrounds (GBG).
 * Handles attrition reduction percentages, connected province camp math,
 * 80% maximum reduction caps, sector name abbreviations, and target string tokens.
 * Zero DOM dependencies (no window, document, or jQuery).
 */

export interface PlacedBuilding {
  id: string;
  readyAt: number;
}

export interface ConnectedProvince {
  ownerId?: number;
  placedBuildings?: PlacedBuilding[];
  [key: string]: unknown;
}

export interface ProvinceAttritionOptions {
  connectedProvinces?: ConnectedProvince[];
  currentParticipantId?: number;
  currentEpoc?: number;
  gainAttritionChance?: number;
}

export interface ProvinceAttritionResult {
  campsReady: number;
  campsNotReady: number;
  attritionChance: number;
  underConstructionChance: number;
}

export interface TargetTokenOptions {
  sectorTag: string;
  targetText?: string;
  campsText?: string;
  timeText?: string;
}

/**
 * Maximum attrition reduction percentage allowed by InnoGames game mechanics.
 */
export const MAX_ATTRITION_REDUCTION = 80;

/**
 * Maps building IDs to their base attrition reduction percentage.
 *
 * @param buildingId The building entity ID or partial ID
 * @returns Attrition reduction percentage (0 to 80)
 */
export function getAttritionReduction(buildingId: string): number {
  if (!buildingId || typeof buildingId !== 'string') return 0;

  if (buildingId === 'watchtower') return 8;
  if (buildingId === 'guild_command_post_improvised') return 20;
  if (buildingId === 'guild_command_post_forward') return 40;
  if (buildingId === 'guild_command_post_fortified') return 60;
  if (buildingId === 'barracks_improvised') return 20;
  if (buildingId === 'barracks') return 40;
  if (buildingId === 'barracks_reinforced') return 60;
  if (buildingId === 'guild_fieldcamp_small') return 26;
  if (buildingId === 'guild_fieldcamp') return 52;
  if (buildingId === 'guild_fieldcamp_fortified') return 80;

  if (buildingId.includes('basic_field_outpost_')) return 20;
  if (buildingId.includes('regular_field_outpost_')) return 40;
  if (buildingId.includes('advanced_field_outpost_')) return 60;
  if (buildingId.includes('basic_guild_fortress_')) return 26;
  if (buildingId.includes('regular_guild_fortress_')) return 52;
  if (buildingId.includes('advanced_guild_fortress_')) return 80;

  return 0;
}

/**
 * Calculates ready and under-construction reduction from connected friendly provinces,
 * enforces the 80% maximum reduction cap, and computes final attrition chances.
 */
export function calculateProvinceAttrition(
  options: ProvinceAttritionOptions = {},
): ProvinceAttritionResult {
  let campsReady = 0;
  let campsNotReady = 0;

  const currentEpoc =
    (
      typeof options.currentEpoc === 'number' &&
      options.currentEpoc > 1000000000
    ) ?
      options.currentEpoc
    : Math.floor(Date.now() / 1000);

  if (Array.isArray(options.connectedProvinces)) {
    for (const province of options.connectedProvinces) {
      if (!province) continue;
      if (
        options.currentParticipantId !== undefined &&
        province.ownerId !== options.currentParticipantId
      ) {
        continue;
      }
      if (Array.isArray(province.placedBuildings)) {
        for (const building of province.placedBuildings) {
          if (!building || !building.id) continue;
          const att = getAttritionReduction(building.id);
          if (att <= 0) continue;

          const readyAt = building.readyAt || 0;
          const readySeconds =
            readyAt > 1e11 ? Math.floor(readyAt / 1000) : readyAt;

          if (readySeconds <= currentEpoc) {
            campsReady += att;
          } else {
            campsNotReady += att;
          }
        }
      }
    }
  }

  if (typeof options.gainAttritionChance === 'number') {
    const serverReduction = Math.max(0, 100 - options.gainAttritionChance);
    if (serverReduction > campsReady) {
      const rushedReduction = serverReduction - campsReady;
      campsReady = serverReduction;
      campsNotReady = Math.max(0, campsNotReady - rushedReduction);
    }
  }

  if (campsReady > MAX_ATTRITION_REDUCTION) {
    campsReady = MAX_ATTRITION_REDUCTION;
  }
  if (campsNotReady > 0) {
    campsNotReady = Math.max(
      0,
      Math.min(MAX_ATTRITION_REDUCTION - campsReady, campsNotReady),
    );
  }

  const attritionChance = Math.max(20, Math.min(100, 100 - campsReady));
  const underConstructionChance = Math.max(
    20,
    Math.min(100, 100 - (campsReady + campsNotReady)),
  );

  return {
    campsReady,
    campsNotReady,
    attritionChance,
    underConstructionChance,
  };
}

/**
 * Shortens raw sector names based on map topology.
 * Volcano: 2-char ring + 1st char of quadrant (e.g., 'A1S Central' -> 'A1C', 'D4H Hold' -> 'D4H').
 * Waterfall: 3-char prefix (e.g., 'A1 Waterfall' -> 'A1', 'A1A Archipelago' -> 'A1A').
 */
export function formatSectorName(
  rawName: string,
  mapName: string = '',
): string {
  if (!rawName || typeof rawName !== 'string') return '';
  const parts = rawName.trim().split(/\s+/);
  const isWaterfall =
    typeof mapName === 'string' &&
    mapName.trim().toLowerCase().includes('waterfall');

  if (isWaterfall) {
    return (parts[0] || '').slice(0, 3);
  }

  const p0 = (parts[0] || '').slice(0, 2);
  const p1 = parts[1] ? parts[1].charAt(0) : '';
  return p0 + p1;
}

/**
 * Formats siege camp attrition reduction percentage text.
 * Outputs: `(X%)`, `(Y% UC)`, `(X% / Y% UC)`, or `(! SC)`.
 */
export function formatCampsText(
  campsReady: number,
  campsNotReady: number,
  showCamps: boolean,
): string {
  if (!showCamps) return '';

  const ready = Number(campsReady) || 0;
  const notReady = Number(campsNotReady) || 0;

  if (ready > 0 && notReady <= 0) {
    return `(${100 - ready}%)`;
  }
  if (notReady > 0 && ready <= 0) {
    return `(${100 - notReady}% UC)`;
  }
  if (ready > 0 && notReady > 0) {
    return `(${100 - ready}% / ${100 - ready - notReady}% UC)`;
  }
  return '(! SC)';
}

/**
 * Strictly formats target tokens in invariant order:
 * `[sectorTag] [targetText] [campsText] [timeText]`
 */
export function formatTargetToken(options: TargetTokenOptions): string {
  const parts: string[] = [];

  const sectorTag = (options.sectorTag || '').trim();
  if (sectorTag) parts.push(sectorTag);

  const targetText = (options.targetText || '').trim();
  if (targetText) parts.push(targetText);

  const campsText = (options.campsText || '').trim();
  if (campsText) parts.push(campsText);

  const timeText = (options.timeText || '').trim();
  if (timeText) parts.push(timeText);

  return parts.join(' ');
}

export default {
  MAX_ATTRITION_REDUCTION,
  getAttritionReduction,
  calculateProvinceAttrition,
  formatSectorName,
  formatCampsText,
  formatTargetToken,
};
