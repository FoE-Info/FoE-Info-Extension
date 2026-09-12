import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/ExpeditionState.js';
import bindingPkg from '../../src/js/ui/expeditionRenderBinding.js';

const { ExpeditionState } = statePkg;
const { bindExpeditionPanel } = bindingPkg;

test('expeditionRenderBinding - renders the published state', async (t) => {
  await t.test('forwards the snapshot and options to the renderer', () => {
    const state = new ExpeditionState();
    const calls = [];
    const off = bindExpeditionPanel(state, {
      renderExpedition: (snapshot, options) =>
        calls.push({ snapshot, options }),
      getOptions: () => ({ showExpedition: true }),
    });

    state.setInternationalEntries([{ id: 10 }]);
    off();
    state.setContributionEntries([{ player: {} }]);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].snapshot.getInternationalEntries().length, 1);
    assert.deepEqual(calls[0].options, { showExpedition: true });
  });

  await t.test('ignores channels outside the expedition domain', () => {
    const state = new ExpeditionState();
    let called = 0;
    bindExpeditionPanel(state, {
      renderExpedition: () => {
        called += 1;
      },
      getOptions: () => ({}),
    });

    state.notify('other');
    assert.equal(called, 0);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindExpeditionPanel(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
