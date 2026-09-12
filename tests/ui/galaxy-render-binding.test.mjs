import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/BlueGalaxyState.js';
import bindingPkg from '../../src/js/ui/galaxyRenderBinding.js';

const { BlueGalaxyState } = statePkg;
const { bindGalaxyRender } = bindingPkg;

test('galaxyRenderBinding - wires the blue galaxy render callback', async (t) => {
  await t.test('invokes the injected renderer on notify', () => {
    const state = new BlueGalaxyState();
    let renders = 0;
    const off = bindGalaxyRender(state, {
      render: () => {
        renders += 1;
      },
    });

    state.notify();
    assert.equal(renders, 1);

    off();
    state.notify();
    assert.equal(renders, 1);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindGalaxyRender(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
