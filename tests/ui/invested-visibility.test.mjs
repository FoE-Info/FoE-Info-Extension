import assert from 'node:assert/strict';
import test from 'node:test';
import visibility from '../../src/js/ui/cardVisibility.js';
import investedModule from '../../src/js/ui/investedPanel.js';

test('opening GB Contributions restores a previously hidden investment summary', (t) => {
  const previousDocument = globalThis.document;
  const previousView = visibility.getCurrentView();
  visibility.setCurrentView(null);
  const target = { innerHTML: '', style: { display: 'none' } };
  globalThis.document = {
    getElementById: (id) => (id === 'invested' ? target : null),
  };
  t.after(() => {
    globalThis.document = previousDocument;
    visibility.setCurrentView(previousView);
  });
  investedModule.renderInvestedPanel(
    [
      {
        player_id: 1,
        city_entity_id: 2,
        forge_points: 100,
        reward: { strategy_points: 60 },
      },
    ],
    100,
  );
  assert.equal(target.style.display, '');
  assert.match(target.innerHTML, /FP Invested/);
  assert.match(target.innerHTML, /100 FP/);
});
