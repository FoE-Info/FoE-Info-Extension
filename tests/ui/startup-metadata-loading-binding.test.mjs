import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/StartupRenderState.js';
import bindingPkg from '../../src/js/ui/startupMetadataLoadingBinding.js';

const { StartupRenderState } = statePkg;
const { bindStartupMetadataLoading } = bindingPkg;

test('startupMetadataLoadingBinding - renders the loading placeholder', async (t) => {
  await t.test(
    'forwards container and options to the placeholder renderer',
    () => {
      const state = new StartupRenderState();
      const calls = [];
      const off = bindStartupMetadataLoading(state, {
        renderPlaceholder: (container, options) =>
          calls.push({ container, options }),
      });

      const container = { innerHTML: '' };
      const options = { loadingText: 'Loading metadata...' };
      state.setMetadataLoading({ container, options });
      off();
      state.setMetadataLoading({ container: { innerHTML: 'x' } });

      assert.deepEqual(calls, [{ container, options }]);
    },
  );

  await t.test('ignores channels outside the metadata-loading domain', () => {
    const state = new StartupRenderState();
    let called = 0;
    bindStartupMetadataLoading(state, {
      renderPlaceholder: () => {
        called += 1;
      },
    });

    state.setCityStatsContext({ fp: 1 });
    assert.equal(called, 0);
  });

  await t.test('skips render when no payload exists', () => {
    const state = new StartupRenderState();
    let called = false;
    bindStartupMetadataLoading(state, {
      renderPlaceholder: () => {
        called = true;
      },
    });

    state.setMetadataLoading(null);
    assert.equal(called, false);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindStartupMetadataLoading(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
