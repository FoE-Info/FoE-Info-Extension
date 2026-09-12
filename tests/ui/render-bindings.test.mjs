import assert from 'node:assert/strict';
import test from 'node:test';

// Minimal browser globals so the panel renderer graph can be imported in Node.
function createMockElement(id = '') {
  return {
    id,
    innerHTML: '',
    innerText: '',
    style: {},
    className: '',
    classList: { add() {}, remove() {}, contains: () => false },
    children: [],
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    getAttribute() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    insertAdjacentHTML() {},
    remove() {},
    cloneNode() {
      return { ...this };
    },
  };
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    readyState: 'complete',
    body: createMockElement(),
    head: createMockElement(),
    documentElement: createMockElement(),
    getElementById() {
      return null;
    },
    createElement: createMockElement,
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.window = globalThis;
}
if (typeof globalThis.chrome === 'undefined') {
  globalThis.chrome = {
    runtime: { id: 'test-extension-id' },
    storage: { local: { get: async () => ({}), set: async () => {} } },
  };
}

const armyPkg = await import('../../src/js/state/ArmyState.js');
const bonusPkg = await import('../../src/js/state/BonusState.js');
const quantumPkg = await import('../../src/js/state/QuantumState.js');
const startupPkg = await import('../../src/js/state/StartupRenderState.js');
const treasuryPkg = await import('../../src/js/state/TreasuryState.js');
const gbgPkg = await import('../../src/js/state/GuildBattlegroundState.js');

const stores = {
  armyState: armyPkg.default.armyState,
  bonusState: bonusPkg.default.bonusState,
  quantumState: quantumPkg.default.quantumState,
  startupRenderState: startupPkg.default.startupRenderState,
  treasuryState: treasuryPkg.default.treasuryState,
  guildBattlegroundState: gbgPkg.default.guildBattlegroundState,
};

for (const [name, state] of Object.entries(stores)) {
  assert.equal(
    state.subscribers.size,
    0,
    `${name} must not have subscribers before the barrel is imported`,
  );
}

await import('../../src/js/ui/renderBindings.js');

test('renderBindings wires every reactive store to a subscriber', () => {
  for (const [name, state] of Object.entries(stores)) {
    assert.ok(state.subscribers instanceof Set, `${name} exposes subscribers`);
    assert.ok(
      state.subscribers.size >= 1,
      `${name} must have a subscriber after importing renderBindings.js`,
    );
  }
});

test('renderBindings is a side-effect-only composition root', async () => {
  const barrel = (await import('../../src/js/ui/renderBindings.js')).default;
  assert.equal(typeof barrel, 'object');
  assert.deepEqual(
    Object.keys(barrel).filter((key) => key !== 'default'),
    [],
  );
  assert.equal(typeof barrel.bindGuildBattlegroundPanels, 'undefined');
});
