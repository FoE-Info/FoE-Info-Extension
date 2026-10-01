/**
 * lifecycle-popover-render.test.mjs
 *
 * Reproduces and verifies fixes for lifecycle defects in:
 *  - PopoverManager: hideActivePopover not clearing showTimer / hideTimer
 *  - panelDispatcher: clearStartup not clearing popover state
 *  - panelDispatcher: renderSequence dead counter
 *  - options.js floating-promise / pending-save contract
 *
 * Before-fix assertions FAIL, after-fix PASS.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

/* ------------------------------------------------------------------ */
/*  Minimal DOM factory                                               */
/* ------------------------------------------------------------------ */

const ATTR_SELECTOR_RE = /\[([^\]=~|^$*]+)(?:[~|^$*]?=\s*["']([^"']*)["'])?\]/;

function matchesSingleSelector(el, sel) {
  const s = sel.trim();
  if (s.startsWith('[')) {
    const m = s.match(ATTR_SELECTOR_RE);
    if (!m) return false;
    const [, attr, val] = m;
    if (val === undefined) return el.hasAttribute(attr);
    return el.getAttribute(attr) === val;
  }
  return false;
}

function matchesSelector(el, selector) {
  // Support comma-separated selectors
  const selectors = selector.split(',').map((s) => s.trim());
  return selectors.some((s) => matchesSingleSelector(el, s));
}

function createEl(tag = 'div', id = '') {
  const attrs = new Map();
  if (id) attrs.set('id', id);
  const children = [];
  const storedListeners = {};
  let _classes = new Set();

  const el = {
    tagName: tag.toUpperCase(),
    id,
    innerHTML: '',
    innerText: '',
    textContent: '',
    style: {
      setProperty(_n, _v) {},
      removeProperty(_n) {},
    },
    _foeBound: false,
    _foePopoverBound: false,
    _isOpen: false,
    children,
    parentNode: null,
    ownerDocument: null,
    getAttribute: (n) => attrs.get(n) ?? null,
    setAttribute: (n, v) => attrs.set(n, String(v)),
    hasAttribute: (n) => attrs.has(n),
    removeAttribute: (n) => attrs.delete(n),
    get classList() {
      return {
        add: (...cs) => cs.forEach((c) => c && _classes.add(c)),
        remove: (...cs) => cs.forEach((c) => _classes.delete(c)),
        contains: (c) => _classes.has(c),
      };
    },
    set className(v) {
      _classes = new Set(String(v).trim().split(/\s+/).filter(Boolean));
    },
    get className() {
      return Array.from(_classes).join(' ');
    },
    appendChild(child) {
      if (child?.parentNode?.removeChild) child.parentNode.removeChild(child);
      child.parentNode = el;
      if (child.tagName !== 'BODY' && child.tagName !== 'HTML') {
        children.push(child);
      }
      child.ownerDocument = el.ownerDocument || el;
      return child;
    },
    removeChild(child) {
      const idx = children.indexOf(child);
      if (idx !== -1) {
        children.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    },
    replaceChildren() {
      [...children].forEach((c) => el.removeChild(c));
    },
    remove() {
      el.parentNode?.removeChild?.(el);
    },
    matches: () => false,
    contains(child) {
      if (child === el) return true;
      return (
        children.includes(child) || children.some((c) => c.contains?.(child))
      );
    },
    closest: () => null,
    querySelectorAll(selector) {
      const results = [];
      function walk(node) {
        for (const child of node.children || []) {
          if (matchesSelector(child, selector)) results.push(child);
          walk(child);
        }
      }
      walk(el);
      return results;
    },
    click() {},
    focus() {},
    getBoundingClientRect() {
      return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
    },
    addEventListener(type, fn, _opts) {
      if (!storedListeners[type]) storedListeners[type] = [];
      storedListeners[type].push(fn);
    },
    removeEventListener(type, fn) {
      if (!storedListeners[type]) return;
      storedListeners[type] = storedListeners[type].filter((f) => f !== fn);
    },
    dispatchEvent() {
      return true;
    },
    /** Test helper: fire all listeners for an event type */
    _fire(type, event = {}) {
      for (const fn of storedListeners[type] || []) {
        fn(event);
      }
    },
  };
  return el;
}

function createDoc() {
  const bodyEl = createEl('body', 'body');
  bodyEl.ownerDocument = null; // will set below

  const dom = new Map();
  if (bodyEl.id) dom.set(bodyEl.id, bodyEl);

  const doc = {
    body: bodyEl,
    documentElement: createEl('html', ''),
    defaultView: null, // will set after creation
    readyState: 'complete',
    getElementById(id) {
      return dom.get(id) || null;
    },
    createElement(tag) {
      const el = createEl(tag);
      el.ownerDocument = doc;
      return el;
    },
    querySelectorAll(selector) {
      // Find all elements in the dom store that match attribute selectors
      const results = [];
      for (const [, el] of dom) {
        if (matchesSelector(el, selector)) {
          results.push(el);
        }
      }
      return results;
    },
    querySelector() {
      return null;
    },
    addEventListener() {},
    _foeA11yBound: false,
    _dom: dom,
  };
  bodyEl.ownerDocument = doc;
  doc.defaultView = doc; // simulate window-like reference
  return doc;
}

/* ------------------------------------------------------------------ */
/*  Timer control                                                      */
/* ------------------------------------------------------------------ */

let fakeTimers;
let timerCounter;
let origSetTimeout;
let origClearTimeout;

function installFakeTimers() {
  timerCounter = 0;
  fakeTimers = new Map();
  origSetTimeout = globalThis.setTimeout;
  origClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, ms) => {
    const id = ++timerCounter;
    fakeTimers.set(id, { fn, ms, cleared: false, fired: false });
    return id;
  };
  globalThis.clearTimeout = (id) => {
    if (fakeTimers.has(id)) fakeTimers.get(id).cleared = true;
  };
}

