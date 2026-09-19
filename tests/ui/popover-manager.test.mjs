import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  initPopovers,
  hideActivePopover,
  getOrCreatePopoverElement,
} = require('../../src/js/ui/components/PopoverManager.js');

function createMockElement(tagName = 'div', attributes = {}) {
  const listeners = {};
  const attrs = { ...attributes };
  const styles = {};

  const styleObj = {
    setProperty: (prop, val) => {
      styles[prop] = val;
    },
    removeProperty: (prop) => {
      delete styles[prop];
    },
    getPropertyValue: (prop) => styles[prop],
  };

  return {
    tagName: tagName.toUpperCase(),
    style: new Proxy(styleObj, {
      get: (target, prop) => (prop in target ? target[prop] : styles[prop]),
      set: (target, prop, value) => {
        styles[prop] = value;
        return true;
      },
    }),
    getAttribute: (name) => attrs[name] ?? null,
    setAttribute: (name, val) => {
      attrs[name] = String(val);
    },
    hasAttribute: (name) => Object.prototype.hasOwnProperty.call(attrs, name),
    removeAttribute: (name) => {
      delete attrs[name];
    },
    addEventListener: (event, handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    triggerEvent: (event, eventObj = {}) => {
      (listeners[event] || []).forEach((fn) => fn(eventObj));
    },
    get _listeners() {
      return listeners;
    },
    get _attrs() {
      return attrs;
    },
    get _styles() {
      return styles;
    },
    matches: () => false,
    contains: () => false,
    ownerDocument: null,
    className: '',
    innerHTML: '',
    textContent: '',
  };
}

function createMockDocument() {
  const elementsById = {};
  const body = createMockElement('body');

  const doc = {
    body,
    getElementById: (id) => elementsById[id] || null,
    createElement: (tag) => {
      const el = createMockElement(tag);
      el.ownerDocument = doc;
      el.showPopover = () => {
        el._isOpen = true;
      };
      el.hidePopover = () => {
        el._isOpen = false;
      };
      return el;
    },
  };

  body.appendChild = (child) => {
    if (child.id) {
      elementsById[child.id] = child;
    }
    child.ownerDocument = doc;
    return child;
  };

  return doc;
}

test('PopoverManager Suite', async (t) => {
  await t.test(
    'getOrCreatePopoverElement creates #foe-popover in top layer',
    () => {
      const doc = createMockDocument();
      const popoverEl = getOrCreatePopoverElement(doc);

      assert.ok(popoverEl);
      assert.equal(popoverEl.id, 'foe-popover');
      assert.equal(popoverEl.getAttribute('popover'), 'auto');
      assert.equal(doc.getElementById('foe-popover'), popoverEl);

      // Subsequent calls return the existing element
      const secondCall = getOrCreatePopoverElement(doc);
      assert.equal(secondCall, popoverEl);
    },
  );

  await t.test('initPopovers binds accessibility attributes and events', () => {
    const doc = createMockDocument();
    const trigger = createMockElement('span', {
      'data-bs-toggle': 'popover',
      'data-bs-title': 'Daily Goods',
      'data-bs-content': '<b>150</b> Total Goods',
    });
    trigger.ownerDocument = doc;

    const container = {
      querySelectorAll: () => [trigger],
    };

    initPopovers(container);

    assert.equal(trigger.getAttribute('role'), 'button');
    assert.equal(trigger.getAttribute('tabindex'), '0');
    assert.equal(trigger.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.ok(trigger._listeners['mouseenter']);
    assert.ok(trigger._listeners['mouseleave']);
    assert.ok(trigger._listeners['focus']);
    assert.ok(trigger._listeners['blur']);
    assert.ok(trigger._listeners['click']);
    assert.ok(trigger._listeners['keydown']);
  });

  await t.test(
    'shows popover with anchor-name and rich HTML on trigger hover',
    async () => {
      const doc = createMockDocument();
      const trigger = createMockElement('span', {
        'data-popover': '',
        'data-title': 'Boosts',
        'data-content': '<div>Attack: +150%</div>',
      });
      trigger.ownerDocument = doc;

      const container = {
        querySelectorAll: () => [trigger],
      };

      initPopovers(container);

      // Trigger hover
      trigger.triggerEvent('mouseenter');

      // Wait for the 80ms show timer
      await new Promise((r) => setTimeout(r, 120));

      const popoverEl = doc.getElementById('foe-popover');
      assert.ok(popoverEl);
      assert.equal(popoverEl._isOpen, true);
      assert.equal(trigger._styles['anchor-name'], '--active-popover-trigger');
      assert.equal(trigger.getAttribute('aria-expanded'), 'true');
      assert.match(popoverEl.innerHTML, /popover-header.*Boosts/);
      assert.match(popoverEl.innerHTML, /popover-body.*Attack: \+150%/);

      // Clean up
      hideActivePopover(doc);
      assert.equal(popoverEl._isOpen, false);
      assert.equal(trigger._styles['anchor-name'], undefined);
      assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    },
  );

  await t.test('shows compact tooltip mode when content is empty', async () => {
    const doc = createMockDocument();
    const trigger = createMockElement('button', {
      'data-tooltip': '',
      title: 'Simple hint tooltip',
    });
    trigger.ownerDocument = doc;

    const container = {
      querySelectorAll: () => [trigger],
    };

    initPopovers(container);

    trigger.triggerEvent('mouseenter');
    await new Promise((r) => setTimeout(r, 120));

    const popoverEl = doc.getElementById('foe-popover');
    assert.ok(popoverEl);
    assert.equal(popoverEl._isOpen, true);
    assert.equal(popoverEl.className, 'popover-compact');
    assert.equal(popoverEl.textContent, 'Simple hint tooltip');
    // Title attribute removed to prevent browser native tooltip clash
    assert.equal(trigger.getAttribute('title'), null);
    hideActivePopover(doc);
  });

  await t.test(
    'dynamically clamps maxHeight and sets positionArea based on viewport space',
    async () => {
      const doc = createMockDocument();
      doc.defaultView = {
        innerHeight: 500,
        innerWidth: 800,
      };

      const trigger = createMockElement('span', {
        'data-popover': '',
        'data-title': 'Daily FP',
        'data-content': '<div>Lots of content</div>',
      });
      trigger.ownerDocument = doc;
      trigger.getBoundingClientRect = () => ({
        top: 200,
        bottom: 220,
        left: 600,
        right: 700,
        width: 100,
        height: 20,
      });

      const container = {
        querySelectorAll: () => [trigger],
      };

      initPopovers(container);
      trigger.triggerEvent('mouseenter');
      await new Promise((r) => setTimeout(r, 120));

      const popoverEl = doc.getElementById('foe-popover');
      assert.ok(popoverEl);
      assert.equal(popoverEl._isOpen, true);

      // spaceBelow: 500 - 220 - 16 = 264. spaceAbove: 200 - 16 = 184.
      // preferTop = false (spaceBelow >= 200)
      // clampedHeight = Math.max(120, Math.min(380, 264 - 8)) = 256px
      assert.equal(popoverEl.style.maxHeight, '256px');
      assert.equal(popoverEl.style.positionArea, 'bottom span-all');

      hideActivePopover(doc);
      assert.equal(popoverEl.style.maxHeight, '');
      assert.equal(popoverEl.style.positionArea, '');
    },
  );

  await t.test(
    'updateActivePopoverContent dynamically updates open popover body',
    async () => {
      const {
        updateActivePopoverContent,
      } = require('../../src/js/ui/components/PopoverManager.js');
      const doc = createMockDocument();
      const trigger = createMockElement('span', {
        'data-popover': '',
        'data-title': 'Daily FP',
        'data-content': '<div>Initial FP: 100</div>',
      });
      trigger.ownerDocument = doc;

      const container = {
        querySelectorAll: () => [trigger],
      };

      initPopovers(container);
      trigger.triggerEvent('mouseenter');
      await new Promise((r) => setTimeout(r, 120));

      const popoverEl = doc.getElementById('foe-popover');
      assert.ok(popoverEl);
      assert.match(popoverEl.innerHTML, /Initial FP: 100/);

      // Create a mock querySelector for .popover-body
      const mockBody = {
        set innerHTML(val) {
          this._html = val;
        },
        get innerHTML() {
          return this._html;
        },
      };
      popoverEl.querySelector = (sel) =>
        sel === '.popover-body' ? mockBody : null;

      updateActivePopoverContent(trigger, '<div>Updated FP: 200</div>');
      assert.equal(mockBody.innerHTML, '<div>Updated FP: 200</div>');

      hideActivePopover(doc);
    },
  );

  await t.test(
    'renders HTML in compact tooltip mode and strips native title on init',
    async () => {
      const doc = createMockDocument();
      const trigger = createMockElement('span', {
        'data-bs-toggle': 'tooltip',
        'data-bs-html': 'true',
        'data-bs-title': '606 Metamorphic Alloys<br>1038 Xenocrystals',
        title: '606 Metamorphic Alloys\n1038 Xenocrystals',
      });
      trigger.ownerDocument = doc;

      const container = {
        querySelectorAll: () => [trigger],
      };

      initPopovers(container);

      // Title should be immediately stripped to avoid native browser tooltip flashing
      assert.equal(trigger.getAttribute('title'), null);
      assert.equal(
        trigger.getAttribute('data-foe-title'),
        '606 Metamorphic Alloys\n1038 Xenocrystals',
      );

      trigger.triggerEvent('mouseenter');
      await new Promise((r) => setTimeout(r, 120));

      const popoverEl = doc.getElementById('foe-popover');
      assert.ok(popoverEl);
      assert.equal(popoverEl._isOpen, true);
      assert.equal(popoverEl.className, 'popover-compact');
      assert.equal(
        popoverEl.innerHTML,
        '606 Metamorphic Alloys<br>1038 Xenocrystals',
      );

      hideActivePopover(doc);
    },
  );

  await t.test(
    'rapid movement between triggers cancels prior show timer and anchors to new trigger',
    async () => {
      const doc = createMockDocument();
      const triggerA = createMockElement('span', {
        'data-popover': '',
        'data-title': 'Trigger A',
        'data-content': 'Content A',
      });
      triggerA.ownerDocument = doc;

      const triggerB = createMockElement('span', {
        'data-popover': '',
        'data-title': 'Trigger B',
        'data-content': 'Content B',
      });
      triggerB.ownerDocument = doc;

      const container = {
        querySelectorAll: () => [triggerA, triggerB],
      };

      initPopovers(container);

      // Hover Trigger A
      triggerA.triggerEvent('mouseenter');
      // Within 40ms (before showTimer 80ms fires), hover Trigger B
      await new Promise((r) => setTimeout(r, 40));
      triggerB.triggerEvent('mouseenter');

      // Wait for Trigger B's timer to fire
      await new Promise((r) => setTimeout(r, 120));

      const popoverEl = doc.getElementById('foe-popover');
      assert.ok(popoverEl);
      assert.equal(popoverEl._isOpen, true);
      // Trigger A should NOT be the active anchor; Trigger B must be active
      assert.equal(triggerA._styles['anchor-name'], undefined);
      assert.equal(triggerB._styles['anchor-name'], '--active-popover-trigger');
      assert.match(popoverEl.innerHTML, /Trigger B/);

      hideActivePopover(doc);
    },
  );

  await t.test(
    'toggle event cleans up anchor styles when popover finishes closing',
    async () => {
      const doc = createMockDocument();
      const trigger = createMockElement('span', {
        'data-popover': '',
        'data-title': 'Trigger',
        'data-content': 'Content',
      });
      trigger.ownerDocument = doc;

      const container = {
        querySelectorAll: () => [trigger],
      };

      initPopovers(container);
      trigger.triggerEvent('mouseenter');
      await new Promise((r) => setTimeout(r, 120));

      const popoverEl = doc.getElementById('foe-popover');
      assert.equal(trigger._styles['anchor-name'], '--active-popover-trigger');

      // In real browser, toggle event fires with newState = closed when transition ends
      popoverEl.triggerEvent('toggle', { newState: 'closed' });
      assert.equal(trigger._styles['anchor-name'], undefined);
      assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    },
  );
});
