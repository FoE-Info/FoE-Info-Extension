/**
 * CityDomainState.js
 *
 * Unified reactive state domain for city data and city subsystems:
 * - CityState (active player city stats, boosts, totals)
 * - BonusState (server-boost limited bonus totals)
 * - IncidentState (city map incidents & server time)
 * - OutpostState (cultural settlements & advancements)
 * - ResourceState (goods inventory & FP packages)
 * - BlueGalaxyState (Blue Galaxy double collection charges & candidates)
 */

const {
  createGalaxyCandidate,
  filterAndSortGalaxyCandidates,
  updateCandidateState,
} = require('../calc/BlueGalaxyCalculator.js');

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('CityDomainState');
} catch {}

// ============================================================================
// 1. ACTIVE CITY STATE
// ============================================================================

function createFreshCityState() {
  return {
    ArcBonus: 90,
    ChatBonus: 0,
    ForgePoints: 0,
    baseBoostableFp: 0,
    baseUnboostableFp: 0,
    fpProductionBoost: 0,
    goodsProductionBoost: 0,
    guildGoodsProductionBoost: 0,
    TrazUnits: 0,
    Coins: 0,
    CoinBoost: 0,
    SupplyBoost: 0,
    Attack: 0,
    Defense: 0,
    CityAttack: 0,
    CityDefense: 0,
    GEAttackingAttack: 0,
    GEAttackingDefense: 0,
    GEDefendingAttack: 0,
    GEDefendingDefense: 0,
    GBGAttackingAttack: 0,
    GBGAttackingDefense: 0,
    GBGDefendingAttack: 0,
    GBGDefendingDefense: 0,
    QIAttackingAttack: 0,
    QIAttackingDefense: 0,
    QIDefendingAttack: 0,
    QIDefendingDefense: 0,
    SoH: 0,
    tGE: 0,
    AOCriticalStrike: 0,
    CCCriticalStrike: 0,
    CriticalStrike: 0,
  };
}

const City = createFreshCityState();

function getCityState() {
  return City;
}

function resetCityState(target = City) {
  const fresh = createFreshCityState();
  for (const key of Object.keys(target)) {
    if (!(key in fresh)) {
      delete target[key];
    }
  }
  Object.assign(target, fresh);
  return target;
}

// ============================================================================
// 2. BONUS STATE
// ============================================================================

class BonusState {
  constructor({ logger: log = logger } = {}) {
    this.bonusHTML = '';
    this.limitedBonuses = [];
    this.aid = 0;
    this.spoils = 0;
    this.diplomatic = 0;
    this.strike = 0;
    this.dailyForgePoints = null;
    this.subscribers = new Set();
    this.logger = log;
  }

  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  unsubscribe(fn) {
    this.subscribers.delete(fn);
  }

  notify(channel = 'bonus') {
    for (const fn of this.subscribers) {
      try {
        fn(this, channel);
      } catch (err) {
        this.logger?.error?.('Reactive subscriber failed', {
          channel,
          error: err?.message || String(err),
        });
      }
    }
  }

  setSummary({
    bonusHTML = '',
    limitedBonuses = [],
    aid = 0,
    spoils = 0,
    diplomatic = 0,
    strike = 0,
    dailyForgePoints = null,
  } = {}) {
    this.bonusHTML = bonusHTML || '';
    this.limitedBonuses = Array.isArray(limitedBonuses) ? limitedBonuses : [];
    this.aid = Number(aid) || 0;
    this.spoils = Number(spoils) || 0;
    this.diplomatic = Number(diplomatic) || 0;
    this.strike = Number(strike) || 0;
    this.dailyForgePoints =
      dailyForgePoints != null ? Number(dailyForgePoints) : null;
    this.notify('bonus');
  }

  getLimitedBonuses() {
    return this.limitedBonuses;
  }

  getBonusHTML() {
    return this.bonusHTML;
  }

  getSummary() {
    return {
      aid: this.aid,
      spoils: this.spoils,
      diplomatic: this.diplomatic,
      strike: this.strike,
    };
  }

  getAid() {
    return this.aid;
  }

  getSpoils() {
    return this.spoils;
  }

  getDiplomatic() {
    return this.diplomatic;
  }

  getStrike() {
    return this.strike;
  }

  getDailyForgePoints() {
    return this.dailyForgePoints;
  }
}

// ============================================================================
// 3. INCIDENT STATE
// ============================================================================

class IncidentState {
  constructor({ logger: log = logger } = {}) {
    this.incidents = [];
    this.serverTime = 0;
    this.subscribers = new Set();
    this.logger = log;
  }

  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  unsubscribe(fn) {
    this.subscribers.delete(fn);
  }

  notify(channel = 'all') {
    for (const fn of this.subscribers) {
      try {
        fn(this, channel);
      } catch (err) {
        this.logger?.error?.('Reactive subscriber failed', {
          channel,
          error: err?.message || String(err),
        });
      }
    }
  }

  setIncidents(incidents) {
    this.incidents = Array.isArray(incidents) ? incidents : [];
    this.notify('incidents');
  }

  getIncidents() {
    return this.incidents;
  }

  setServerTime(time) {
    this.serverTime = Number(time) || 0;
    this.notify('serverTime');
  }

  getServerTime() {
    return this.serverTime;
  }
}

// ============================================================================
// 4. OUTPOST STATE
// ============================================================================

