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
      showCityStatsTooltips: () => {},
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
      showCityStatsTooltips: () => {},
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

  await t.test('shows city-stats tooltips after a city-stats paint', () => {
    const state = new StartupRenderState();
    let tooltips = 0;
    bindStartupRenderState(state, {
      renderCityStats: () => {},
      renderBuildingCollection: () => {},
      showCityStatsTooltips: () => {
        tooltips += 1;
      },
    });

    state.setCityStatsContext({ tag: 'ctx' });
    assert.equal(tooltips, 1);
  });

  await t.test('refreshes the ignore-list popover on its channel', () => {
    const state = new StartupRenderState();
    let refreshes = 0;
    bindStartupRenderState(state, {
      renderCityStats: () => {},
      renderBuildingCollection: () => {},
      showCityStatsTooltips: () => {},
      refreshIgnoreList: () => {
        refreshes += 1;
      },
    });

    state.requestIgnoreListRefresh();
    assert.equal(refreshes, 1);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindStartupRenderState(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
