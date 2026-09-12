/**
 * state.d.ts
 *
 * Ambient type contracts for FoE-Info state stores, registries, and calculation models.
 */

import type BigNumber from 'bignumber.js';

export interface GameEntityDefinition {
  id: string;
  name?: string;
  asset_id?: string;
  type?: string;
  era?: string;
  width?: number;
  length?: number;
  entity_levels?: Array<GameEntityDefinition & { level?: number }>;
  strategy_points_for_upgrade?: number[];
  requirements?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MetadataStoreSubscriberEvent {
  type: 'ready' | 'update' | string;
  [key: string]: unknown;
}

export type MetadataStoreSubscriber = (
  event: MetadataStoreSubscriberEvent,
) => void;

export interface MetadataStore {
  entities: Map<string, GameEntityDefinition>;
  resources: Map<string, unknown>;
  technologies: Map<string, unknown>;
  units: Map<string, unknown>;
  eras: Map<string, unknown>;
  sets: Map<string, unknown>;
  chains: Map<string, unknown>;
  upgradeKits: Map<string, unknown>;
  selectionKits: Map<string, unknown>;
  allies: Map<string, unknown>;
  lookupUrls: Map<string, unknown>;
  volcanoProvinces: unknown[];
  waterfallProvinces: unknown[];
  buildingDefs: unknown[];

  entityToUpgrade: Map<string, unknown>;
  entityToKits: Map<string, unknown>;
  entityToSet: Map<string, unknown>;
  entityToChain: Map<string, unknown>;

  reset(): void;
  whenReady(): Promise<void>;
  isReady(): boolean;
  markReady(): void;
  subscribe(callback: MetadataStoreSubscriber): () => void;
  unsubscribe(callback: MetadataStoreSubscriber): void;
  notifySubscribers(data: MetadataStoreSubscriberEvent): void;

  registerEntity(entity: GameEntityDefinition, notify?: boolean): void;
  getEntity(id: string): GameEntityDefinition | undefined;
  hasEntity(id: string): boolean;
  registerResource(resource: unknown): void;
  getResource(id: string): unknown;
  registerTechnology(tech: unknown): void;
  getTechnology(id: string): unknown;
  registerUnit(unit: unknown): void;
  getUnit(id: string): unknown;
  registerEra(era: unknown): void;
  getEra(id: string): unknown;
  registerSet(set: unknown): void;
  getSet(id: string): unknown;
  registerChain(chain: unknown): void;
  getChain(id: string): unknown;
  registerUpgradeKit(kit: unknown): void;
  registerSelectionKit(kit: unknown): void;
  registerAlly(ally: unknown): void;
  getAlly(id: string): unknown;

  getUpgradesForEntity(entityId: string): unknown[];
  getKitsForEntity(entityId: string): unknown[];
  getSetForEntity(entityId: string): unknown;
  getChainForEntity(entityId: string): unknown;
  getBuildingMetadata(cityEntityId: string): GameEntityDefinition | undefined;
  createLegacyCityEntityProxy(): Record<string, GameEntityDefinition>;
}

export interface PlayerCityInfo {
  name: string;
  era: string;
  id: number;
  guild: string;
  guildID: number;
  guildPosition: number;
  createdAt: number;
}

export interface CityEntityInstance {
  id?: number | string;
  cityentity_id?: string;
  type?: string;
  x?: number;
  y?: number;
  level?: number;
  connected?: boolean;
  state?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GoodsInventory {
  sad: number;
  sash: number;
  sat: number;
  sajm: number;
  sav: number;
  saab: number;
  sam: number;
  vf: number;
  of: number;
  af: number;
  fe: number;
  te: number;
  ce: number;
  pme: number;
  me: number;
  pe: number;
  ina: number;
  cma: number;
  lma: number;
  hma: number;
  ema: number;
  ia: number;
  ba: number;
  noage: number;
  [era: string]: number;
}

export interface CityState {
  debugEnabled: boolean;
  availablePacksFP: number;
  PlayerName: string;
  PlayerID: number;
  worlds: string[];
  language: string;
  MyInfo: PlayerCityInfo;
  MyGuildPermissions: Record<string, unknown>;
  ignoredPlayers: {
    ignoredByPlayerIds: Record<string, unknown>;
    ignoredPlayerIds: Record<string, unknown>;
  };
  playerNameCache: Record<string, string>;
  GBselected: {
    player: number;
    player_name: string;
    id: number;
    level: number;
    name: string;
    era: string;
    connected: boolean;
    max_level: number;
    current: number;
    total: number;
  };
  targetsTopic: string;
  targetText: string;
  Goods: GoodsInventory;
  Bonus: {
    aid: number;
    spoils: number;
    diplomatic: number;
    strike: number;
  };
  EpocTime: number;
  GameOrigin: string;
  donationPercent: number;
  donationSuffix: string;
  metadataLoaded: boolean;
  hiddenRewards: unknown[];
  GBGdata: unknown[];
  BattlegroundPerformance: unknown[];
  BGtime: string;
  GuildMembers: unknown[];
  ResourceDefs: unknown[];
  ResourceNames: string[];
  mainCityEntities?: CityEntityInstance[];
  visitedCityEntities?: CityEntityInstance[];
}

export interface GreatBuildingRecord {
  id?: number | string;
  cityentity_id?: string;
  name?: string;
  player_id?: number | string;
  player_name?: string;
  level: number;
  max_level?: number;
  current_progress: number;
  max_progress: number;
  rankings?: Array<{
    rank?: number;
    player?: { player_id?: number; name?: string };
    forge_points?: number;
    reward?: { strategy_point_amount?: number; strategy_points?: number };
  }>;
  [key: string]: unknown;
}

export interface GreatBuildingRegistry {
  gbRegistry: Map<string, GreatBuildingRecord>;
  calculateLevelCost(cityEntityId: string | object, level: number): number;
  registerGreatBuilding(
    entity: object,
    playerId?: number | string,
  ): GreatBuildingRecord | null;
  getGreatBuilding(
    entityId: string | number,
    playerId?: number | string,
  ): GreatBuildingRecord | undefined;
  hasGreatBuilding(
    entityId: string | number,
    playerId?: number | string,
  ): boolean;
  getAllGreatBuildings(): GreatBuildingRecord[];
  clearGreatBuildingRegistry(): void;
}

export interface GreatBuildingSpot {
  place: number;
  currentInvested: number;
  baseReward: number;
  rewardFP: number;
  donateCustom: number;
  lockFP: number;
  ownerAdd: number;
  isSafe: boolean;
  safeToDonate: boolean;
  levelWarning: boolean;
  danger: number;
  profit: number;
  worseProfit: boolean;
}

export function getSafePlaces(spots: GreatBuildingSpot[]): number[];

export interface GreatBuildingCalculationResult {
  spots: GreatBuildingSpot[];
  remaining: number;
  total: number;
  current: number;
  ownerSafeAdd?: number;
  level?: number;
}

export function setAvailablePacksFP(val: number): number;
