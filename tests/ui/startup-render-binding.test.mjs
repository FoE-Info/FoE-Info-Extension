import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/StartupRenderState.js';
import bindingPkg from '../../src/js/ui/startupRenderBinding.js';

const { StartupRenderState } = statePkg;
const { bindStartupRenderState } = bindingPkg;

test('startupRenderBinding - reactive channel routing', async (t) => {
  await t.test('repaints only the changed channel', () => {
    const state = new StartupRenderState();
    const calls = [];
    const off = bindStartupRenderState(state, {
      renderCityStats: (ctx) => calls.push(['city-stats', ctx]),
      renderBuildingCollection: (opts) =>
        calls.push(['building-collection', opts]),
    });

    state.setCityStatsContext({ tag: 'ctx' });
    state.setBuildingCollectionOptions({ tag: 'opts' });
    off();

    state.setCityStatsContext({ tag: 'ignored' });

    assert.deepEqual(calls, [
      ['city-stats', { tag: 'ctx' }],
      ['building-collection', { tag: 'opts' }],
    ]);
  });

  await t.test('notify("all") repaints both renderers', () => {
    const state = new StartupRenderState();
    const calls = [];
    bindStartupRenderState(state, {
      renderCityStats: () => calls.push('city-stats'),
      renderBuildingCollection: () => calls.push('building-collection'),
    });

    state.setCityStatsContext({ tag: 'ctx' });
    state.setBuildingCollectionOptions({ tag: 'opts' });
    state.notify('all');

    assert.deepEqual(calls, [
      'city-stats',
      'building-collection',
      'city-stats',
      'building-collection',
    ]);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindStartupRenderState(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
