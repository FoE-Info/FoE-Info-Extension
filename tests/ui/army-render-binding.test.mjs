import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/ArmyState.js';
import bindingPkg from '../../src/js/ui/armyPanel.js';

const { ArmyState } = statePkg;
const { bindArmyPanel, disconnectArmyResize } = bindingPkg;

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

  await t.test('unmount callback invokes disconnectArmyResize safely', () => {
    const state = new ArmyState();
    const off = bindArmyPanel(state, {});
    assert.doesNotThrow(() => off());
    assert.doesNotThrow(() => disconnectArmyResize());
  });
});

test('Army groups structured units newest first without mutating the payload', () => {
  const previousDocument = globalThis.document;
  const target = { innerHTML: '' };
  globalThis.document = {
    getElementById: (id) => (id === 'army' ? target : null),
  };
  const unitsPerEra = [
    { era: 'IronAge', name: 'Archer', amount: 24 },
    { era: 'StellarAgeDiscovery', name: 'Anvil <test>', amount: 1760 },
    { era: 'StellarAgeDiscovery', name: 'Hammer', amount: 3380, change: 2 },
  ];
  try {
    bindingPkg.renderArmyPanel({
      rogues: 55,
      allUnits: 5164,
      unitsPerEra,
      getAgeLevel: (era) => (era === 'IronAge' ? 2 : 23),
    });
    assert.match(target.innerHTML, /data-i18n="total">Total/);
    assert.match(target.innerHTML, /collapse [^"]*"><div class="overflow-y">/);
    assert.match(target.innerHTML, /data-i18n="type">Type/);
    assert.match(target.innerHTML, /data-i18n="amount">Amount/);
    assert.match(target.innerHTML, /Anvil &lt;test&gt;/);
    assert.equal((target.innerHTML.match(/scope="rowgroup"/g) || []).length, 2);
    assert.ok(
      target.innerHTML.indexOf('Hammer') < target.innerHTML.indexOf('Archer'),
    );
    assert.match(target.innerHTML, /class="green">\+2/);
    assert.equal(unitsPerEra[0].era, 'IronAge');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
