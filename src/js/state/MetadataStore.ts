/** Strict TypeScript mirror of the runtime metadata entity store. */
import type {
  GameEntityDefinition,
  MetadataStoreSubscriber,
  MetadataStoreSubscriberEvent,
} from '../../types/state';

let logger: { debug?: (...args: unknown[]) => void } | null = null;
let isDebugEnabled: () => boolean = () => false;
try {
  const logging = require('../utils/logger.js');
  logger = logging.createLogger('MetadataStore');
  isDebugEnabled = logging.isDebugEnabled;
} catch {}

function isEntityEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    const valA = objA[key];
    const valB = objB[key];
    if (valA === valB) continue;
    if (
      typeof valA === 'object' &&
      typeof valB === 'object' &&
      valA !== null &&
      valB !== null
    ) {
      if (JSON.stringify(valA) !== JSON.stringify(valB)) return false;
    } else {
      return false;
    }
  }
  return true;
}

export type MetadataId = string | number;

type Nullable<T> = T | null | undefined;

export type MetadataEntity = GameEntityDefinition;

export interface MetadataResource {
  id?: string;
  era?: string;
  [key: string]: unknown;
}

export interface MetadataTechnology {
  id?: string;
  [key: string]: unknown;
}

export interface MetadataUnit {
  unitTypeId?: string;
  id?: string;
  name?: string;
  era?: string;
  minEra?: string;
  [key: string]: unknown;
}

export interface MetadataEra {
  era: string;
  [key: string]: unknown;
}

export interface MetadataSet {
  id?: string;
  cityEntityIds?: string[];
  buildings?: string[];
  [key: string]: unknown;
}

export type MetadataChain = MetadataSet;

export interface MetadataUpgradeItem {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

export interface MetadataUpgradeStep {
  buildingIds?: string[];
  [key: string]: unknown;
}

export interface MetadataUpgrade {
  upgradeItem?: MetadataUpgradeItem;
  upgradeSteps?: MetadataUpgradeStep[];
  [key: string]: unknown;
}

export interface MetadataSelectionOption {
  name?: string;
  item?: { cityEntityId?: string; level?: number; [key: string]: unknown };
  [key: string]: unknown;
}

export interface MetadataSelectionKit {
  id?: string;
  selectionKitId?: string;
  name?: string;
  options?: MetadataSelectionOption[];
  [key: string]: unknown;
}

export interface MetadataAlly {
  id?: string;
  [key: string]: unknown;
}

export interface UpgradePathInfo {
  kitId: string;
  kitName?: string;
  level: number;
  maxLevel: number;
  chain: string[];
}

export type UpgradePath = UpgradePathInfo & {
  buildings: Array<MetadataEntity | { id: string }>;
};

export interface SelectionKitEntry {
  kitId: string;
  kitName?: string;
  optionName?: string;
  level?: number;
}

export type LegacyCityEntityProxy = Record<string, MetadataEntity>;

export class MetadataStore {
  entities: Map<string, MetadataEntity>;
  _reportedEntityMisses: Set<string>;
  resources: Map<string, MetadataResource>;
  technologies: Map<string, MetadataTechnology>;
  units: Map<string, MetadataUnit>;
  eras: Map<string, MetadataEra>;
  sets: Map<string, MetadataSet>;
  chains: Map<string, MetadataChain>;
  upgradeKits: Map<string, MetadataUpgrade>;
  selectionKits: Map<string, MetadataSelectionKit>;
  allies: Map<string, MetadataAlly>;
  lookupUrls: Map<string, string>;
  volcanoProvinces: unknown[];
  waterfallProvinces: unknown[];
  buildingDefs: unknown[];

  entityToUpgrade: Map<string, UpgradePathInfo>;
  entityToKits: Map<string, SelectionKitEntry[]>;
  entityToSet: Map<string, string>;
  entityToChain: Map<string, string>;

  _isReady: boolean;
  _readyPromise: Promise<void>;
  _resolveReady: () => void;
  _subscribers: Set<MetadataStoreSubscriber>;

  constructor() {
    this.reset();
  }

