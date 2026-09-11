import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  ALL_15_PANEL_IDS,
  applyCardVisibility,
  CITY_HIDDEN_PANEL_IDS,
  GBG_ALLOWED_PANEL_IDS,
  getCurrentView,
  onViewChange,
  setCurrentView,
} from '../../src/js/ui/cardVisibility.js';

function createMockDOM() {
  const elementsById = new Map();

  function createElement(tagName) {
    const el = {
      tagName: tagName.toUpperCase(),
      id: '',
      innerHTML: '',
      style: { display: '' },
      parentNode: null,
      children: [],
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
          this.children.splice(idx, 1);
          child.parentNode = null;
        }
        return child;
      },
    };
    return el;
  }

  const doc = {
    createElement,
    getElementById(id) {
      if (!elementsById.has(id)) {
        const el = createElement('div');
        el.id = id;
        elementsById.set(id, el);
      }
      return elementsById.get(id);
    },
    querySelectorAll(selector) {
      const results = [];
      if (selector === '.debug-stub') {
        for (const el of elementsById.values()) {
          if (el.innerHTML && el.innerHTML.includes('debug-stub')) {
            const stub = createElement('div');
            stub.className = 'debug-stub';
            stub.parentNode = el;
            results.push(stub);
          }
        }
      }
      return results;
    },
  };

  globalThis.document = doc;
  globalThis.window = {
    addEventListener: () => {},
  };

  return { doc, elementsById };
}

describe('Context-Aware View Filtering & Debug Stubs Suite', () => {
  beforeEach(() => {
    createMockDOM();
    setCurrentView(null);
  });

  it('exports correct panel sets and constants', () => {
    assert.equal(ALL_15_PANEL_IDS.length, 15);
    assert.equal(GBG_ALLOWED_PANEL_IDS.size, 6);
    assert.equal(CITY_HIDDEN_PANEL_IDS.size, 3);

    for (const combatId of [
      'header',
      'army',
      'rewards',
      'gbgTargetGenerator',
      'battlegrounds',
      'gbgLeaderboard',
    ]) {
      assert.ok(GBG_ALLOWED_PANEL_IDS.has(combatId));
    }

    for (const gbgSpecificId of [
      'gbgTargetGenerator',
      'battlegrounds',
      'gbgLeaderboard',
    ]) {
      assert.ok(CITY_HIDDEN_PANEL_IDS.has(gbgSpecificId));
    }
  });

  it('GBG Map View: shows ONLY 6 combat panels and hides all 9 non-combat and utility panels', () => {
    // Populate all 15 panels in DOM
    for (const id of ALL_15_PANEL_IDS) {
      const el = document.getElementById(id);
      el.innerHTML = `<span>Content for ${id}</span>`;
    }
    // And utility panels
    for (const utilId of [
      'friends',
      'hood',
      'overview',
      'info',
      'buildings',
      'bonus',
      'galaxy',
      'cultural',
      'visit',
    ]) {
      const el = document.getElementById(utilId);
      el.innerHTML = `<span>Util ${utilId}</span>`;
    }

    setCurrentView('GBG');
    assert.equal(getCurrentView(), 'GBG');

    // 6 combat panels MUST be visible (display !== 'none')
    for (const combatId of [
      'header',
      'army',
      'rewards',
      'gbgTargetGenerator',
      'battlegrounds',
      'gbgLeaderboard',
    ]) {
      const el = document.getElementById(combatId);
      assert.equal(
        el.style.display,
        '',
        `Combat panel #${combatId} must be visible in GBG view`,
      );
    }

    // 9 non-combat panels MUST be hidden (display === 'none')
    for (const nonCombatId of [
      'incidents',
      'gbDonation',
      'gbInfo',
      'gbContributors',
      'geChampionship',
      'geContributions',
      'goodsInventory',
      'guildOverview',
      'treasury',
    ]) {
      const el = document.getElementById(nonCombatId);
      assert.equal(
        el.style.display,
        'none',
        `Non-combat panel #${nonCombatId} must be hidden in GBG view`,
      );
    }

    // Secondary/utility panels MUST be hidden
    for (const utilId of [
      'friends',
      'hood',
      'overview',
      'info',
      'buildings',
      'bonus',
      'galaxy',
      'cultural',
      'visit',
    ]) {
      const el = document.getElementById(utilId);
      assert.equal(
        el.style.display,
        'none',
        `Utility panel #${utilId} must be hidden in GBG view`,
      );
    }
  });

  it('City View: hides GBG-specific panels and displays city panels according to options', () => {
    for (const id of ALL_15_PANEL_IDS) {
      const el = document.getElementById(id);
      el.innerHTML = `<span>Content for ${id}</span>`;
    }

    setCurrentView('CITY');
    assert.equal(getCurrentView(), 'CITY');

    // 3 GBG panels MUST be hidden in City view
    for (const gbgId of [
      'gbgTargetGenerator',
      'battlegrounds',
      'gbgLeaderboard',
    ]) {
      const el = document.getElementById(gbgId);
      assert.equal(
        el.style.display,
        'none',
        `GBG-specific panel #${gbgId} must be hidden in CITY view`,
      );
    }

    // Standard city panels must be visible
    assert.equal(document.getElementById('header').style.display, '');
    assert.equal(document.getElementById('incidents').style.display, '');
    assert.equal(document.getElementById('army').style.display, '');
    assert.equal(document.getElementById('rewards').style.display, '');
    assert.equal(document.getElementById('gbDonation').style.display, '');
    assert.equal(document.getElementById('gbInfo').style.display, '');
    assert.equal(document.getElementById('gbContributors').style.display, '');
    assert.equal(document.getElementById('geChampionship').style.display, '');
    assert.equal(document.getElementById('geContributions').style.display, '');
    assert.equal(document.getElementById('guildOverview').style.display, '');
    assert.equal(document.getElementById('treasury').style.display, '');
  });

  it('Debug Mode Override: forces ALL 15 panels visible with placeholder stubs when data is absent', () => {
    // Create empty containers for all 15 panels
    for (const id of ALL_15_PANEL_IDS) {
      const el = document.getElementById(id);
      el.innerHTML = '';
      el.style.display = 'none'; // Initially hidden
    }

    // Apply with debug override = true
    applyCardVisibility(null, true);

    // All 15 panels must now have display: '' and contain debug stub
    for (const id of ALL_15_PANEL_IDS) {
      const el = document.getElementById(id);
      assert.equal(
        el.style.display,
        '',
        `Panel #${id} must be visible in debug override`,
      );
      assert.ok(
        el.innerHTML.includes('debug-stub'),
        `Panel #${id} must contain debug stub markup`,
      );
      assert.ok(
        el.innerHTML.includes(`[DEBUG STUB]</strong> ${id}`),
        `Panel #${id} stub must display panel ID`,
      );
    }
  });

  it('onViewChange subscriber fires on view transitions', () => {
    const transitions = [];
    const unsubscribe = onViewChange((v) => transitions.push(v));

    setCurrentView('GBG');
    setCurrentView('CITY');
    setCurrentView('GBG');
    setCurrentView('GBG'); // Same view should not fire duplicate

    assert.deepEqual(transitions, ['GBG', 'CITY', 'GBG']);
    unsubscribe();

    setCurrentView('CITY');
    assert.equal(
      transitions.length,
      3,
      'Unsubscribed listener must not receive further events',
    );
  });
});
