import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/ResourceState.js';
import bindingPkg from '../../src/js/ui/resourceRenderBinding.js';

const { ResourceState } = statePkg;
const { bindResourcePanel } = bindingPkg;

function createSeams() {
  const goodsCalls = [];
  const fpCalls = [];
  const globalsCalls = [];
  const clearCalls = [];
  const copy = () => {};
  return {
    goodsCalls,
    fpCalls,
    globalsCalls,
    clearCalls,
    copy,
    seams: {
      goods: {
        renderGoodsPanel: (resources, options) =>
          goodsCalls.push({ resources, options }),
        setGlobals: (globals) => globalsCalls.push(globals),
      },
      setFP: (value) => fpCalls.push(value),
      clearGoods: () => clearCalls.push(true),
      copy,
    },
  };
}

test('resourceRenderBinding - executes published channels', async (t) => {
  await t.test('renders goods with the injected copy handler', () => {
    const state = new ResourceState();
    const seam = createSeams();
    const off = bindResourcePanel(state, seam.seams);

    const resources = { wine: 10 };
    state.renderGoods({ resources, options: { force: true } });
    off();

    assert.equal(seam.goodsCalls.length, 1);
    assert.equal(seam.goodsCalls[0].resources, resources);
    assert.equal(seam.goodsCalls[0].options.force, true);
    assert.equal(seam.goodsCalls[0].options.onCopy, seam.copy);
  });

  await t.test('sets the available FP value', () => {
    const state = new ResourceState();
    const seam = createSeams();
    bindResourcePanel(state, seam.seams);

    state.setAvailableForgePoints(42);
    assert.deepEqual(seam.fpCalls, [42]);
  });

  await t.test('applies renderer globals', () => {
    const state = new ResourceState();
    const seam = createSeams();
    bindResourcePanel(state, seam.seams);

    const globals = { toolOptions: { goodsSize: 200 } };
    state.setGlobals(globals);
    assert.deepEqual(seam.globalsCalls, [globals]);
  });

  await t.test('clears the goods panel on the clear channel', () => {
    const state = new ResourceState();
    const seam = createSeams();
    bindResourcePanel(state, seam.seams);

    state.requestClearGoods();
    assert.equal(seam.clearCalls.length, 1);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindResourcePanel(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
