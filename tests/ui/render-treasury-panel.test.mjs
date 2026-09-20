import assert from 'node:assert/strict';
import test from 'node:test';

const { renderTreasuryPanel, clearForTreasury } =
  await import('../../src/js/ui/renderTreasuryPanel.js');

function createMockContainer() {
  return {
    innerHTML: '<div>content</div>',
    className: 'active',
    replaceChildren() {
      this.innerHTML = '';
    },
    querySelector: () => null,
  };
}

test('renderTreasuryPanel: clearForTreasury empties relevant containers', () => {
  const containers = {
    cityinvested: createMockContainer(),
    output: createMockContainer(),
    overview: createMockContainer(),
    alerts: createMockContainer(),
    donationDIV: createMockContainer(),
    incidents: createMockContainer(),
    donation2DIV: createMockContainer(),
    donationDIV2: createMockContainer(),
    greatbuilding: createMockContainer(),
    gbInfoDIV: createMockContainer(),
    guild: createMockContainer(),
    debug: createMockContainer(),
    info: createMockContainer(),
    visitstats: createMockContainer(),
    cultural: createMockContainer(),
    friendsDiv: createMockContainer(),
  };

  clearForTreasury(containers);

  assert.equal(containers.cityinvested.innerHTML, '');
  assert.equal(containers.output.innerHTML, '');
  assert.equal(containers.overview.innerHTML, '');
  assert.equal(containers.alerts.innerHTML, '');
  assert.equal(containers.visitstats.className, '');
  assert.equal(containers.cultural.className, '');
});

test('renderTreasuryPanel: renders card, binds listeners, and calls translateContainer', () => {
  const mockContainer = {
    innerHTML: '',
    style: { display: 'none' },
    classList: {
      contains: () => false,
      remove: () => {},
    },
    querySelector: (sel) => {
      if (
        sel === '#treasuryCopyID' ||
        sel === '#treasuryTextLabel' ||
        sel === '#treasuryicon'
      ) {
        return {
          addEventListener: (evt, fn) => {
            listeners[sel] = listeners[sel] || {};
            listeners[sel][evt] = fn;
          },
        };
      }
      return null;
    },
  };

  const listeners = {};
  let translatedElement = null;
  let copyTriggered = false;
  let collapseTriggered = false;

  const deps = {
    treasury: mockContainer,
    showOptions: { showTreasury: true },
    toolOptions: { treasurySize: 250 },
    element: {
      close: () => '<button class="btn-close"></button>',
      icon: () => '<span id="treasuryicon"></span>',
      copy: () => '<button id="treasuryCopyID"></button>',
    },
    collapse: {
      collapseTreasury: false,
      fCollapseTreasury: () => {
        collapseTriggered = true;
      },
    },
    copy: {
      TreasuryCopy: () => {
        copyTriggered = true;
      },
    },
    translateContainer: (el) => {
      translatedElement = el;
    },
    ResourceDefs: [{ id: 'wood', era: 'BronzeAge', name: 'Wood' }],
    helper: {
      numAges: 1,
      fLevelfromAge: () => 1,
      fGVGagesname: () => 'Bronze Age',
      escapeHTML: (s) => s,
    },
  };

  renderTreasuryPanel({ wood: 100 }, deps);

  assert.equal(mockContainer.style.display, '');
  assert.ok(mockContainer.innerHTML.includes('Guild Treasury:'));
  assert.ok(mockContainer.innerHTML.includes('height: 250px'));
  assert.equal(translatedElement, mockContainer);

  listeners['#treasuryCopyID']?.click?.();
  assert.equal(copyTriggered, true);

  listeners['#treasuryTextLabel']?.click?.({ target: {} });
  assert.equal(collapseTriggered, true);
});
