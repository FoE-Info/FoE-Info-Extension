import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/ArmyState.js';
import bindingPkg from '../../src/js/ui/armyRenderBinding.js';

const { ArmyState } = statePkg;
const { bindArmyPanel } = bindingPkg;

test('armyRenderBinding - renders the published payload', async (t) => {
  await t.test('forwards the payload to renderArmyPanel', () => {
    const state = new ArmyState();
    const calls = [];
    const off = bindArmyPanel(state, {
      renderArmy: (payload) => calls.push(payload),
    });

    const payload = { rogues: 3, allUnits: 5, armySize: 185 };
    state.setArmyPanel(payload);
    off();
    state.setArmyPanel({ rogues: 9 });

    assert.deepEqual(calls, [payload]);
  });

  await t.test('skips render when no payload exists', () => {
    const state = new ArmyState();
    let called = false;
    bindArmyPanel(state, {
      renderArmy: () => {
        called = true;
      },
    });

    state.setArmyPanel(null);
    assert.equal(called, false);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindArmyPanel(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
