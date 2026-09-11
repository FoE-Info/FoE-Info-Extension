import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { BlueGalaxyState } from '../../src/js/state/BlueGalaxyState.js';

describe('BlueGalaxyState Suite', () => {
  let state;

  beforeEach(() => {
    state = new BlueGalaxyState();
  });

  it('initializes with 0 charges and empty candidates', () => {
    assert.equal(state.charges, 0);
    assert.deepEqual(state.candidates, []);
  });

  it('respects shouldNotify flag in addEntity to batch entity insertions', () => {
    let notifyCount = 0;
    state.setRenderCallback(() => {
      notifyCount++;
    });

    const entity = {
      id: 601,
      cityentity_id: 'W_MultiAge_CUP22A11',
      type: 'generic_building',
      state: {
        __class__: 'ProducingState',
        next_state_transition_at: 1700000000,
        current_product: { product: { resources: { strategy_points: 15 } } },
      },
    };

    // Adding with shouldNotify = false must NOT trigger callback
    state.addEntity(entity, null, null, false);
    assert.equal(notifyCount, 0);
    assert.equal(state.candidates.length, 1);

    // Explicit notify triggers once
    state.notify();
    assert.equal(notifyCount, 1);

    // Adding with default shouldNotify = true triggers callback
    state.addEntity({ ...entity, id: 602 }, null, null, true);
    assert.equal(notifyCount, 2);
  });

  it('updates charges and notifies render callback', () => {
    let renderCalled = false;
    state.setRenderCallback(() => {
      renderCalled = true;
    });

    state.setCharges(12);
    assert.equal(state.charges, 12);
    assert.equal(renderCalled, true);
  });

  it('adds and updates candidate entities', () => {
    const entity = {
      id: 501,
      cityentity_id: 'W_MultiAge_CUP22A11',
      type: 'generic_building',
      state: {
        __class__: 'ProducingState',
        next_state_transition_at: 1700000000,
        current_product: {
          product: { resources: { strategy_points: 20 } },
        },
      },
    };

    state.addEntity(entity);
    assert.equal(state.candidates.length, 1);
    assert.equal(state.candidates[0].fp, 20);

    // Update upon pickup
    state.updateEntity({
      id: 501,
      state: {
        __class__: 'ProducingState',
        next_state_transition_at: 1700086400,
      },
    });

    assert.equal(state.candidates[0].transition, 1700086400);
  });

  it('preserves legacy Galaxy object compatibility shim', () => {
    const legacy = state.getLegacyShim();
    assert.ok(legacy);
    assert.equal(typeof legacy.amount, 'number');
    assert.ok(Array.isArray(legacy.bonus));
  });
});
