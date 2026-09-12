import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/InvestedState.js';
import bindingPkg from '../../src/js/ui/investedRenderBinding.js';

const { InvestedState } = statePkg;
const { bindInvestedPanel } = bindingPkg;

test('investedRenderBinding - renders the published payload', async (t) => {
  await t.test('forwards list and arc bonus to renderInvestedPanel', () => {
    const state = new InvestedState();
    const calls = [];
    const off = bindInvestedPanel(state, {
      renderInvested: (list, arcBonusPercent) =>
        calls.push({ list, arcBonusPercent }),
    });

    const list = [{ rank: 1, forge_points: 500 }];
    state.setContributions({ list, arcBonusPercent: 90 });
    off();
    state.setContributions({ list: [], arcBonusPercent: 80 });

    assert.deepEqual(calls, [{ list, arcBonusPercent: 90 }]);
  });

  await t.test('ignores channels outside the contributions domain', () => {
    const state = new InvestedState();
    let called = 0;
    bindInvestedPanel(state, {
      renderInvested: () => {
        called += 1;
      },
    });

    state.notify('other');
    assert.equal(called, 0);
  });

  await t.test('skips render when no payload exists', () => {
    const state = new InvestedState();
    let called = false;
    bindInvestedPanel(state, {
      renderInvested: () => {
        called = true;
      },
    });

    state.setContributions(null);
    assert.equal(called, false);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindInvestedPanel(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
