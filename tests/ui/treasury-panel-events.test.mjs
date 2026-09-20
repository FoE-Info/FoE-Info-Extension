import assert from 'node:assert/strict';
import test from 'node:test';

const eventsPkg = await import('../../src/js/ui/treasuryPanelEvents.js');
const { bindTreasuryEvents } = eventsPkg.default || eventsPkg;

test('treasuryPanelEvents: bindTreasuryEvents attaches copy, collapse, icon listeners and resizable binding', () => {
  const listeners = {};
  const mockContainer = {
    querySelector: (sel) => ({
      addEventListener: (evt, fn) => {
        listeners[sel] = listeners[sel] || {};
        listeners[sel][evt] = fn;
      },
    }),
  };

  let copyTriggered = false;
  let collapseTriggered = false;
  let iconTriggered = false;
  let resizableBound = false;

  const cpy = {
    TreasuryCopy: () => {
      copyTriggered = true;
    },
  };

  const col = {
    fCollapseTreasury: () => {
      collapseTriggered = true;
    },
  };

  const setTreasuryHeight = () => {};

  bindTreasuryEvents({
    treasuryContainer: mockContainer,
    doc: null,
    cpy,
    col,
    treasuryHeight: 200,
    setTreasuryHeight,
    bindResizableCollapse: () => {
      resizableBound = true;
    },
  });

  assert.ok(listeners['#treasuryCopyID']?.click);
  listeners['#treasuryCopyID'].click();
  assert.equal(copyTriggered, true);

  assert.ok(listeners['#treasuryTextLabel']?.click);
  listeners['#treasuryTextLabel'].click({ target: {} });
  assert.equal(collapseTriggered, true);

  assert.ok(listeners['#treasuryicon']?.click);
  listeners['#treasuryicon'].click();
  assert.equal(collapseTriggered, true);

  assert.equal(resizableBound, true);
});

test('treasuryPanelEvents: ignores null container safely', () => {
  assert.doesNotThrow(() => {
    bindTreasuryEvents({ treasuryContainer: null });
  });
});