class OutpostState {
  constructor({ logger: log = logger } = {}) {
    this.culturalPanel = null;
    this.subscribers = new Set();
    this.logger = log;
  }

  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  unsubscribe(fn) {
    this.subscribers.delete(fn);
  }

  notify(channel = 'cultural') {
    for (const fn of this.subscribers) {
      try {
        fn(this, channel);
      } catch (err) {
        this.logger?.error?.('Reactive subscriber failed', {
          channel,
          error: err?.message || String(err),
        });
      }
    }
  }

  setCulturalPanel(payload) {
    this.culturalPanel = payload || null;
    this.notify('cultural');
  }

  getCulturalPanel() {
    return this.culturalPanel;
  }
}

// ============================================================================
// 5. RESOURCE STATE
// ============================================================================

class ResourceState {
  constructor({ logger: log = logger } = {}) {
    this.goodsRender = null;
    this.availablePacksFP = null;
    this.globals = null;
    this.subscribers = new Set();
    this.logger = log;
  }

  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  unsubscribe(fn) {
    this.subscribers.delete(fn);
  }

  notify(channel = 'all') {
    for (const fn of this.subscribers) {
      try {
        fn(this, channel);
      } catch (err) {
        this.logger?.error?.('Reactive subscriber failed', {
          channel,
          error: err?.message || String(err),
        });
      }
    }
  }

  renderGoods(payload) {
    this.goodsRender = payload || null;
    this.notify('goods');
  }

  getGoodsRender() {
    return this.goodsRender;
  }

  setAvailableForgePoints(value) {
    this.availablePacksFP = value;
    this.notify('fp');
  }

  getAvailableForgePoints() {
    return this.availablePacksFP;
  }

  setGlobals(globals) {
    this.globals = globals || null;
    this.notify('globals');
  }

  getGlobals() {
    return this.globals;
  }

  requestClearGoods() {
    this.notify('clear');
  }
}

// ============================================================================
// 6. BLUE GALAXY STATE
// ============================================================================

class BlueGalaxyState {
  constructor() {
    this.charges = 0;
    this.candidates = [];
    this.renderCallback = null;
    this.legacyShim = null;
  }

  setRenderCallback(fn) {
    this.renderCallback = typeof fn === 'function' ? fn : null;
  }

  notify() {
    if (this.legacyShim) {
      this.legacyShim.amount = this.charges;
      this.legacyShim.bonus = this.candidates;
    }
    if (typeof this.renderCallback === 'function') {
      this.renderCallback(this);
    }
  }

  reset() {
    this.candidates = [];
    this.notify();
  }

  setCharges(amount) {
    this.charges = Math.max(0, Number(amount) || 0);
    this.notify();
  }

  setCandidates(candidates) {
    this.candidates = filterAndSortGalaxyCandidates(candidates || []);
    this.notify();
  }

  addEntity(
    entity,
    metadataStore = null,
    nameResolver = null,
    shouldNotify = true,
  ) {
    const candidate = createGalaxyCandidate(
      entity,
      metadataStore,
      nameResolver,
    );
    if (!candidate) return;

    const existingIdx = this.candidates.findIndex((c) => c.id === candidate.id);
    if (existingIdx >= 0) {
      this.candidates[existingIdx] = candidate;
    } else {
      this.candidates.push(candidate);
    }

    this.candidates = filterAndSortGalaxyCandidates(this.candidates);
    if (shouldNotify) {
      this.notify();
    }
  }

  updateEntity(updatedEntity) {
    if (!updatedEntity) return;
    updateCandidateState(this.candidates, updatedEntity);
    this.candidates = filterAndSortGalaxyCandidates(this.candidates);
    this.notify();
  }

  getLegacyShim() {
    if (!this.legacyShim) {
      const self = this;
      this.legacyShim = {
        get amount() {
          return self.charges;
        },
        set amount(val) {
          self.charges = Math.max(0, Number(val) || 0);
        },
        get bonus() {
          return self.candidates;
        },
        set bonus(val) {
          self.candidates = val || [];
        },
        html: '',
      };
    }
    return this.legacyShim;
  }
}

// ============================================================================
// 7. COMPOSITE DOMAIN MODEL & SINGLETONS
// ============================================================================

class CityDomainState {
  constructor({ logger: log = logger } = {}) {
    this.city = City;
    this.bonus = new BonusState({ logger: log });
    this.incident = new IncidentState({ logger: log });
    this.outpost = new OutpostState({ logger: log });
    this.resource = new ResourceState({ logger: log });
    this.blueGalaxy = new BlueGalaxyState();
  }
}

const bonusState = new BonusState();
const incidentState = new IncidentState();
const outpostState = new OutpostState();
const resourceState = new ResourceState();
const blueGalaxyState = new BlueGalaxyState();
const cityDomainState = new CityDomainState();

module.exports = {
  // City
  City,
  createFreshCityState,
  getCityState,
  resetCityState,
  // Bonus
  BonusState,
  bonusState,
  // Incident
  IncidentState,
  incidentState,
  // Outpost
  OutpostState,
  outpostState,
  // Resource
  ResourceState,
  resourceState,
  // Blue Galaxy
  BlueGalaxyState,
  blueGalaxyState,
  // Domain Model
  CityDomainState,
  cityDomainState,
};
module.exports.default = module.exports;
