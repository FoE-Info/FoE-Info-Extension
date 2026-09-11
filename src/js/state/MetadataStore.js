/**
 * MetadataStore.js
 *
 * Unified reactive repository for all Forge of Empires game metadata and definitions.
 * Stores raw InnoGames datasets without discard filters (0 ignored classes),
 * and maintains bidirectional relational indexes for upgrades, selection kits,
 * sets, chains, military units, and technologies.
 */

class MetadataStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.entities = new Map();
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

    // Relational Inverted Indexes
    this.entityToUpgrade = new Map();
    this.entityToKits = new Map();
    this.entityToSet = new Map();
    this.entityToChain = new Map();

    // Lifecycle Synchronization
    this._isReady = false;
    this._readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve;
    });
  }

  whenReady() {
    return this._readyPromise;
  }

  isReady() {
    return this._isReady;
  }

  markReady() {
    if (!this._isReady) {
      this._isReady = true;
      this._resolveReady();
    }
  }

  // --- Entity Ingestion & Indexing ---

  registerEntity(entity) {
    if (!entity || !entity.id) return;
    this.entities.set(entity.id, entity);

    if (entity.asset_id) {
      this.entities.set(entity.asset_id, entity);
    }

    // Index sub-levels if present
    if (Array.isArray(entity.entity_levels)) {
      entity.entity_levels.forEach((lvl) => {
        if (lvl && lvl.id) {
          const merged = { ...entity, ...lvl, name: lvl.name || entity.name };
          this.entities.set(lvl.id, merged);
          if (lvl.asset_id) this.entities.set(lvl.asset_id, merged);
        }
      });
    }

    // Strip building_entity_ prefix alias
    if (
      typeof entity.id === 'string' &&
      entity.id.startsWith('building_entity_')
    ) {
      const alias = entity.id.replace('building_entity_', '');
      this.entities.set(alias, entity);
    }
  }

  registerLookupUrl(identifier, url) {
    if (!identifier || !url) return;
    this.lookupUrls.set(identifier, url);
    if (
      typeof identifier === 'string' &&
      identifier.startsWith('building_entity_')
    ) {
      this.lookupUrls.set(identifier.replace('building_entity_', ''), url);
    }
  }

  registerBuildingSets(sets) {
    if (!Array.isArray(sets)) return;
    for (const s of sets) {
      if (!s.id) continue;
      this.sets.set(s.id, s);
      for (const bId of s.cityEntityIds || []) {
        this.entityToSet.set(bId, s.id);
      }
    }
  }

  registerBuildingChains(chains) {
    if (!Array.isArray(chains)) return;
    for (const c of chains) {
      if (!c.id) continue;
      this.chains.set(c.id, c);
      for (const bId of c.cityEntityIds || []) {
        this.entityToChain.set(bId, c.id);
      }
    }
  }

  registerBuildingUpgrades(upgrades) {
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

  registerSelectionKits(kits) {
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

  registerResources(resources) {
    if (!Array.isArray(resources)) return;
    for (const r of resources) {
      if (r.id) this.resources.set(r.id, r);
    }
  }

  registerTechnologies(techs) {
    if (!techs) return;
    const list = Array.isArray(techs) ? techs : Object.values(techs);
    for (const t of list) {
      if (t.id) this.technologies.set(t.id, t);
    }
  }

  registerUnit(unit) {
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

  registerUnits(units) {
    if (!units) return;
    const list = Array.isArray(units) ? units : Object.values(units);
    for (const u of list) {
      this.registerUnit(u);
    }
  }

  registerEras(eras) {
    if (!Array.isArray(eras)) return;
    for (const e of eras) {
      if (e.era) this.eras.set(e.era, e);
    }
  }

  registerAllies(allies) {
    if (!Array.isArray(allies)) return;
    for (const a of allies) {
      if (a.id) this.allies.set(a.id, a);
    }
  }

  // --- Query API ---

  getEntity(id) {
    if (!id) return null;
    return (
      this.entities.get(id) ||
      this.entities.get(`building_entity_${id}`) ||
      this.entities.get(id.replace(/^building_entity_/, '')) ||
      null
    );
  }

  getUpgradePath(id) {
    const info = this.entityToUpgrade.get(id);
    if (!info) return null;
    return {
      ...info,
      buildings: info.chain.map((bId) => this.getEntity(bId) || { id: bId }),
    };
  }

  getSelectionKits(id) {
    return this.entityToKits.get(id) || [];
  }

  getSet(id) {
    const setId = this.entityToSet.get(id) || id;
    return this.sets.get(setId) || null;
  }

  getChain(id) {
    const chainId = this.entityToChain.get(id) || id;
    return this.chains.get(chainId) || null;
  }

  getResource(id) {
    return this.resources.get(id) || null;
  }

  getTechnology(id) {
    return this.technologies.get(id) || null;
  }

  getUnit(unitTypeId) {
    return this.units.get(unitTypeId) || null;
  }

  getEra(eraKey) {
    return this.eras.get(eraKey) || null;
  }

  getAlly(allyId) {
    return this.allies.get(allyId) || null;
  }

  getLookupUrl(id) {
    if (!id) return null;
    return (
      this.lookupUrls.get(id) ||
      this.lookupUrls.get(`building_entity_${id}`) ||
      this.lookupUrls.get(String(id).replace(/^building_entity_/, '')) ||
      null
    );
  }

  // --- Backward Compatibility Facade ---

  createLegacyCityEntityProxy() {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (typeof prop !== 'string') return undefined;
          return this.getEntity(prop) || undefined;
        },
        has: (_target, prop) => {
          if (typeof prop !== 'string') return false;
          return this.getEntity(prop) !== null;
        },
        set: (_target, prop, value) => {
          if (typeof prop === 'string' && value && typeof value === 'object') {
            this.registerEntity({ ...value, id: value.id || prop });
            return true;
          }
          return false;
        },
        ownKeys: () => {
          return Array.from(this.entities.keys());
        },
        getOwnPropertyDescriptor: (_target, prop) => {
          if (typeof prop === 'string' && this.getEntity(prop)) {
            return {
              configurable: true,
              enumerable: true,
              writable: true,
              value: this.getEntity(prop),
            };
          }
          return undefined;
        },
      },
    );
  }
}

module.exports = {
  MetadataStore,
  metadataStore: new MetadataStore(),
};
module.exports.default = module.exports;
