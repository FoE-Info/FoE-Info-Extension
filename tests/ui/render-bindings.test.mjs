import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import armyStatePkg from '../../src/js/state/ArmyState.js';
import bonusStatePkg from '../../src/js/state/BonusState.js';
import quantumStatePkg from '../../src/js/state/QuantumState.js';
import startupRenderStatePkg from '../../src/js/state/StartupRenderState.js';
import treasuryStatePkg from '../../src/js/state/TreasuryState.js';

const stores = {
  armyState: armyStatePkg.armyState,
  bonusState: bonusStatePkg.bonusState,
  quantumState: quantumStatePkg.quantumState,
  startupRenderState: startupRenderStatePkg.startupRenderState,
  treasuryState: treasuryStatePkg.treasuryState,
};

test('renderBindings composition root wires every shared store', async (t) => {
  await t.test('singletons have no subscribers before the barrel loads', () => {
    for (const [name, store] of Object.entries(stores)) {
      assert.equal(
        store.subscribers.size,
        0,
        `${name} already had subscribers before renderBindings.js loaded`,
      );
    }
  });

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
