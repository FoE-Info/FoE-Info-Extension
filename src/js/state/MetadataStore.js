/**
 * MetadataStore.js
 *
 * Unified reactive repository for all Forge of Empires game metadata and definitions.
 * Stores raw InnoGames datasets without discard filters (0 ignored classes),
 * and coordinates bidirectional relational indexes for upgrades, selection kits,
 * sets, chains, military units, and technologies.
 */

const {
  isEntityEqual,
  indexEntityAliases,
  peekEntity,
  reportEntityLookup,
} = require('./entityResolver.js');
const {
  MetadataRelations,
  RELATION_PROPERTIES,
} = require('./metadataRelations.js');
const {
  MetadataDomainCollections,
  COLLECTION_PROPERTIES,
} = require('./metadataDomainCollections.js');
const { createLegacyCityEntityProxy } = require('./legacyEntityProxy.js');

let logger = null;
try {
  const logging = require('../utils/logger.js');
  logger = logging.createLogger('MetadataStore');
} catch {}

class MetadataStore {
  constructor() {
    this._relations = new MetadataRelations();
    this._collections = new MetadataDomainCollections();
    this.reset();
  }

  reset() {
    logger?.debug('Metadata cache invalidated / reset');
    this.entities = new Map();
    this._reportedEntityMisses = new Set();

    this._relations?.reset();
    this._collections?.reset();

    // Lifecycle Synchronization
    this._isReady = false;
    this._readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve;
    });
    this._subscribers = new Set();
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
      this.notifySubscribers({ type: 'ready' });
    }
  }

  subscribe(callback) {
    if (typeof callback !== 'function') return () => {};
    this._subscribers.add(callback);
    return () => this.unsubscribe(callback);
  }

  unsubscribe(callback) {
    this._subscribers.delete(callback);
  }

  notifySubscribers(data) {
    for (const callback of this._subscribers) {
      try {
        callback(data);
      } catch (err) {
        console.warn('MetadataStore subscriber error:', err);
      }
    }
  }

  // --- Entity Ingestion & Indexing ---

  registerEntity(entity, notify = true) {
    if (!entity || !entity.id) return;

    const existing = this.entities.get(entity.id);
    const isNew = !existing;
    const isChanged = !isNew && !isEntityEqual(existing, entity);

    if (!isNew && !isChanged) return;

    if (notify) logger?.debug('Entity cached:', entity.id);
    indexEntityAliases(this.entities, entity);

    if (notify) {
      this.notifySubscribers({ type: 'entity', id: entity.id, entity });
    }
  }

  registerEntities(entities, notify = true) {
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

  // --- Delegation: Domain Collections ---

  registerLookupUrl(id, url) {
    this._collections.registerLookupUrl(id, url);
  }
  getLookupUrl(id) {
    return this._collections.getLookupUrl(id);
  }
  registerResources(res) {
    this._collections.registerResources(res);
  }
  getResource(id) {
    return this._collections.getResource(id);
  }
  registerTechnologies(techs) {
    this._collections.registerTechnologies(techs);
  }
  getTechnology(id) {
    return this._collections.getTechnology(id);
  }
  registerUnit(unit) {
    this._collections.registerUnit(unit);
  }
  registerUnits(units) {
    this._collections.registerUnits(units);
  }
  getUnit(unitTypeId) {
    return this._collections.getUnit(unitTypeId);
  }
  registerEras(eras) {
    this._collections.registerEras(eras);
  }
  getEra(eraKey) {
    return this._collections.getEra(eraKey);
  }
  registerAllies(allies) {
    this._collections.registerAllies(allies);
  }
  getAlly(allyId) {
    return this._collections.getAlly(allyId);
  }

  // --- Delegation: Relational Indexes ---

  registerBuildingSets(sets) {
    this._relations.registerBuildingSets(sets);
  }
  getSet(id) {
    return this._relations.getSet(id);
  }
  getSetForEntity(id) {
    return this._relations.getSetForEntity(id);
  }
  registerBuildingChains(chains) {
    this._relations.registerBuildingChains(chains);
  }
  getChain(id) {
    return this._relations.getChain(id);
  }
  getChainForEntity(id) {
    return this._relations.getChainForEntity(id);
  }
  registerBuildingUpgrades(upgrades) {
    this._relations.registerBuildingUpgrades(upgrades);
  }
  getUpgradePath(id) {
    return this._relations.getUpgradePath(id, (bId) => this.getEntity(bId));
  }
  registerSelectionKits(kits) {
    this._relations.registerSelectionKits(kits);
  }
  getSelectionKits(id) {
    return this._relations.getSelectionKits(id);
  }

  // --- Query API: Entity ---

  getEntity(id) {
    const found = this.peekEntity(id);
    this.reportEntityLookup(id, found);
    return found;
  }

  peekEntity(id) {
    return peekEntity(this.entities, id);
  }

  reportEntityLookup(id, found) {
    reportEntityLookup(this._reportedEntityMisses, id, found);
  }

  createLegacyCityEntityProxy() {
    return createLegacyCityEntityProxy(this);
  }
}

function defineProxyProps(target, sourceKey, props) {
  for (const prop of props) {
    Object.defineProperty(target, prop, {
      get() {
        return this[sourceKey][prop];
      },
      set(val) {
        this[sourceKey][prop] = val;
      },
      configurable: true,
      enumerable: true,
    });
  }
}

defineProxyProps(MetadataStore.prototype, '_relations', RELATION_PROPERTIES);
defineProxyProps(
  MetadataStore.prototype,
  '_collections',
  COLLECTION_PROPERTIES,
);

module.exports = {
  MetadataStore,
  metadataStore: new MetadataStore(),
};
module.exports.default = module.exports;
