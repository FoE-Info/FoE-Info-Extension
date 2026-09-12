import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/OutpostState.js';
import bindingPkg from '../../src/js/ui/outpostRenderBinding.js';

const { OutpostState } = statePkg;
const { bindOutpostPanel } = bindingPkg;

test('outpostRenderBinding - renders the published payload', async (t) => {
  await t.test(
    'forwards settlement, advancements and costs to the renderer',
    () => {
      const state = new OutpostState();
      const calls = [];
      const off = bindOutpostPanel(state, {
        renderCultural: (activeSettlement, advancements, remainingCosts) =>
          calls.push({ activeSettlement, advancements, remainingCosts }),
      });

      const activeSettlement = { name: 'Vikings' };
      const advancements = [{ id: 'a1' }];
      const remainingCosts = { axes: 55 };
      state.setCulturalPanel({
        activeSettlement,
        advancements,
        remainingCosts,
      });
      off();
      state.setCulturalPanel({ activeSettlement: null });

      assert.deepEqual(calls, [
        { activeSettlement, advancements, remainingCosts },
      ]);
    },
  );

  await t.test('ignores channels outside the cultural domain', () => {
    const state = new OutpostState();
    let called = 0;
    bindOutpostPanel(state, {
      renderCultural: () => {
        called += 1;
      },
    });

    state.notify('other');
    assert.equal(called, 0);
  });

  await t.test('skips render when no payload exists', () => {
    const state = new OutpostState();
    let called = false;
    bindOutpostPanel(state, {
      renderCultural: () => {
        called = true;
      },
    });

    state.setCulturalPanel(null);
    assert.equal(called, false);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindOutpostPanel(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
