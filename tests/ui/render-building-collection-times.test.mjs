import assert from 'node:assert/strict';
import test from 'node:test';
import renderPkg from '../../src/js/ui/renderBuildingCollectionTimes.js';

const { renderBuildingCollectionTimes } = renderPkg;

test('renderBuildingCollectionTimes UI Suite', async (t) => {
  await t.test(
    '1. returns early if showOptions.collectionTimes is false',
    () => {
      let elementAccessed = false;
      global.document = {
        getElementById: () => {
          elementAccessed = true;
          return null;
        },
      };

      renderBuildingCollectionTimes({
        buildingsReady: [{ id: 'b_1', name: 'Statue', ready: 2000000000 }],
        showOptions: { collectionTimes: false },
      });

      assert.equal(elementAccessed, false);
    },
  );

  await t.test('2. renders sorted buildings and binds toggle callback', () => {
    let innerHTMLContent = '';
    let clickListener = null;

    const mockTarget = {
      id: 'buildings',
      set innerHTML(val) {
        innerHTMLContent = val;
      },
      get innerHTML() {
        return innerHTMLContent;
      },
    };

    const mockToggle = {
      id: 'buildingsicon',
      addEventListener: (evt, handler) => {
        if (evt === 'click') clickListener = handler;
      },
    };

    global.document = {
      getElementById: (id) => {
        if (id === 'buildings') return mockTarget;
        if (id === 'buildingsicon' || id === 'buildingsTextLabel')
          return mockToggle;
        return null;
      },
    };

    let toggleTriggered = false;
    const mockCollapse = {
      collapseBuildings: false,
      fCollapseBuildings: () => {
        toggleTriggered = true;
      },
    };

    const mockElement = {
      icon: (id, target, isCol) =>
        `<span id="${id}">${isCol ? '[+]' : '[-]'}</span>`,
      close: () => '<button class="btn-close"></button>',
    };

    const mockHelper = {
      fEntityNameTrim: (name) => name.replace('b_', 'Building '),
    };

    renderBuildingCollectionTimes({
      buildingsReady: [
        { id: 'b_2', ready: 2000000050 },
        { id: 'b_1', ready: 2000000010 },
      ],
      epocTime: 1000000000,
      showOptions: { collectionTimes: true },
      element: mockElement,
      collapse: mockCollapse,
      helper: mockHelper,
      formatDateTime: (ts) => `TIME:${ts}`,
    });

    assert.ok(innerHTMLContent.includes('Building 1: TIME:2000000010'));
    assert.ok(innerHTMLContent.includes('Building 2: TIME:2000000050'));
    assert.ok(
      innerHTMLContent.indexOf('Building 1') <
        innerHTMLContent.indexOf('Building 2'),
      'Buildings must be sorted ascending by ready timestamp',
    );
    assert.ok(clickListener, 'Toggle click listener must be bound');
    clickListener();
    assert.equal(toggleTriggered, true);
  });
});
