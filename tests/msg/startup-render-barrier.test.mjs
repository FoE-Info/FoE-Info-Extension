import assert from 'node:assert/strict';
import { test } from 'node:test';
import orchestrator from '../../src/js/msg/StartupRenderOrchestrator.js';

const msg = {
  responseData: { city_map: { entities: [{ cityentity_id: 'pending' }] } },
};

function setup(options = {}) {
  const card = { innerHTML: '' };
  let complete;
  let value = 'intermediate';
  const render = () =>
    orchestrator.renderWhenStartupReady(() => (card.innerHTML = value));
  orchestrator.scheduleStartupRender({
    msg,
    citystats: card,
    getCityEntityDef: () => null,
    renderLiveCityStats: render,
    resolveMissingCityEntities: (_ids, callback) => {
      complete = callback;
    },
    onResolved: () => {
      value = 'final';
      render();
    },
    ...options,
  });
  return { card, render, complete: () => complete() };
}

test('metadata subscriber cannot replace spinner before aggregate completion', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const run = setup();
  run.render(); // The same guarded entrypoint used by the metadata subscriber.
  assert.match(run.card.innerHTML, /spinner-border/);
  run.complete();
  assert.equal(run.card.innerHTML, 'final');
});

test('completion releases barrier before synchronous startup recomputation', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let next;
  const first = setup({ onResolved: () => (next = setup()) });
  first.complete();
  next.render();
  assert.match(next.card.innerHTML, /spinner-border/);
  next.complete();
  assert.equal(next.card.innerHTML, 'final');
});

test('superseded completion cannot release the current startup barrier', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const first = setup();
  const current = setup();
  first.complete();
  current.render();
  assert.match(current.card.innerHTML, /spinner-border/);
  current.complete();
  assert.equal(current.card.innerHTML, 'final');
});

test('timeout retains spinner until actual completion, then recomputes', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const run = setup({ fallbackTimeoutMs: 10 });
  t.mock.timers.tick(10);
  run.render();
  assert.match(run.card.innerHTML, /spinner-border/);
  run.complete();
  assert.equal(run.card.innerHTML, 'final');
});

for (const rejects of [false, true]) {
  test(`settled resolver without callback releases barrier (rejects=${rejects})`, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const run = setup({
      resolveMissingCityEntities: async () => {
        if (rejects) throw new Error('offline');
      },
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(run.card.innerHTML, 'intermediate');
  });
}
