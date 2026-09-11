/**
 * BlueGalaxyState.js
 *
 * Reactive state store for Blue Galaxy double collection helper.
 * Tracks remaining charges, candidate buildings, and triggers UI updates.
 */

const {
  createGalaxyCandidate,
  filterAndSortGalaxyCandidates,
  updateCandidateState,
} = require('../calc/BlueGalaxyCalculator.js');

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

const blueGalaxyState = new BlueGalaxyState();

module.exports = {
  BlueGalaxyState,
  blueGalaxyState,
};
module.exports.default = blueGalaxyState;