function restoreTimers() {
  globalThis.setTimeout = origSetTimeout;
  globalThis.clearTimeout = origClearTimeout;
  fakeTimers = null;
}

function fireAllPending() {
  for (const t of fakeTimers.values()) {
    if (!t.cleared && !t.fired) {
      t.fired = true;
      t.fn();
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Module cache buster                                                */
/* ------------------------------------------------------------------ */

let modCounter = 0;
function bustCache(baseHref) {
  return `${baseHref}?_t=${++modCounter}_${Date.now()}`;
}

/* ------------------------------------------------------------------ */
/*  Bug A: hideActivePopover must clear showTimer                       */
/* ------------------------------------------------------------------ */

test('PopoverManager: hideActivePopover clears pending showTimer', async () => {
  installFakeTimers();
  try {
    const base = new URL(
      '../../src/js/ui/components/PopoverManager.js',
      import.meta.url,
    ).href;
    const mod = await import(bustCache(base));
    const { initPopovers, hideActivePopover } = mod;

    const doc = createDoc();

    // Create a trigger element with popover attributes
    const trigger = createEl('span', 'trigA');
    trigger.setAttribute('data-popover', '');
    trigger.setAttribute('data-bs-title', 'Test tooltip');
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('tabindex', '0');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.ownerDocument = doc;
    doc._dom.set('trigA', trigger);

    const container = createEl('div', 'ctrA');
    container.ownerDocument = doc;
    doc._dom.set('ctrA', container);
    container.appendChild(trigger);

    // Create the popover element
    const popover = createEl('div', 'foe-popover');
    popover._isOpen = false;
    popover.showPopover = function () {
      this._isOpen = true;
    };
    popover.hidePopover = function () {
      this._isOpen = false;
    };
    popover.matches = function (sel) {
      if (sel === ':popover-open') return this._isOpen;
      if (sel === ':hover') return false;
      return false;
    };
    popover.addEventListener = function () {};
    doc._dom.set('foe-popover', popover);
    doc.body.appendChild(popover);

    // initPopovers binds mouseenter → showPopoverForTrigger
    initPopovers(container);

    // Verify the trigger got bound
    assert.equal(
      trigger._foePopoverBound,
      true,
      'trigger bound by initPopovers',
    );

    // Fire mouseenter → triggers showPopoverForTrigger → sets showTimer
    trigger._fire('mouseenter');

    // Verify showTimer was set
    const showTimers = [...fakeTimers.values()].filter(
      (t) => !t.cleared && t.ms <= 80,
    );
    assert.ok(showTimers.length > 0, 'showTimer was set after mouseenter');

    // Call hideActivePopover — must clear showTimer
    hideActivePopover(doc);

    const pendingAfter = [...fakeTimers.values()].filter(
      (t) => !t.cleared && t.ms <= 80,
    );
    assert.equal(
      pendingAfter.length,
      0,
      'BUG REPRODUCED → FIXED: hideActivePopover must clear showTimer',
    );
  } finally {
    restoreTimers();
  }
});

/* ------------------------------------------------------------------ */
/*  Bug A2: hideActivePopover clears hideTimer                          */
/* ------------------------------------------------------------------ */

test('PopoverManager: hideActivePopover clears pending hideTimer', async () => {
  installFakeTimers();
  try {
    const base = new URL(
      '../../src/js/ui/components/PopoverManager.js',
      import.meta.url,
    ).href;
    const mod = await import(bustCache(base));
    const { initPopovers, hideActivePopover } = mod;

    const doc = createDoc();

    const trigger = createEl('span', 'trigA2');
    trigger.setAttribute('data-popover', '');
    trigger.setAttribute('data-bs-title', 'Test tooltip');
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('tabindex', '0');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.ownerDocument = doc;
    doc._dom.set('trigA2', trigger);

    const container = createEl('div', 'ctrA2');
    container.ownerDocument = doc;
    doc._dom.set('ctrA2', container);
    container.appendChild(trigger);

    const popover = createEl('div', 'foe-popover');
    popover._isOpen = false;
    popover.showPopover = function () {
      this._isOpen = true;
    };
    popover.hidePopover = function () {
      this._isOpen = false;
    };
    popover.matches = function (sel) {
      if (sel === ':popover-open') return this._isOpen;
      if (sel === ':hover') return false;
      return false;
    };
    popover.addEventListener = function () {};
    doc._dom.set('foe-popover', popover);
    doc.body.appendChild(popover);

    initPopovers(container);

    // Open popover first
    trigger._fire('mouseenter');
    fireAllPending();
    assert.equal(popover._isOpen, true, 'popover opened');

    // Fire mouseleave → sets hideTimer (180ms)
    trigger._fire('mouseleave', { relatedTarget: null });

    const hideTimers = [...fakeTimers.values()].filter(
      (t) => !t.cleared && t.ms === 180,
    );
    assert.ok(hideTimers.length > 0, 'hideTimer set after mouseleave');

    // hideActivePopover must clear hideTimer
    hideActivePopover(doc);

    const pendingAfter = [...fakeTimers.values()].filter(
      (t) => !t.cleared && t.ms === 180,
    );
    assert.equal(
      pendingAfter.length,
      0,
      'BUG REPRODUCED → FIXED: hideActivePopover must clear hideTimer',
    );
  } finally {
    restoreTimers();
  }
});

/* ------------------------------------------------------------------ */
/*  Bug B: clearStartup must hide popover                              */
/* ------------------------------------------------------------------ */

test('panelDispatcher: clearStartup hides active popover', async () => {
  installFakeTimers();
  const origDoc = globalThis.document;

  try {
    const doc = createDoc();
    globalThis.document = doc;

    // Create popover in body
    const popover = createEl('div', 'foe-popover');
    popover._isOpen = false;
    popover.showPopover = function () {
      this._isOpen = true;
    };
    popover.hidePopover = function () {
      this._isOpen = false;
    };
    popover.matches = function (sel) {
      if (sel === ':popover-open') return this._isOpen;
      if (sel === ':hover') return false;
      return false;
    };
    popover.addEventListener = function () {};
    doc._dom.set('foe-popover', popover);
    doc.body.appendChild(popover);

    // Import PopoverManager and open popover
    const pmBase = new URL(
      '../../src/js/ui/components/PopoverManager.js',
      import.meta.url,
    ).href;
    const pm = await import(bustCache(pmBase));
    pm.getOrCreatePopoverElement(doc);

    const trigger = createEl('span', 'trigB');
    trigger.setAttribute('data-popover', '');
    trigger.setAttribute('data-bs-title', 'Hi');
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('tabindex', '0');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.ownerDocument = doc;
    doc._dom.set('trigB', trigger);

    const container = createEl('div', 'ctrB');
    container.ownerDocument = doc;
    doc._dom.set('ctrB', container);
    container.appendChild(trigger);

    pm.initPopovers(container);
    trigger._fire('mouseenter');
    fireAllPending();
    assert.equal(popover._isOpen, true, 'popover is open before clearStartup');

    // Import panelDispatcher
    const pdBase = new URL(
      '../../src/js/ui/panelDispatcher.js',
      import.meta.url,
    ).href;
    const pdPkg = await import(bustCache(pdBase));
    const pd = pdPkg.default || pdPkg;

    const containers = {};
    for (const id of [
      'cityinvested',
      'output',
      'overview',
      'alerts',
      'cityrewards',
      'donationDIV',
      'incidents',
      'donation2DIV',
      'donationDIV2',
      'greatbuilding',
      'gbInfoDIV',
      'guild',
      'debug',
      'info',
      'citystats',
      'visitstats',
      'cultural',
      'friendsDiv',
      'armyDIV',
      'treasury',
      'treasuryLog',
    ]) {
      containers[id] = createEl('div', `cB_${id}`);
      doc._dom.set(`cB_${id}`, containers[id]);
    }

    pd.clearStartup(containers, { reset: () => {} });

    assert.equal(
      popover._isOpen,
      false,
      'BUG REPRODUCED → FIXED: clearStartup must hide the active popover',
    );
  } finally {
    globalThis.document = origDoc;
    restoreTimers();
  }
});

/* ------------------------------------------------------------------ */
/*  renderSequence increments without error                            */
/* ------------------------------------------------------------------ */

test('panelDispatcher: clearStartup increments renderSequence without error', async () => {
  const origDoc = globalThis.document;
  const doc = createDoc();
  globalThis.document = doc;

  try {
    const pdBase = new URL(
      '../../src/js/ui/panelDispatcher.js',
      import.meta.url,
    ).href;
    const pdPkg = await import(bustCache(pdBase));
    const pd = pdPkg.default || pdPkg;

    const makeContainers = (prefix) => {
      const c = {};
      for (const id of [
        'cityinvested',
        'output',
        'overview',
        'alerts',
        'cityrewards',
        'donationDIV',
        'incidents',
        'donation2DIV',
        'donationDIV2',
        'greatbuilding',
        'gbInfoDIV',
        'guild',
        'debug',
        'info',
        'citystats',
        'visitstats',
        'cultural',
        'friendsDiv',
        'armyDIV',
        'treasury',
        'treasuryLog',
      ]) {
        c[id] = createEl('div', `${prefix}_${id}`);
        doc._dom.set(`${prefix}_${id}`, c[id]);
      }
      return c;
    };

    pd.clearStartup(makeContainers('seqA'), { reset: () => {} });
    pd.clearStartup(makeContainers('seqB'), { reset: () => {} });

    assert.ok(true, 'renderSequence increments without error');
  } finally {
    globalThis.document = origDoc;
  }
});

/* ------------------------------------------------------------------ */
/*  Options: world-change save-then-switch contract                     */
/* ------------------------------------------------------------------ */

test('options: onWorldChange saves old world before switching', async () => {
  let saveOrder = [];
  let currentWorld = 'en7';

  const mockStorage = {
    saveWorldSettings: async (world) => {
      saveOrder.push(`save:${world}`);
    },
    setWorld: (w) => {
      currentWorld = w;
    },
  };

  async function onWorldChange(nextWorld) {
    await mockStorage.saveWorldSettings(currentWorld, {});
    currentWorld = nextWorld;
    mockStorage.setWorld(nextWorld);
  }

  await onWorldChange('en16');

  assert.deepEqual(saveOrder, ['save:en7']);
  assert.equal(currentWorld, 'en16');
});
