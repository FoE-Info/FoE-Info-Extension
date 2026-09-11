import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { blueGalaxyState } from '../../src/js/state/BlueGalaxyState.js';
import { renderGalaxyPanel } from '../../src/js/ui/renderGalaxyPanel.js';

function createMockDom() {
  const elementsById = new Map();
  function createEl(id) {
    return {
      id,
      style: { display: 'none' },
      innerHTML: '',
      addEventListener: () => {},
    };
  }

  const doc = {
    getElementById(id) {
      if (!elementsById.has(id)) {
        elementsById.set(id, createEl(id));
      }
      return elementsById.get(id);
    },
  };
  globalThis.document = doc;
  return { doc, elementsById };
}

describe('Blue Galaxy End-to-End Integration Suite', () => {
  beforeEach(() => {
    createMockDom();
    blueGalaxyState.reset();
    blueGalaxyState.setCharges(0);
    blueGalaxyState.setRenderCallback(() => {
      renderGalaxyPanel({
        container: document.getElementById('galaxy'),
        candidates: blueGalaxyState.candidates,
        charges: blueGalaxyState.charges,
        currentEpoch: 1700000000,
        isDebug: false,
      });
    });
  });

  it('handles full flow: discovery, collection trigger, suggestion ranking, pickup update, and depletion', () => {
    const galaxyDiv = document.getElementById('galaxy');
    assert.equal(galaxyDiv.style.display, 'none');

    // A. Discovery of city buildings (finished & producing)
    const buildingA = {
      id: 1001,
      cityentity_id: 'W_MultiAge_CUP22A11',
      name: "Governor's Villa",
      type: 'generic_building',
      state: {
        __class__: 'ProductionFinishedState',
        next_state_transition_at: 2147483647,
        current_product: { product: { resources: { strategy_points: 35 } } },
      },
    };
    const buildingB = {
      id: 1002,
      cityentity_id: 'W_MultiAge_GR25D1',
      name: 'Phantom Tower',
      type: 'generic_building',
      state: {
        __class__: 'ProductionFinishedState',
        next_state_transition_at: 2147483647,
        productionOption: {
          products: [
            { playerResources: { resources: { strategy_points: 50 } } },
          ],
        },
      },
    };
    const buildingC = {
      id: 1003,
      cityentity_id: 'W_MultiAge_ANNI25C2',
      name: 'Celestial Stage',
      type: 'generic_building',
      state: {
        __class__: 'ProductionFinishedState',
        next_state_transition_at: 2147483647,
        current_product: { product: { resources: { strategy_points: 20 } } },
      },
    };

    blueGalaxyState.addEntity(buildingA);
    blueGalaxyState.addEntity(buildingB);
    blueGalaxyState.addEntity(buildingC);

    // Initial state: charges = 0, panel remains hidden
    assert.equal(blueGalaxyState.candidates.length, 3);
    assert.equal(galaxyDiv.style.display, 'none');

    // B. Trigger on Collection: Blue Galaxy harvested giving 2 charges
    // (Simulates BonusService.getLimitedBonuses dispatch)
    blueGalaxyState.setCharges(2);

    // Panel is now visible and ranked descending (Building B 50FP, Building A 35FP)
    assert.equal(blueGalaxyState.charges, 2);
    assert.equal(galaxyDiv.style.display, 'block');
    assert.ok(galaxyDiv.innerHTML.includes('50FP'));
    assert.ok(galaxyDiv.innerHTML.includes('Phantom Tower'));
    assert.ok(galaxyDiv.innerHTML.includes('35FP'));
    assert.ok(galaxyDiv.innerHTML.includes("Governor's Villa"));
    assert.ok(!galaxyDiv.innerHTML.includes('20FP')); // Capped at 2 charges

    // D. Building B is picked up
    // (Simulates CityProductionService.pickupProduction dispatch)
    blueGalaxyState.updateEntity({
      id: 1002,
      state: {
        __class__: 'ProducingState',
        next_state_transition_at: 1700086400, // Ready tomorrow
      },
    });

    // Building B is now Producing (not ready). Building A (35FP) and Building C (20FP) become top ready
    assert.ok(galaxyDiv.innerHTML.includes('35FP'));
    assert.ok(galaxyDiv.innerHTML.includes('20FP'));
    assert.ok(galaxyDiv.innerHTML.includes('Celestial Stage'));
    assert.ok(!galaxyDiv.innerHTML.includes('50FP'));

    // Charge depletion: remaining charges hit 0
    blueGalaxyState.setCharges(0);

    assert.equal(blueGalaxyState.charges, 0);
    assert.equal(galaxyDiv.style.display, 'none');
  });
});