  reset(): void {
    logger?.debug('Metadata cache invalidated / reset');
    this.entities = new Map();
    this._reportedEntityMisses = new Set();
    this.resources = new Map();
    this.technologies = new Map();
    this.units = new Map();
    this.eras = new Map();
    this.sets = new Map();
    this.chains = new Map();
    this.upgradeKits = new Map();
    this.selectionKits = new Map();
    this.allies = new Map();
    this.lookupUrls = new Map();
    this.volcanoProvinces = [];
    this.waterfallProvinces = [];
    this.buildingDefs = [];

    this.entityToUpgrade = new Map();
    this.entityToKits = new Map();
    this.entityToSet = new Map();
    this.entityToChain = new Map();

    this._isReady = false;
    this._readyPromise = new Promise<void>((resolve) => {
      this._resolveReady = resolve;
    });
    this._subscribers = new Set();
  }

  whenReady(): Promise<void> {
    return this._readyPromise;
  }

  isReady(): boolean {
    return this._isReady;
  }

  markReady(): void {
    if (!this._isReady) {
      this._isReady = true;
      this._resolveReady();
      this.notifySubscribers({ type: 'ready' });
    }
  }

  subscribe(callback: MetadataStoreSubscriber): () => void {
    if (typeof callback !== 'function') return () => {};
    this._subscribers.add(callback);
    return () => this.unsubscribe(callback);
  }

  unsubscribe(callback: MetadataStoreSubscriber): void {
    this._subscribers.delete(callback);
  }

  notifySubscribers(data: MetadataStoreSubscriberEvent): void {
    for (const callback of this._subscribers) {
      try {
        callback(data);
      } catch (err) {
        console.warn('MetadataStore subscriber error:', err);
      }
    }
  }

  registerEntity(entity: Nullable<MetadataEntity>, notify = true): void {
    if (!entity || !entity.id) return;

    const existing = this.entities.get(entity.id);
    const isNew = !existing;
    const isChanged = !isNew && !isEntityEqual(existing, entity);

    if (!isNew && !isChanged) {
      return;
    }

    if (notify) logger?.debug('Entity cached:', entity.id);
    this.entities.set(entity.id, entity);

    if (entity.asset_id) {
      this.entities.set(entity.asset_id, entity);
    }

    if (Array.isArray(entity.entity_levels)) {
      entity.entity_levels.forEach((lvl) => {
        if (lvl && lvl.id) {
          const merged = { ...entity, ...lvl, name: lvl.name || entity.name };
          this.entities.set(lvl.id, merged);
          if (lvl.asset_id) this.entities.set(lvl.asset_id, merged);
        }
      });
    }

    if (typeof entity.id === 'string') {
      const rawEntityId = entity.id.replace(/^building_entity_/, '');
      this.entities.set(rawEntityId, entity);

      const cleanId = rawEntityId
        .replace(/^(W_|R_|X_|L_|D_|B_|M_|S_|P_|G_|Q_)/, '')
        .replace(/^(MultiAge_|AllAge_)/, '');
      if (cleanId) {
        if (!this.entities.has(cleanId)) this.entities.set(cleanId, entity);
        if (!this.entities.has(`building_entity_${cleanId}`))
          this.entities.set(`building_entity_${cleanId}`, entity);
        if (!this.entities.has(`W_MultiAge_${cleanId}`))
          this.entities.set(`W_MultiAge_${cleanId}`, entity);
        if (!this.entities.has(`R_MultiAge_${cleanId}`))
          this.entities.set(`R_MultiAge_${cleanId}`, entity);
        if (!this.entities.has(`M_MultiAge_${cleanId}`))
          this.entities.set(`M_MultiAge_${cleanId}`, entity);
        if (!this.entities.has(`M_AllAge_${cleanId}`))
          this.entities.set(`M_AllAge_${cleanId}`, entity);
      }
    }

    if (notify) {
      this.notifySubscribers({ type: 'entity', id: entity.id, entity });
    }
  }

  registerEntities(entities: Nullable<MetadataEntity[]>, notify = true): void {
    if (!Array.isArray(entities)) return;
    logger?.debug(
      `Batch caching ${entities.length} entities into MetadataStore`,
    );
    for (const entity of entities) {
      this.registerEntity(entity, false);
    }
    if (notify) {
      this.notifySubscribers({ type: 'entities', count: entities.length });
    }
  }

  registerLookupUrl(identifier: string, url: string): void {
    if (!identifier || !url) return;
    this.lookupUrls.set(identifier, url);
    if (
      typeof identifier === 'string' &&
      identifier.startsWith('building_entity_')
    ) {
      this.lookupUrls.set(identifier.replace('building_entity_', ''), url);
    }
  }

