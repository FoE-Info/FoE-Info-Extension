import assert from 'node:assert/strict';
import test from 'node:test';

const domStore = new Map();
globalThis.document = {
  body: { appendChild() {} },
  getElementById: (id) => domStore.get(id) || null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    style: {},
    classList: { add() {}, remove() {} },
    appendChild() {},
    addEventListener() {},
    setAttribute() {},
  }),
};
globalThis.window = globalThis;

const stateModules = [
  ['armyState', '../../src/js/state/ArmyState.js'],
  ['bonusState', '../../src/js/state/BonusState.js'],
  ['gbDonationState', '../../src/js/state/GbDonationState.js'],
  ['quantumState', '../../src/js/state/QuantumState.js'],
  ['startupRenderState', '../../src/js/state/StartupRenderState.js'],
  ['treasuryState', '../../src/js/state/TreasuryState.js'],
];

test('renderBindings - single composition root wires every store', async () => {
  const states = [];
  for (const [name, path] of stateModules) {
    const pkg = await import(path);
    const instance = pkg[name] || pkg.default?.[name];
    assert.ok(instance, `${name} singleton should be exported`);
    states.push([name, instance]);
  }

  for (const [name, instance] of states) {
    assert.equal(
      instance.subscribers.size,
      0,
      `${name} should start with no subscribers before the barrel loads`,
    );
  }

  await import('../../src/js/ui/renderBindings.js');

  for (const [name, instance] of states) {
    assert.ok(
      instance.subscribers.size >= 1,
      `${name} should gain a subscriber from the barrel`,
    );
  }
});
