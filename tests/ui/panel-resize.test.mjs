import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { bindResizableCollapse } from '../../src/js/ui/panelResize.js';

describe('PanelResize bindResizableCollapse Suite', () => {
  function createMockElement(initialClasses = ['show']) {
    const listeners = {};
    return {
      style: { height: '', maxHeight: '' },
      classList: {
        _classes: new Set(initialClasses),
        contains(c) {
          return this._classes.has(c);
        },
        add(c) {
          this._classes.add(c);
        },
        remove(c) {
          this._classes.delete(c);
        },
      },
      addEventListener(event, fn) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
      },
      trigger(event) {
        (listeners[event] || []).forEach((fn) => fn());
      },
    };
  }

  test('initializes with default height on visible panel', () => {
    const el = createMockElement(['show']);
    let savedHeight = null;
    const controller = bindResizableCollapse({
      element: el,
      initialSize: 185,
      minSize: 50,
      onResize: (h) => {
        savedHeight = h;
      },
    });

    assert.equal(el.style.height, '185px');
    assert.equal(controller.getCurrentSize(), 185);
    assert.equal(savedHeight, null, 'Initial setup should not invoke onResize');
  });

  test('restores default height on expand after collapse', () => {
    const el = createMockElement(['show']);
    let savedHeight = null;
    const controller = bindResizableCollapse({
      element: el,
      initialSize: 185,
      minSize: 50,
      onResize: (h) => {
        savedHeight = h;
      },
    });

    // Simulate collapse
    el.trigger('hide.bs.collapse');
    el.classList.remove('show');
    el.classList.add('collapsing');
    el.style.height = '';
    el.trigger('hidden.bs.collapse');
    el.classList.remove('collapsing');

    // Simulate expand
    el.trigger('show.bs.collapse');
    assert.equal(
      el.style.maxHeight,
      '185px',
      'show.bs.collapse clamps maxHeight during transition',
    );

    // End of expand: Bootstrap would normally clear style.height to ''
    el.style.height = '';
    el.classList.add('show');
    el.trigger('shown.bs.collapse');

    assert.equal(
      el.style.height,
      '185px',
      'shown.bs.collapse must restore 185px height instead of leaving it empty',
    );
    assert.equal(
      el.style.maxHeight,
      '',
      'shown.bs.collapse must clear maxHeight so manual resizing is unconstrained',
    );
    assert.equal(
      savedHeight,
      null,
      'Collapse and expand must not trigger onResize',
    );
    assert.equal(controller.getCurrentSize(), 185);
  });

  test('detects user resizing, persists custom size, and restores it upon subsequent collapse/expand', async () => {
    const el = createMockElement(['show']);
    let savedHeight = null;
    let observerCb = null;

    class MockRO {
      constructor(cb) {
        observerCb = cb;
      }
      observe() {}
      disconnect() {}
    }

    const controller = bindResizableCollapse({
      element: el,
      initialSize: 185,
      minSize: 50,
      onResize: (h) => {
        savedHeight = h;
      },
      ResizeObserverClass: MockRO,
    });

    assert.ok(observerCb, 'ResizeObserver callback must be registered');

    // User drags handle to 320px
    observerCb([{ contentRect: { height: 320 } }]);
    assert.equal(savedHeight, 320, 'onResize must receive user resized height');
    assert.equal(
      controller.getCurrentSize(),
      320,
      'currentSize must update to 320',
    );

    // User collapses panel
    el.trigger('hide.bs.collapse');
    el.classList.remove('show');
    el.classList.add('collapsing');
    el.style.height = '';

    // Intermediate sizes during collapse animation must NOT overwrite custom size
    observerCb([{ contentRect: { height: 80 } }]);
    assert.equal(
      savedHeight,
      320,
      'savedHeight must NOT change during collapse transition',
    );

    el.trigger('hidden.bs.collapse');
    el.classList.remove('collapsing');

    // User expands panel
    el.trigger('show.bs.collapse');
    assert.equal(
      el.style.maxHeight,
      '320px',
      'show.bs.collapse must clamp maxHeight to custom 320px',
    );

    el.style.height = '';
    el.classList.add('show');
    el.trigger('shown.bs.collapse');

    assert.equal(
      el.style.height,
      '320px',
      'shown.bs.collapse must restore custom 320px height',
    );

    // Wait for transition timer to clear
    await new Promise((resolve) => setTimeout(resolve, 80));

    // Another user drag to 400px
    observerCb([{ contentRect: { height: 400 } }]);
    assert.equal(savedHeight, 400, 'Subsequent resize to 400px must persist');
    assert.equal(controller.getCurrentSize(), 400);

    controller.disconnect();
  });
});