  registerBuildingSets(sets: Nullable<MetadataSet[]>): void {
    if (!Array.isArray(sets)) return;
    for (const s of sets) {
      if (!s.id) continue;
      this.sets.set(s.id, s);
      const ids = s.cityEntityIds || s.buildings || [];
      for (const bId of ids) {
        this.entityToSet.set(bId, s.id);
      }
    }
  }

  registerBuildingChains(chains: Nullable<MetadataChain[]>): void {
    if (!Array.isArray(chains)) return;
    for (const c of chains) {
      if (!c.id) continue;
      this.chains.set(c.id, c);
      const ids = c.cityEntityIds || c.buildings || [];
      for (const bId of ids) {
        this.entityToChain.set(bId, c.id);
      }
    }
  }

  registerBuildingUpgrades(upgrades: Nullable<MetadataUpgrade[]>): void {
    if (!Array.isArray(upgrades)) return;
    for (const u of upgrades) {
      const kitId = u.upgradeItem?.id;
      if (!kitId) continue;
      this.upgradeKits.set(kitId, u);

      const steps = (u.upgradeSteps || [])
        .map((s) => s.buildingIds || [])
        .flat();
      steps.forEach((bId, idx) => {
        this.entityToUpgrade.set(bId, {
          kitId,
          kitName: u.upgradeItem?.name,
          level: idx + 1,
          maxLevel: steps.length,
          chain: steps,
        });
      });
    }
  }

  registerSelectionKits(kits: Nullable<MetadataSelectionKit[]>): void {
    if (!Array.isArray(kits)) return;
    for (const k of kits) {
      const kitId = k.selectionKitId || k.id;
      if (!kitId) continue;
      this.selectionKits.set(kitId, k);

      for (const opt of k.options || []) {
        const bId = opt.item?.cityEntityId;
        if (bId) {
          if (!this.entityToKits.has(bId)) {
            this.entityToKits.set(bId, []);
          }
          this.entityToKits.get(bId).push({
            kitId,
            kitName: k.name,
            optionName: opt.name,
            level: opt.item?.level,
          });
        }
      }
    }
  }

  registerResources(resources: Nullable<MetadataResource[]>): void {
    if (!Array.isArray(resources)) return;
    for (const r of resources) {
      if (r.id) this.resources.set(r.id, r);
    }
  }

  registerTechnologies(
    techs: Nullable<MetadataTechnology[] | Record<string, MetadataTechnology>>,
  ): void {
    if (!techs) return;
    const list = Array.isArray(techs) ? techs : Object.values(techs);
    for (const t of list) {
      if (t.id) this.technologies.set(t.id, t);
    }
  }

  registerUnit(unit: Nullable<MetadataUnit>): void {
    if (!unit) return;
    const id = unit.unitTypeId || unit.id;
    if (id) {
      const normalized = {
        unitTypeId: id,
        id: id,
        name: unit.name || id,
        era: unit.era || unit.minEra || 'NoAge',
        minEra: unit.minEra || unit.era || 'NoAge',
        ...unit,
      };
      this.units.set(id, normalized);
    }
  }

  registerUnits(
    units: Nullable<MetadataUnit[] | Record<string, MetadataUnit>>,
  ): void {
    if (!units) return;
    const list = Array.isArray(units) ? units : Object.values(units);
    for (const u of list) {
      this.registerUnit(u);
    }
  }

  registerEras(eras: Nullable<MetadataEra[]>): void {
    if (!Array.isArray(eras)) return;
    for (const e of eras) {
      if (e.era) this.eras.set(e.era, e);
    }
  }

  registerAllies(allies: Nullable<MetadataAlly[]>): void {
    if (!Array.isArray(allies)) return;
    for (const a of allies) {
      if (a.id) this.allies.set(a.id, a);
    }
  }

  getEntity(id?: string | null): MetadataEntity | null {
    const found = this.peekEntity(id);
    this.reportEntityLookup(id, found);
    return found;
  }

