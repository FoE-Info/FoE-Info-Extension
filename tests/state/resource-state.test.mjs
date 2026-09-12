import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/ResourceState.js';

const { ResourceState, resourceState } = statePkg;

test('ResourceState - reactive publish/subscribe', async (t) => {
  await t.test(
    'stores the goods render payload and notifies the channel',
    () => {
      const state = new ResourceState();
      const channels = [];
      state.subscribe((snapshot, channel) => channels.push(channel));

      const payload = { resources: { wine: 10 }, options: { force: true } };
      state.renderGoods(payload);

      assert.deepEqual(channels, ['goods']);
      assert.equal(state.getGoodsRender(), payload);
    },
  );

  await t.test('stores the available FP value', () => {
    const state = new ResourceState();
    state.setAvailableForgePoints(12);
    assert.equal(state.getAvailableForgePoints(), 12);
  });

  await t.test('stores renderer globals', () => {
    const state = new ResourceState();
    const globals = { toolOptions: { goodsSize: 200 } };
    state.setGlobals(globals);
    assert.equal(state.getGlobals(), globals);
  });

  await t.test('requestClearGoods emits the clear channel', () => {
    const state = new ResourceState();
    const channels = [];
    state.subscribe((snapshot, channel) => channels.push(channel));
    state.requestClearGoods();
    assert.deepEqual(channels, ['clear']);
  });

  await t.test('isolates and logs a throwing subscriber', () => {
    const errors = [];
    const state = new ResourceState({
      logger: { error: (...args) => errors.push(args) },
    });
    let reached = false;
    state.subscribe(() => {
      throw new Error('render boom');
    });
    state.subscribe(() => {
      reached = true;
    });

    assert.doesNotThrow(() => state.renderGoods({ resources: {} }));
    assert.equal(reached, true);
    assert.deepEqual(errors[0][1], { channel: 'goods', error: 'render boom' });
  });

  await t.test('singleton exposes shared reactive state', () => {
    assert.ok(resourceState instanceof ResourceState);
    assert.equal(typeof resourceState.subscribe, 'function');
  });
});
