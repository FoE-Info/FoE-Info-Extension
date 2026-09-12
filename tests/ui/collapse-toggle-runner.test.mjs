import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  executeToggle,
  createToggle,
  hideAllTooltips,
} = require('../../src/js/ui/collapseToggleRunner.js');

test('collapseToggleRunner Suite', async (t) => {
  await t.test('executeToggle toggles state and updates icon', () => {
    let state = false;
    const updatedIcons = [];
    const mockElement = {
      updateIcon: (iconId, targetId, isCollapsed) => {
        updatedIcons.push({ iconId, targetId, isCollapsed });
      },
    };

    const next = executeToggle(
      {
        get: () => state,
        set: (v) => {
          state = v;
        },
        icons: [{ iconId: 'testIcon', targetId: 'testTarget' }],
      },
      { element: mockElement },
    );

    assert.equal(next, true);
    assert.equal(state, true);
    assert.deepEqual(updatedIcons, [
      { iconId: 'testIcon', targetId: 'testTarget', isCollapsed: true },
    ]);
  });

  await t.test(
    'executeToggle calls storage.setCollapse when persist: true',
    () => {
      let state = false;
      const persisted = [];
      const mockStorage = {
        setCollapse: (key, val) => {
          persisted.push({ key, val });
        },
      };

      executeToggle(
        {
          get: () => state,
          set: (v) => {
            state = v;
          },
          key: 'collapseTestKey',
          persist: true,
        },
        { storage: mockStorage },
      );

      assert.deepEqual(persisted, [{ key: 'collapseTestKey', val: true }]);
    },
  );

  await t.test(
    'executeToggle updates copy element display (default block and custom display)',
    () => {
      let state = false;
      const elements = {
        blockCopy: { style: { display: '' } },
        inlineCopy: { style: { display: '' } },
      };
      const mockDoc = {
        getElementById: (id) => elements[id] || null,
        querySelectorAll: () => [],
      };

      // Collapse to true -> should hide ('none')
      executeToggle(
        {
          get: () => state,
          set: (v) => {
            state = v;
          },
          copyEls: ['blockCopy', { id: 'inlineCopy', display: 'inline-block' }],
        },
        { doc: mockDoc },
      );

      assert.equal(elements.blockCopy.style.display, 'none');
      assert.equal(elements.inlineCopy.style.display, 'none');

      // Toggle back to false -> should restore 'block' and 'inline-block'
      executeToggle(
        {
          get: () => state,
          set: (v) => {
            state = v;
          },
          copyEls: ['blockCopy', { id: 'inlineCopy', display: 'inline-block' }],
        },
        { doc: mockDoc },
      );

      assert.equal(elements.blockCopy.style.display, 'block');
      assert.equal(elements.inlineCopy.style.display, 'inline-block');
    },
  );

  await t.test('executeToggle calls onToggle hook', () => {
    let state = false;
    let hookPayload = null;

    executeToggle(
      {
        get: () => state,
        set: (v) => {
          state = v;
        },
        onToggle: (next) => {
          hookPayload = next;
        },
      },
      { doc: { querySelectorAll: () => [] } },
    );

    assert.equal(hookPayload, true);
  });

  await t.test(
    'executeToggle supports dynamic iconId and targetId functions',
    () => {
      let state = false;
      const updatedIcons = [];
      const mockElement = {
        updateIcon: (iconId, targetId, isCollapsed) => {
          updatedIcons.push({ iconId, targetId, isCollapsed });
        },
      };

      executeToggle(
        {
          get: () => state,
          set: (v) => {
            state = v;
          },
          icons: [
            {
              iconId: () => 'dynamicIconId',
              targetId: () => 'dynamicTargetId',
            },
          ],
        },
        { element: mockElement },
      );

      assert.deepEqual(updatedIcons, [
        {
          iconId: 'dynamicIconId',
          targetId: 'dynamicTargetId',
          isCollapsed: true,
        },
      ]);
    },
  );

  await t.test('hideAllTooltips hides popovers and tooltips safely', () => {
    let popoverHidden = false;
    let tooltipHidden = false;

    const mockDoc = {
      querySelectorAll: (sel) => {
        if (sel.includes('popover')) return [{ id: 'pop' }];
        if (sel.includes('tooltip')) return [{ id: 'tip' }];
        return [];
      },
    };

    const mockBootstrap = {
      Popover: {
        getOrCreateInstance: () => ({
          hide: () => {
            popoverHidden = true;
          },
        }),
      },
      Tooltip: {
        getOrCreateInstance: () => ({
          hide: () => {
            tooltipHidden = true;
          },
        }),
      },
    };

    hideAllTooltips(mockDoc, mockBootstrap);
    assert.equal(popoverHidden, true);
    assert.equal(tooltipHidden, true);
  });

  await t.test(
    'createToggle returns a parameterless callable that executes toggle',
    () => {
      let state = false;
      const toggleFn = createToggle(
        {
          get: () => state,
          set: (v) => {
            state = v;
          },
        },
        { doc: { querySelectorAll: () => [] } },
      );

      toggleFn();
      assert.equal(state, true);
      toggleFn();
      assert.equal(state, false);
    },
  );
});