  peekEntity(id?: string | null): MetadataEntity | null {
    if (!id) return null;
    let found =
      this.entities.get(id) ||
      this.entities.get(`building_entity_${id}`) ||
      this.entities.get(id.replace(/^building_entity_/, '')) ||
      null;

    if (!found && typeof id === 'string') {
      const cleanId = id
        .replace(/^building_entity_/, '')
        .replace(/^(W_|R_|X_|L_|D_|B_|M_|S_|P_|G_|Q_)/, '')
        .replace(/^(MultiAge_|AllAge_)/, '');
      if (cleanId) {
        found =
          this.entities.get(cleanId) ||
          this.entities.get(`W_MultiAge_${cleanId}`) ||
          this.entities.get(`R_MultiAge_${cleanId}`) ||
          this.entities.get(`M_MultiAge_${cleanId}`) ||
          this.entities.get(`M_AllAge_${cleanId}`) ||
          null;
      }
    }
    return found;
  }

  reportEntityLookup(id: Nullable<string>, found: MetadataEntity | null): void {
    if (!id) return;
    if (found) {
      this._reportedEntityMisses.delete(id);
    } else if (isDebugEnabled() && !this._reportedEntityMisses.has(id)) {
      if (this._reportedEntityMisses.size >= 4096) {
        this._reportedEntityMisses.delete(
          this._reportedEntityMisses.values().next().value,
        );
      }
      this._reportedEntityMisses.add(id);
      logger?.debug('Cache miss for entity:', id);
    }
  }

  getUpgradePath(id: string): UpgradePath | null {
    const info = this.entityToUpgrade.get(id);
    if (!info) return null;
    return {
      ...info,
      buildings: info.chain.map((bId) => this.getEntity(bId) || { id: bId }),
    };
  }

  getSelectionKits(id: string): SelectionKitEntry[] {
    return this.entityToKits.get(id) || [];
  }

  getSet(id: string): MetadataSet | null {
    const setId = this.entityToSet.get(id) || id;
    return this.sets.get(setId) || null;
  }

  getSetForEntity(id: string): string | null {
    return this.entityToSet.get(id) || null;
  }

  getChain(id: string): MetadataChain | null {
    const chainId = this.entityToChain.get(id) || id;
    return this.chains.get(chainId) || null;
  }

  getChainForEntity(id: string): string | null {
    return this.entityToChain.get(id) || null;
  }

  getResource(id: string): MetadataResource | null {
    return this.resources.get(id) || null;
  }

  getTechnology(id: string): MetadataTechnology | null {
    return this.technologies.get(id) || null;
  }

  getUnit(unitTypeId: string): MetadataUnit | null {
    return this.units.get(unitTypeId) || null;
  }

  getEra(eraKey: string): MetadataEra | null {
    return this.eras.get(eraKey) || null;
  }

  getAlly(allyId: string): MetadataAlly | null {
    return this.allies.get(allyId) || null;
  }

  getLookupUrl(id?: MetadataId | null): string | null {
    if (!id) return null;
    return (
      this.lookupUrls.get(String(id)) ||
      this.lookupUrls.get(`building_entity_${id}`) ||
      this.lookupUrls.get(String(id).replace(/^building_entity_/, '')) ||
      null
    );
  }

  createLegacyCityEntityProxy(): LegacyCityEntityProxy {
    return new Proxy({} as LegacyCityEntityProxy, {
      get: (_target, prop) => {
        if (typeof prop !== 'string') return undefined;
        return this.peekEntity(prop) || undefined;
      },
      has: (_target, prop) => {
        if (typeof prop !== 'string') return false;
        return this.peekEntity(prop) !== null;
      },
      set: (_target, prop, value) => {
        if (typeof prop === 'string' && value && typeof value === 'object') {
          const canonicalId = value.id || prop;
          if (prop === canonicalId) {
            this.registerEntity(value);
          } else {
            if (!this.entities.has(canonicalId)) {
              this.registerEntity({ ...value, id: canonicalId });
            }
            this.entities.set(prop, value);
          }
          return true;
        }
        return false;
      },
      ownKeys: () => {
        return Array.from(this.entities.keys());
      },
      getOwnPropertyDescriptor: (_target, prop) => {
        if (typeof prop === 'string' && this.peekEntity(prop)) {
          return {
            configurable: true,
            enumerable: true,
            writable: true,
            value: this.peekEntity(prop),
          };
        }
        return undefined;
      },
    });
  }
}

export const metadataStore = new MetadataStore();

export default { MetadataStore, metadataStore };
