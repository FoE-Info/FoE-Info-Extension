import assert from 'node:assert/strict';
import test from 'node:test';
import statePkg from '../../src/js/state/VisitedCityState.js';
import bindingPkg from '../../src/js/ui/visitedCityRenderBinding.js';

const { VisitedCityState } = statePkg;
const { bindVisitedCityRender } = bindingPkg;

test('visitedCityRenderBinding - routes visit payloads', async (t) => {
  await t.test('renders the payload and translates the container', () => {
    const state = new VisitedCityState();
    const rendered = [];
    let translated = 0;
    globalThis.document = { getElementById: () => ({ id: 'visit' }) };

    bindVisitedCityRender(state, {
      renderCity: (...args) => rendered.push(args),
      translate: () => {
        translated += 1;
      },
    });

    state.setVisit({
      containerId: 'visit',
      stats: { a: 1 },
      context: { b: 2 },
      options: { c: 3 },
    });
    delete globalThis.document;

    assert.deepEqual(rendered, [['visit', { a: 1 }, { b: 2 }, { c: 3 }]]);
    assert.equal(translated, 1);
  });

  await t.test('skips null payloads', () => {
    const state = new VisitedCityState();
    let rendered = 0;
    bindVisitedCityRender(state, {
      renderCity: () => {
        rendered += 1;
      },
      translate: () => {},
    });

    state.setVisit(null);
    assert.equal(rendered, 0);
  });

  await t.test('returns a safe no-op for an invalid state', () => {
    const off = bindVisitedCityRender(null, {});
    assert.equal(typeof off, 'function');
    assert.doesNotThrow(() => off());
  });
});
