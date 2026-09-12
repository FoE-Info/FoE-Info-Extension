import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

const stores = {};

test('renderBindings composition root wires every shared store', async (t) => {
  await t.test(
    'singletons have no subscribers before the barrel loads',
    async () => {
      const modules = [
        ['armyState', '../../src/js/state/ArmyState.js'],
        ['bonusState', '../../src/js/state/BonusState.js'],
        ['gbDonationState', '../../src/js/state/GbDonationState.js'],
        [
          'guildBattlegroundState',
          '../../src/js/state/GuildBattlegroundState.js',
        ],
        ['greatBuildingsState', '../../src/js/state/GreatBuildingsState.js'],
        ['quantumState', '../../src/js/state/QuantumState.js'],
        ['startupRenderState', '../../src/js/state/StartupRenderState.js'],
        ['treasuryState', '../../src/js/state/TreasuryState.js'],
      ];
      for (const [name, path] of modules) {
        const pkg = await import(path);
        stores[name] = pkg[name] ?? pkg.default?.[name];
        assert.ok(stores[name], `${name} singleton should be exported`);
        assert.equal(
          stores[name].subscribers.size,
          0,
          `${name} had subscribers before renderBindings.js loaded`,
        );
      }
    },
  );

  await t.test('importing the barrel subscribes each store', async () => {
    await import('../../src/js/ui/renderBindings.js');
    for (const [name, store] of Object.entries(stores)) {
      assert.ok(
        store.subscribers.size >= 1,
        `${name} gained no subscriber from renderBindings.js`,
      );
    }
  });

  await t.test('barrel exposes no bind* named exports', async () => {
    const barrel = await import('../../src/js/ui/renderBindings.js');
    const named = Object.keys(barrel).filter((key) => key !== 'default');
    assert.deepEqual(
      named.filter((key) => key.startsWith('bind')),
      [],
      `barrel unexpectedly re-exported bindings: ${named.join(', ')}`,
    );
  });
});

test('webpack sideEffects keeps the render bindings in the bundle', async () => {
  const url = new URL('../../package.json', import.meta.url);
  const pkg = JSON.parse(await readFile(url, 'utf8'));
  assert.ok(
    Array.isArray(pkg.sideEffects),
    'package.json sideEffects must be an array',
  );
  assert.ok(
    pkg.sideEffects.includes('src/js/ui/renderBindings.js'),
    'renderBindings.js must be declared side-effectful or webpack drops it',
  );
  assert.ok(
    pkg.sideEffects.includes('src/js/ui/*RenderBinding.js'),
    'render bindings must be declared side-effectful or webpack drops them',
  );
});
