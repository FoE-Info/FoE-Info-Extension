import assert from 'node:assert/strict';
import test from 'node:test';
import visibility from '../../src/js/ui/cardVisibility.js';
import galaxy from '../../src/js/ui/galaxyPanel.js';

test('global debug alone does not force Galaxy preview; dedicated opt-in does', (t) => {
  const previousDocument = globalThis.document;
  const previousView = visibility.getCurrentView();
  visibility.setCurrentView(null);
  const target = { innerHTML: '', style: {}, querySelectorAll: () => [] };
  globalThis.document = {
    getElementById: (id) => (id === 'galaxy' ? target : null),
  };
  t.after(() => {
    globalThis.document = previousDocument;
    visibility.setCurrentView(previousView);
  });
  const state = {
    charges: 0,
    candidates: [{ name: 'Building', fp: 100, transition: 2000 }],
  };
  galaxy.showGalaxy({
    blueGalaxyState: state,
    isDebug: true,
    epocTime: 1000,
    showOptions: { showGalaxy: true },
  });
  assert.equal(target.style.display, 'none');
  galaxy.showGalaxy({
    blueGalaxyState: state,
    isDebug: true,
    epocTime: 1000,
    showOptions: { showGalaxy: true, debugGalaxy: true },
  });
  assert.equal(target.style.display, 'block');
  assert.match(target.innerHTML, /Building/);
});
