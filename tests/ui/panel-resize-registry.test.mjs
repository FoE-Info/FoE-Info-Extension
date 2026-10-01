import assert from 'node:assert/strict';
import test from 'node:test';
import { bindPanelResizeHandle } from '../../src/js/ui/panelResizeHandle.js';
import { installPanelResizeHandles } from '../../src/js/ui/panelResizeRegistry.js';

function eventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
    },
    removeEventListener(event, callback) {
      listeners.get(event)?.delete(callback);
    },
    fire(event, values = {}) {
      for (const callback of listeners.get(event) || [])
        callback({ preventDefault() {}, ...values });
    },
  };
}

function createDocument() {
  const doc = {
    defaultView: eventTarget(),
    createElement(tag) {
      const classes = new Set();
      return {
        ...eventTarget(),
        ownerDocument: doc,
        tagName: tag.toUpperCase(),
        children: [],
        style: {},
        classList: {
          add: (name) => classes.add(name),
          remove: (name) => classes.delete(name),
          contains: (name) => classes.has(name),
        },
        get firstChild() {
          return this.children[0];
        },
        appendChild(child) {
          if (child.parentElement) {
            const siblings = child.parentElement.children;
            siblings.splice(siblings.indexOf(child), 1);
          }
          child.parentElement = this;
          this.children.push(child);
        },
        setAttribute() {},
        after(handle) {
          this.handle = handle;
        },
        remove() {
          this.removed = true;
        },
        getBoundingClientRect() {
          return { height: Number.parseFloat(this.style.height) || 240 };
        },
      };
    },
  };
  return doc;
}

test('shared grips preserve natural size, avoid duplicates, restore replacements and release listeners', async () => {
  const doc = createDocument();
  const body = doc.createElement('div');
  body.id = 'gbgLeaderboardCollapse';
  body.classList.add('show');
  const table = doc.createElement('table');
  body.appendChild(table);
  const army = doc.createElement('div');
  army.id = 'armyText';
  army.classList.add('show');
  const armyBinding = bindPanelResizeHandle(army, {
    minSize: 50,
    getSize: () => 300,
    setSize() {},
  });
  const armyGrip = army.handle;
  let active = [body, army];
  const root = {
    querySelectorAll: () => active,
    contains: (node) => active.includes(node),
  };
  let observer;
  class Observer {
    constructor(callback) {
      this.callback = callback;
      observer = this;
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  }
  const saved = [];
  const cleanup = installPanelResizeHandles(root, {
    MutationObserverClass: Observer,
    onResize: (id, height) => saved.push([id, height]),
  });
  assert.equal(body.style.height, undefined, 'natural height stays automatic');
  assert.equal(army.handle, armyGrip, 'existing explicit grip is retained');
  assert.equal(body.firstChild.classList.contains('foe-panel-scroll'), true);
  assert.equal(body.firstChild.firstChild, table, 'table remains intact');
  const grip = body.handle;
  grip.fire('keydown', { key: 'ArrowDown' });
  assert.equal(body.style.height, '250px');
  assert.equal(body.style.width, undefined, 'resizing does not change width');
  assert.deepEqual(saved, [[body.id, 250]]);
  observer.callback();
  await Promise.resolve();
  assert.equal(body.handle, grip, 'repeated mutation does not duplicate grip');

  const replacement = doc.createElement('div');
  replacement.id = body.id;
  replacement.classList.add('show');
  active = [replacement, army];
  observer.callback();
  await Promise.resolve();
  assert.equal(grip.removed, true);
  assert.equal(replacement.style.height, '250px');
  assert.equal(doc.defaultView.listeners.get('blur').size, 2);
  cleanup();
  assert.equal(observer.disconnected, true);
  assert.equal(replacement.handle.removed, true);
  assert.equal(doc.defaultView.listeners.get('blur').size, 1);
  armyBinding.disconnect();
  assert.equal(doc.defaultView.listeners.get('blur').size, 0);
});
